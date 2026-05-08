import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['tokyo7.local', 'localhost'],
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
