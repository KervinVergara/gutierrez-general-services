import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Safety net for Vitest: make sure JSX always has React in scope even if the
  // test runner's transform falls back to the classic runtime (this caused a
  // "React is not defined" error from Icon.jsx under Vitest, even though the
  // normal Vite build — which uses the automatic runtime — never showed it).
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    css: true,
    // Playwright's E2E specs live under tests/e2e and run via `npm run test:e2e`,
    // never through Vitest — keep the two runners from tripping over each other's files.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**', 'tests/rules/**'],
  },
})
