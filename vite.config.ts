import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { caminhoBase } from './scripts/caminho-base.ts'
import { politicaDeSeguranca, servicoOffline } from './scripts/plugin-offline.ts'

// O caminho base é o mesmo em desenvolvimento, na prévia e na publicação (menos surpresa com
// links e com o service worker) e vem de uma fonte só: BASE_PATH, que o workflow deriva do nome
// do repositório ('/' na raiz de <alguem>.github.io). Sem a variável, o padrão de hoje.
const BASE = caminhoBase()
const PORTA = Number(process.env.PORTA ?? 8887)
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
// portas dos emuladores, lidas do mesmo arquivo que o firebase-tools usa (FIREBASE_JSON troca
// o arquivo, para dois conjuntos de emuladores na mesma máquina)
const { emulators } = JSON.parse(
  readFileSync(process.env.FIREBASE_JSON ? resolve(process.env.FIREBASE_JSON) : fileURLToPath(new URL('./firebase.json', import.meta.url)), 'utf8'),
) as {
  emulators: { auth: { port: number }; firestore: { port: number } }
}

export default defineConfig({
  base: BASE,
  plugins: [preact(), servicoOffline(), politicaDeSeguranca()],
  define: {
    __VERSAO__: JSON.stringify(version),
    __EMULADOR__: JSON.stringify({ auth: emulators.auth.port, firestore: emulators.firestore.port }),
  },
  build: {
    // iPhone com iOS 16.4 é o piso combinado com o estúdio
    target: ['es2022', 'safari16.4', 'chrome111', 'firefox115'],
    assetsInlineLimit: 0,
    sourcemap: true,
    rolldownOptions: {
      // o app, a página pública de aula experimental e o aviso de privacidade (sem login)
      input: {
        principal: fileURLToPath(new URL('./index.html', import.meta.url)),
        experimental: fileURLToPath(new URL('./experimental/index.html', import.meta.url)),
        privacidade: fileURLToPath(new URL('./privacidade/index.html', import.meta.url)),
      },
    },
  },
  server: { host: '127.0.0.1', port: PORTA, strictPort: true },
  preview: { host: '127.0.0.1', port: PORTA, strictPort: true },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
})
