import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@techstark/opencv-js')) return 'openCv';
          if (id.includes('node_modules/@mediapipe/hands')) return 'mediaPipeHands';
          if (id.includes('node_modules/socket.io-client')) return 'socketVendor';
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/') ||
            id.includes('node_modules/framer-motion/')
          ) {
            return 'reactVendor';
          }
          return undefined;
        },
      },
    },
  },
})
