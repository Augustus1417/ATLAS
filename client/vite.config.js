import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Dev-only proxy (production uses VITE_API_BASE_URL directly — see .env.production.example)
  server:
    mode === 'development'
      ? {
          proxy: {
            '/api': {
              target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          },
        }
      : undefined,
}))
