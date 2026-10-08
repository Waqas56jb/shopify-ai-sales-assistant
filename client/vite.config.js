import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://shopify-ai-sales-assistant-54i6.vercel.app',
        changeOrigin: true,
      },
    },
  },
})
