/// <reference types="vitest" />
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(),react()],
  server: {
    proxy: {
      '/functions-proxy': {
        target: 'https://us-central1-kacademy-d125a.cloudfunctions.net',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/functions-proxy/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts', // Fichier de setup pour les tests
    css: true,
  },
})
