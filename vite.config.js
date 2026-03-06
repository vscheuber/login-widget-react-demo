import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync('./src/certs/scheuber.io.key'),
      cert: fs.readFileSync('./src/certs/scheuber.io.cer'),
      ca: fs.readFileSync('./src/certs/alphassl_intermediate_gsgccr6alphasslca2025.crt'),
    },
    allowedHosts: ['localhost', 'login.scheuber.io'],
  },
})
