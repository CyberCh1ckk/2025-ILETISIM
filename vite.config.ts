import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  
  return {
    plugins: [react()],
    base: '/',
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/socket.io': {
          target: env.VITE_SOCKET_URL,
          ws: true
        }
      }
    },
    preview: {
      host: true,
      port: 10000,
      strictPort: true,
      allowedHosts: [
        'chat-frontend-4niz.onrender.com',
        '.onrender.com'
      ]
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true
    }
  }
}) 