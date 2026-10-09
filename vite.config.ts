import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { politicaDeSeguranca, servicoOffline } from './scripts/plugin-offline.ts'

// O site vive em https://kohijow.github.io/pilates-central-web/, então o caminho base é o
// mesmo em desenvolvimento, na prévia e na publicação: menos surpresa com links e com o SW.
const BASE = '/pilates-central-web/'
const PORTA = Number(process.env.PORTA ?? 8887)
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  base: BASE,
  plugins: [preact(), servicoOffline(), politicaDeSeguranca()],
  define: { __VERSAO__: JSON.stringify(version) },
  build: {
    // iPhone com iOS 16.4 é o piso combinado com o estúdio
    target: ['es2022', 'safari16.4', 'chrome111', 'firefox115'],
    assetsInlineLimit: 0,
    sourcemap: true,
  },
  server: { host: '127.0.0.1', port: PORTA, strictPort: true },
  preview: { host: '127.0.0.1', port: PORTA, strictPort: true },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
