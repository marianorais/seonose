/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'supabase/tests/**/*.test.ts'],
    environment: 'node',
    // PGlite arranca un Postgres por archivo: le damos margen.
    testTimeout: 30000,
    hookTimeout: 60000,
  },
})
