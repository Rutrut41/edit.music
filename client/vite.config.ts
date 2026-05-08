import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['tokyo7.local', 'localhost'],
    proxy: {
      '/api/genres/scan': {
        target: 'http://localhost:3001',
        // No timeout — scan can run for minutes on large libraries
        timeout: 0,
        proxyTimeout: 0,
      },
      '/api': 'http://localhost:3001',
    },
  },
})
