import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: '/index.html' // Specifies the entry point
    }
  },
  server: {
    // Optional: configure dev server if needed
    // port: 3000
  }
})
