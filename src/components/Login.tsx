import React, { useState } from 'react'
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  Container,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast,
  Alert,
  AlertIcon,
  Select,
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { TURKISH_CITIES } from '../types'

const Login: React.FC = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [city, setCity] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const validatePassword = (pass: string) => {
    const hasUpperCase = /[A-Z]/.test(pass)
    const hasLowerCase = /[a-z]/.test(pass)
    const hasNumbers = /\d/.test(pass)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pass)
    const isLongEnough = pass.length >= 8

    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !city) {
      toast({
        title: 'Error',
        description: 'Please enter a username and select your city',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    const storedUser = localStorage.getItem(username)
    if (!storedUser) {
      toast({
        title: 'Kullanıcı bulunamadı',
        description: 'Lütfen önce kayıt olun.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    const userData = JSON.parse(storedUser)
    if (userData.password !== password) {
      toast({
        title: 'Hatalı şifre',
        description: 'Lütfen şifrenizi kontrol edin.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    localStorage.setItem('currentUser', username.trim())
    localStorage.setItem('userCity', city)
    navigate('/chat')
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.length > 50) {
      toast({
        title: 'Kullanıcı adı çok uzun',
        description: 'Kullanıcı adı 50 karakterden uzun olamaz.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (!validatePassword(password)) {
      toast({
        title: 'Geçersiz şifre',
        description: 'Şifre en az 8 karakter uzunluğunda olmalı ve büyük harf, küçük harf, rakam ve özel karakter içermelidir.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Şifreler eşleşmiyor',
        description: 'Lütfen şifrelerinizin aynı olduğundan emin olun.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (localStorage.getItem(username)) {
      toast({
        title: 'Kullanıcı adı zaten kullanımda',
        description: 'Lütfen başka bir kullanıcı adı seçin.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    localStorage.setItem(username, JSON.stringify({ password }))
    toast({
      title: 'Kayıt başarılı',
      description: 'Şimdi giriş yapabilirsiniz.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    })
    setIsRegistering(false)
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <Container maxW="container.sm" centerContent>
      <Box p={8} mt={20} bg="white" borderRadius="lg" boxShadow="lg" width="100%">
        <VStack spacing={6}>
          <Heading size="lg">2025 Canlı Destek ve Haberleşme</Heading>
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            Bu sayfa herhangi bir siyasi parti veya belirli bir inancı desteklememektedir. 
            Türk vatandaşlarının ifade özgürlüğü ve iletişim haklarını kullanabilmeleri için vardır.
          </Alert>
          <Tabs isFitted variant="enclosed" width="100%">
            <TabList mb="1em">
              <Tab>Giriş Yap</Tab>
              <Tab>Kayıt Ol</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <form onSubmit={handleLogin} style={{ width: '100%' }}>
                  <VStack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Kullanıcı adı:</FormLabel>
                      <Input
                        placeholder="Kullanıcı adı"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        maxLength={50}
                      />
                      <FormErrorMessage>
                        Kullanıcı adı 50 karakterden uzun olamaz
                      </FormErrorMessage>
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Şifre:</FormLabel>
                      <Input
                        type="password"
                        placeholder="Şifre"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Şehir:</FormLabel>
                      <Select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Şehir seçin"
                      >
                        {TURKISH_CITIES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      type="submit"
                      colorScheme="blue"
                      width="100%"
                      isDisabled={!username.trim() || !password.trim() || !city}
                    >
                      Giriş Yap
                    </Button>
                  </VStack>
                </form>
              </TabPanel>
              <TabPanel>
                <form onSubmit={handleRegister} style={{ width: '100%' }}>
                  <VStack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Kullanıcı adı:</FormLabel>
                      <Input
                        placeholder="Kullanıcı adı"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        maxLength={50}
                      />
                      <FormErrorMessage>
                        Kullanıcı adı 50 karakterden uzun olamaz
                      </FormErrorMessage>
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Şifre:</FormLabel>
                      <Input
                        type="password"
                        placeholder="Şifre"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        Şifre en az 8 karakter uzunluğunda olmalı ve büyük harf, küçük harf, rakam ve özel karakter içermelidir.
                      </Text>
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Şifre Tekrar:</FormLabel>
                      <Input
                        type="password"
                        placeholder="Şifre tekrar"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Şehir:</FormLabel>
                      <Select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Şehir seçin"
                      >
                        {TURKISH_CITIES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      type="submit"
                      colorScheme="green"
                      width="100%"
                      isDisabled={!username.trim() || !password.trim() || !confirmPassword.trim() || !city}
                    >
                      Kayıt Ol
                    </Button>
                  </VStack>
                </form>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Box>
    </Container>
  )
}

export default Login 