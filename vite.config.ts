import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const allowedHosts = [
  'localhost',
  '127.0.0.1',
  'terrameta.5ggeology.com',
  '.5ggeology.com',
  '.ngrok-free.app',
  '.ngrok.io',
]

const apiProxy = {
  '/api': {
    target: 'http://localhost:8085',
    changeOrigin: true,
    timeout: 120_000,
    proxyTimeout: 120_000,
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3085,
    allowedHosts,
    proxy: apiProxy,
  },
  preview: {
    port: 3085,
    allowedHosts,
    proxy: apiProxy,
  },
})
