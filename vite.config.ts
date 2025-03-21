import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  
  return {
    plugins: [react()],
    base: '/', // Changed to root for Render deployment
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
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true
    }
  }
}) 