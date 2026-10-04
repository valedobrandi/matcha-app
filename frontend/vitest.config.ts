import { configDefaults, defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  // esbuild's automatic JSX runtime — no `import React` needed, and independent
  // of @vitejs/plugin-react (which isn't reliably transforming under vite 8 here).
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
