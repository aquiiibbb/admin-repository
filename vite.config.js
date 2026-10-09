import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The Super Admin runs on its own port (5174). "/api" goes to the same backend as the hotel app (port 5000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true, secure: false },
    },
  },
  test: { environment: 'jsdom', globals: true },
})
