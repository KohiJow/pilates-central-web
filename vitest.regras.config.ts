import { defineConfig } from 'vitest/config'

// Testes das regras do Firestore: rodam contra o emulador (firebase emulators:exec), um arquivo
// por vez, porque todos usam o mesmo banco.
export default defineConfig({
  test: {
    include: ['testes-de-regras/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
})
