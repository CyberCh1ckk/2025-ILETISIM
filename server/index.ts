import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { TURKISH_CITIES } from './types';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Track active users and their current rooms
const activeUsers = new Map<string, { rooms: Set<string>, city: string }>();
const roomUsers = new Map<string, Set<string>>();
const chatMessageHistory = new Map<string, Array<{
  id: string;
  username: string;
  message: string;
  timestamp: number;
  room: string;
  type?: 'text' | 'media' | 'deleted';
  mediaUrl?: string;
  deleted?: boolean;
  userCity: string;
  section: string;
}>>();
const mediaMessageHistory = new Map<string, Array<{
  id: string;
  username: string;
  message: string;
  timestamp: number;
  room: string;
  type?: 'text' | 'media' | 'deleted';
  mediaUrl?: string;
  deleted?: boolean;
  userCity: string;
  section: string;
}>>();

// Rate limiting constants
const TEXT_MESSAGE_LIMIT = 20;
const IMAGE_MESSAGE_LIMIT = 4;
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds

// Track user message counts for rate limiting
const userMessageCounts = new Map<string, {
  textCount: number;
  mediaCount: number;
  lastReset: number;
}>();

// Initialize message history for each room
TURKISH_CITIES.forEach(city => {
  chatMessageHistory.set(city, []);
  mediaMessageHistory.set(city, []);
  roomUsers.set(city, new Set());
});

// Reset rate limits for a user
function resetRateLimits(username: string) {
  userMessageCounts.set(username, {
    textCount: 0,
    mediaCount: 0,
    lastReset: Date.now()
  });
}

// Check if user has exceeded rate limits
function checkRateLimit(username: string, type: 'text' | 'media'): boolean {
  const now = Date.now();
  const userCounts = userMessageCounts.get(username);

  if (!userCounts) {
    resetRateLimits(username);
    return true;
  }

  // Reset counts if window has passed
  if (now - userCounts.lastReset > RATE_LIMIT_WINDOW) {
    resetRateLimits(username);
    return true;
  }

  const limit = type === 'text' ? TEXT_MESSAGE_LIMIT : IMAGE_MESSAGE_LIMIT;
  const count = type === 'text' ? userCounts.textCount : userCounts.mediaCount;

  return count < limit;
}

// Update rate limit counts
function updateRateLimit(username: string, type: 'text' | 'media') {
  const userCounts = userMessageCounts.get(username);
  if (userCounts) {
    if (type === 'text') {
      userCounts.textCount++;
    } else {
      userCounts.mediaCount++;
    }
  }
}

// Generate a unique message ID
function generateMessageId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', ({ username, room, section, city }) => {
    // Add user to active users if not already present
    if (!activeUsers.has(username)) {
      activeUsers.set(username, { rooms: new Set(), city });
    } else {
      // Update city if it has changed
      const userData = activeUsers.get(username);
      if (userData && userData.city !== city) {
        userData.city = city;
        // Broadcast city update to all users
        io.emit('userCityUpdate', { username, city });
      }
    }
    activeUsers.get(username)?.rooms.add(room);
    
    // Add user to room users
    if (!roomUsers.has(room)) {
      roomUsers.set(room, new Set());
    }
    roomUsers.get(room)?.add(username);
    
    // Send message history for the room and section
    const history = section === 'chat' 
      ? chatMessageHistory.get(room) || []
      : mediaMessageHistory.get(room) || [];
    socket.emit('messageHistory', history);
    
    // Broadcast updated user count
    const userCount = roomUsers.get(room)?.size || 0;
    io.emit('roomUpdate', { room, userCount });
  });

  socket.on('message', (data) => {
    const { username, message, room, type = 'text', mediaUrl, section } = data;
    const userData = activeUsers.get(username);

    if (!userData) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    // Check rate limits
    if (!checkRateLimit(username, type)) {
      socket.emit('error', { 
        message: `Rate limit exceeded. Please wait before sending more ${type} messages.` 
      });
      return;
    }

    // Update rate limit counts
    updateRateLimit(username, type);

    const newMessage = {
      id: generateMessageId(),
      username,
      message,
      timestamp: Date.now(),
      room,
      type,
      mediaUrl,
      deleted: false,
      userCity: userData.city,
      section
    };

    // Add message to appropriate history
    const history = section === 'chat' ? chatMessageHistory : mediaMessageHistory;
    const roomHistory = history.get(room) || [];
    roomHistory.push(newMessage);
    history.set(room, roomHistory);

    // Broadcast message to all users in the room
    io.emit('message', newMessage);
  });

  socket.on('deleteMessage', ({ messageId, room, username, section }) => {
    const history = section === 'chat' ? chatMessageHistory : mediaMessageHistory;
    const roomHistory = history.get(room) || [];
    const messageIndex = roomHistory.findIndex(msg => msg.id === messageId);

    if (messageIndex !== -1 && roomHistory[messageIndex].username === username) {
      // Replace the message with a deleted message
      const deletedMessage = {
        ...roomHistory[messageIndex],
        message: 'Bu mesaj silindi',
        type: 'deleted' as const,
        deleted: true
      };
      roomHistory[messageIndex] = deletedMessage;
      history.set(room, roomHistory);

      // Broadcast the updated message to all users
      io.emit('messageUpdate', deletedMessage);
    }
  });

  socket.on('disconnect', () => {
    // Find and remove user from all rooms
    activeUsers.forEach((userData, username) => {
      userData.rooms.forEach(room => {
        roomUsers.get(room)?.delete(username);
        const userCount = roomUsers.get(room)?.size || 0;
        io.emit('roomUpdate', { room, userCount });
      });
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 