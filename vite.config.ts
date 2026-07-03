import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const allowedHosts = ['localhost', '127.0.0.1', 'terrameta.5ggeology.com', '.5ggeology.com']

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3085,
    allowedHosts,
    proxy: {
      '/api': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3085,
    allowedHosts,
  },
})
