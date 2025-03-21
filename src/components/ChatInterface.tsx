import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  VStack,
  Input,
  InputGroup,
  InputLeftElement,
  Grid,
  Text,
  Container,
  useToast,
  Button,
  HStack,
  IconButton,
  Flex,
  Alert,
  AlertIcon,
  Image,
  Progress,
  InputRightElement,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@chakra-ui/react'
import { SearchIcon, ArrowBackIcon, AttachmentIcon, DeleteIcon, LinkIcon } from '@chakra-ui/icons'
import { useNavigate } from 'react-router-dom'
import { TURKISH_CITIES } from '../types'
import { ChatRoom } from '../types'
import io from 'socket.io-client'

// Create a socket connection based on environment
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
const socket = io(SOCKET_URL)

const TEXT_MESSAGE_LIMIT = 20
const IMAGE_MESSAGE_LIMIT = 4

// Function to format timestamp in Turkish timezone
const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ChatInterface: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [rooms, setRooms] = useState<ChatRoom[]>(
    TURKISH_CITIES.map(city => ({ name: city, userCount: 0 }))
  )
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [selectedSubRoom, setSelectedSubRoom] = useState<'chat' | 'media'>('chat')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Array<{
    username: string
    message: string
    timestamp: number
    room: string
    type?: 'text' | 'media'
    mediaUrl?: string
    id: string
    deleted: boolean
    section: 'chat' | 'media'
    userCity: string
  }>>([])
  const [username, setUsername] = useState<string>('')
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [messageToDelete, setMessageToDelete] = useState<{ id: string; room: string } | null>(null)
  const [linkInput, setLinkInput] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [userCity, setUserCity] = useState<string>('')

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser')
    const savedCity = localStorage.getItem('userCity')
    if (!currentUser || !savedCity) {
      navigate('/')
      return
    }
    setUsername(currentUser)
    setUserCity(savedCity)

    // Connect to socket
    socket.connect()

    // Join the current room if selected
    if (selectedRoom) {
      socket.emit('join', { username: currentUser, room: selectedRoom, section: selectedSubRoom, city: savedCity })
    }

    // Listen for city updates
    socket.on('userCityUpdate', ({ username: updatedUsername, city: newCity }) => {
      if (updatedUsername === currentUser) {
        setUserCity(newCity)
      }
    })

    socket.on('message', (newMessage) => {
      if (newMessage.room === selectedRoom && newMessage.section === selectedSubRoom) {
        setMessages(prev => [...prev, newMessage])
      }
    })

    socket.on('messageHistory', (history) => {
      if (selectedRoom) {
        setMessages(history)
      }
    })

    socket.on('roomUpdate', ({ room, userCount }) => {
      setRooms(prev => prev.map(r => 
        r.name === room ? { ...r, userCount } : r
      ))
    })

    socket.on('error', ({ message }) => {
      toast({
        title: 'Error',
        description: message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    })

    socket.on('messageUpdate', (updatedMessage) => {
      if (updatedMessage.room === selectedRoom && updatedMessage.section === selectedSubRoom) {
        setMessages(prev => prev.map(msg => 
          msg.id === updatedMessage.id ? updatedMessage : msg
        ))
      }
    })

    return () => {
      socket.off('message')
      socket.off('messageHistory')
      socket.off('roomUpdate')
      socket.off('error')
      socket.off('messageUpdate')
      socket.off('userCityUpdate')
    }
  }, [navigate, selectedRoom, selectedSubRoom, toast])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const filteredRooms = rooms
    .filter(room => 
      room.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b.userCount - a.userCount)

  const handleRoomClick = (roomName: string) => {
    setSelectedRoom(roomName)
    setMessages([])
    socket.emit('join', { username, room: roomName, section: selectedSubRoom, city: userCity })
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() && !fileInput?.files?.length) return

    if (selectedSubRoom === 'media') {
      toast({
        title: 'Error',
        description: 'Text messages are not allowed in the media sharing section',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (message.trim()) {
      socket.emit('message', {
        username,
        message: message.trim(),
        room: selectedRoom,
        type: 'text',
        section: selectedSubRoom,
        city: userCity
      })
      setMessage('')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      toast({
        title: 'Error',
        description: 'Only images and videos are allowed',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    // Simulate file upload progress
    setUploadProgress(0)
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 200)

    setTimeout(() => {
      const mediaUrl = URL.createObjectURL(file)
      socket.emit('message', {
        username,
        message: file.name,
        room: selectedRoom,
        type: 'media',
        mediaUrl,
        section: selectedSubRoom,
        city: userCity
      })
      setUploadProgress(100)
    }, 2000)
  }

  const handleSubRoomChange = (section: 'chat' | 'media') => {
    setSelectedSubRoom(section)
    setMessages([])
    if (selectedRoom) {
      socket.emit('join', { username, room: selectedRoom, section, city: userCity })
    }
  }

  const handleLeaveRoom = () => {
    if (selectedRoom) {
      socket.emit('leave', { room: selectedRoom })
    }
    setSelectedRoom(null)
    setMessages([])
  }

  const handleDeleteClick = (messageId: string, room: string) => {
    setMessageToDelete({ id: messageId, room })
    onOpen()
  }

  const handleConfirmDelete = () => {
    if (messageToDelete) {
      socket.emit('deleteMessage', {
        messageId: messageToDelete.id,
        room: messageToDelete.room,
        username,
        section: selectedSubRoom
      })
      onClose()
      setMessageToDelete(null)
    }
  }

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (linkInput.trim()) {
      socket.emit('message', {
        username,
        message: linkInput.trim(),
        room: selectedRoom,
        type: 'text'
      })
      setLinkInput('')
      setShowLinkInput(false)
    }
  }

  if (!selectedRoom) {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack spacing={6} width="100%">
          <Alert status="info" borderRadius="md" bg="blue.50" borderLeftColor="blue.500">
            <AlertIcon />
            Bu sayfa herhangi bir siyasi parti veya belirli bir inancı desteklememektedir. 
            Türk vatandaşlarının ifade özgürlüğü ve iletişim haklarını kullanabilmeleri için vardır.
          </Alert>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="blue.300" />
            </InputLeftElement>
            <Input
              placeholder="Şehir ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              bg="white"
              borderColor="blue.200"
              _hover={{ borderColor: 'blue.300' }}
              _focus={{ borderColor: 'blue.500' }}
            />
          </InputGroup>

          <Grid
            templateColumns="repeat(auto-fill, minmax(200px, 1fr))"
            gap={4}
            width="100%"
          >
            {filteredRooms.map((room) => (
              <Box
                key={room.name}
                p={4}
                bg="white"
                borderRadius="lg"
                boxShadow="sm"
                cursor="pointer"
                onClick={() => handleRoomClick(room.name)}
                _hover={{ 
                  boxShadow: 'md', 
                  transform: 'scale(1.02)',
                  bg: 'blue.50',
                  borderColor: 'blue.200'
                }}
                transition="all 0.2s"
                border="1px"
                borderColor="transparent"
              >
                <Text fontWeight="bold" color="blue.600">{room.name}</Text>
                <Text fontSize="sm" color="blue.400">
                  {room.userCount} kullanıcı
                </Text>
              </Box>
            ))}
          </Grid>
        </VStack>
      </Container>
    )
  }

  return (
    <Box h="100vh" display="flex" flexDirection="column" bg="gray.50">
      <Alert status="info" borderRadius="md" mx={4} mt={4} bg="blue.50" borderLeftColor="blue.500">
        <AlertIcon />
        Bu sayfa herhangi bir siyasi parti veya belirli bir inancı desteklememektedir. 
        Türk vatandaşlarının ifade özgürlüğü ve iletişim haklarını kullanabilmeleri için vardır.
      </Alert>
      <Flex p={4} bg="white" boxShadow="sm" borderBottom="1px" borderColor="blue.100">
        <HStack spacing={4} width="100%">
          <IconButton
            aria-label="Leave room"
            icon={<ArrowBackIcon />}
            onClick={handleLeaveRoom}
            variant="ghost"
            colorScheme="blue"
          />
          <Text fontSize="xl" fontWeight="bold" color="blue.600">{selectedRoom}</Text>
          <HStack ml="auto">
            <Button
              variant={selectedSubRoom === 'chat' ? 'solid' : 'ghost'}
              onClick={() => handleSubRoomChange('chat')}
              colorScheme="blue"
            >
              Sohbet
            </Button>
            <Button
              variant={selectedSubRoom === 'media' ? 'solid' : 'ghost'}
              onClick={() => handleSubRoomChange('media')}
              colorScheme="blue"
            >
              Medya Paylaşımı
            </Button>
          </HStack>
        </HStack>
      </Flex>
      <Box flex={1} overflowY="auto" p={4}>
        <VStack spacing={4} align="stretch">
          {messages.map((msg, idx) => (
            <Box
              key={msg.id || idx}
              bg={msg.username === username ? 'blue.100' : 'white'}
              p={3}
              borderRadius="lg"
              boxShadow="sm"
              maxW="80%"
              alignSelf={msg.username === username ? 'flex-end' : 'flex-start'}
              position="relative"
              border="1px"
              borderColor={msg.username === username ? 'blue.200' : 'gray.200'}
            >
              <Text fontSize="sm" fontWeight="bold" color="blue.600">
                {msg.username} ({msg.userCity})
              </Text>
              {msg.type === 'media' && msg.mediaUrl ? (
                msg.mediaUrl.endsWith('.mp4') ? (
                  <video controls width="100%" src={msg.mediaUrl} />
                ) : (
                  <Image src={msg.mediaUrl} alt={msg.message} maxW="100%" borderRadius="md" />
                )
              ) : (
                <Text color={msg.deleted ? 'gray.500' : 'gray.700'} fontStyle={msg.deleted ? 'italic' : 'normal'}>
                  {msg.message}
                </Text>
              )}
              <Text fontSize="xs" color="blue.400" mt={1}>
                {formatTimestamp(msg.timestamp)}
              </Text>
              {msg.username === username && !msg.deleted && (
                <IconButton
                  aria-label="Delete message"
                  icon={<DeleteIcon />}
                  size="sm"
                  variant="ghost"
                  position="absolute"
                  top={1}
                  right={1}
                  onClick={() => handleDeleteClick(msg.id, msg.room)}
                  colorScheme="red"
                />
              )}
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>
      <Box p={4} bg="white" boxShadow="sm" borderTop="1px" borderColor="blue.100">
        <VStack spacing={2}>
          <Alert status="info" size="sm" bg="blue.50" borderLeftColor="blue.500">
            <AlertIcon />
            {selectedSubRoom === 'chat' 
              ? `Dakikada en fazla ${TEXT_MESSAGE_LIMIT} metin ve ${IMAGE_MESSAGE_LIMIT} medya paylaşabilirsiniz`
              : 'Bu bölümde sadece medya paylaşımı yapılabilir'}
          </Alert>
          <form onSubmit={handleSendMessage} style={{ width: '100%' }}>
            <HStack>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <AttachmentIcon color="blue.300" />
                </InputLeftElement>
                <Input
                  placeholder={selectedSubRoom === 'chat' 
                    ? "Mesajınızı yazın veya medya paylaşın..." 
                    : "Medya paylaşmak için tıklayın..."}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  bg="white"
                  onClick={() => selectedSubRoom === 'media' && fileInput?.click()}
                  readOnly={selectedSubRoom === 'media'}
                  borderColor="blue.200"
                  _hover={{ borderColor: 'blue.300' }}
                  _focus={{ borderColor: 'blue.500' }}
                />
                <InputRightElement>
                  <HStack spacing={2}>
                    <input
                      type="file"
                      ref={el => setFileInput(el)}
                      onChange={handleFileSelect}
                      accept="image/*,video/*"
                      style={{ display: 'none' }}
                    />
                    <IconButton
                      aria-label="Attach file"
                      icon={<AttachmentIcon />}
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInput?.click()}
                      colorScheme="blue"
                    />
                    <IconButton
                      aria-label="Add link"
                      icon={<LinkIcon />}
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowLinkInput(!showLinkInput)}
                      colorScheme="blue"
                    />
                  </HStack>
                </InputRightElement>
              </InputGroup>
              {selectedSubRoom === 'chat' && (
                <Button type="submit" colorScheme="blue" isDisabled={!message.trim() && !fileInput?.files?.length}>
                  Gönder
                </Button>
              )}
            </HStack>
          </form>
          {showLinkInput && (
            <form onSubmit={handleLinkSubmit} style={{ width: '100%' }}>
              <HStack>
                <Input
                  placeholder="Link ekleyin..."
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  bg="white"
                  borderColor="blue.200"
                  _hover={{ borderColor: 'blue.300' }}
                  _focus={{ borderColor: 'blue.500' }}
                />
                <Button type="submit" colorScheme="blue" isDisabled={!linkInput.trim()}>
                  Link Ekle
                </Button>
              </HStack>
            </form>
          )}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <Progress value={uploadProgress} size="sm" width="100%" colorScheme="blue" />
          )}
        </VStack>
      </Box>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="blue.600">Mesajı Sil</ModalHeader>
          <ModalBody>
            Bu mesajı silmek istediğinizden emin misiniz?
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              İptal
            </Button>
            <Button colorScheme="red" onClick={handleConfirmDelete}>
              Sil
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}

export default ChatInterface 