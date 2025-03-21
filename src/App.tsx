import { ChakraProvider, Box, Container, Heading, Text, VStack, useColorModeValue } from '@chakra-ui/react'
import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './components/Login'
import ChatInterface from './components/ChatInterface'
import { useColorMode } from '@chakra-ui/react'

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