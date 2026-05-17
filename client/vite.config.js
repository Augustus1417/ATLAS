import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || ''

  if (mode === 'production' && !apiBaseUrl) {
    throw new Error(
      'VITE_API_BASE_URL is required for production builds. ' +
        'Set it in .env.production or your host environment before running npm run build.'
    )
  }

  const apiTarget = apiBaseUrl || 'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss()],
    envDir: '.',
    // Dev-only proxy (app uses VITE_API_BASE_URL on axios directly; proxy is optional)
    server:
      mode === 'development'
        ? {
            proxy: {
              '/api': {
                target: apiTarget,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
              },
            },
          }
        : undefined,
  }
})
