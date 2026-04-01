import { defineConfig } from 'vite'

export default defineConfig({
  base: '/pinguinocracia2/',
  server: {
    port: 3000
  },
  build: {
    target: 'es2020'
  }
})
