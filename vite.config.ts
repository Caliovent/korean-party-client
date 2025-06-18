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
        target: 'http://127.0.0.1:5001/kacademy-d125a/europe-west1', // Cible l'émulateur
        changeOrigin: true, // Nécessaire pour que le proxy fonctionne
        rewrite: (path) => path.replace(/^\/functions-proxy/, ''), // Retire /functions-proxy de l'URL avant de l'envoyer
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
