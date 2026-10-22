import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://hempllll.github.io/spot-alert/ on GitHub Pages,
  // so assets must resolve under the /spot-alert/ subpath.
  base: '/spot-alert/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
