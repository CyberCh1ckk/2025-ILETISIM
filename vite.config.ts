import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  
  return {
    plugins: [react()],
    base: '/2025-ILETISIM/', // Updated to match your repository name
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