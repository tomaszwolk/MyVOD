/// <reference types="vitest" />
import { defineConfig } from 'vite'
import type { UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

interface VitestConfigExport extends UserConfig {
  test: Record<string, unknown>
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/*.spec.ts', // ignore spec files
    ],
  },
} as VitestConfigExport)
