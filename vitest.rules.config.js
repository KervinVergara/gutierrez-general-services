import { defineConfig } from 'vitest/config'

// Separate, minimal Vitest config just for the Firestore rules tests
// (tests/rules/**). These run against the local Firestore emulator via
// `npm run test:rules` (see package.json), never through the regular
// `npm test`, which explicitly excludes tests/rules — see vite.config.js.
// They don't touch React/jsdom, so this intentionally skips the app's
// jsxInject/setupFiles config to keep the two suites independent.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.js'],
  },
})
