import React from 'react'
import { ChakraProvider, Box } from '@chakra-ui/react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './components/Login'
import ChatInterface from './components/ChatInterface'

function App() {
  return (
    <ChakraProvider>
      <Box minH="100vh" bg="gray.50">
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/chat" element={<ChatInterface />} />
          </Routes>
        </Router>
      </Box>
    </ChakraProvider>
  )
}

export default App 