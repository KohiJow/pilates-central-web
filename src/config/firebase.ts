// Configuração do projeto Firebase do estúdio: o único lugar que o app consulta.
//
// Os valores entram na hora do build, por variáveis VITE_FIREBASE_* (arquivo
// .env.production.local, que não vai para o repositório, ou variáveis do repositório no
// GitHub Actions; ver docs/firebase.md). São valores que vão para o navegador de quem abre o
// site; quem protege os dados são as regras do Firestore (firestore.rules) e o login.
// Sem eles, o site funciona só em modo demonstração, com dados fictícios no aparelho.
// Não há measurementId: o app não carrega o Google Analytics.
export interface ConfiguracaoDoFirebase {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

function lerDoAmbiente(): ConfiguracaoDoFirebase | null {
  const e = import.meta.env
  const valores = {
    apiKey: e.VITE_FIREBASE_API_KEY,
    authDomain: e.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: e.VITE_FIREBASE_PROJECT_ID,
    storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: e.VITE_FIREBASE_APP_ID,
  }
  // pela metade não serve: ou o projeto está todo configurado, ou é demonstração
  const completos = Object.values(valores).every((v) => typeof v === 'string' && v.trim() !== '')
  return completos ? (valores as ConfiguracaoDoFirebase) : null
}

export const CONFIGURACAO_DO_FIREBASE: ConfiguracaoDoFirebase | null = lerDoAmbiente()

/**
 * Emuladores locais (testes e desenvolvimento): só valem em localhost e só com `?emulador=1`
 * no endereço (ver app/modo.ts). No site publicado isto nunca liga. As portas são as de
 * firebase.json.
 */
export const EMULADOR = {
  projectId: 'demo-pilates',
  // chave falsa: o emulador aceita qualquer uma
  apiKey: 'chave-do-emulador',
  auth: 'http://127.0.0.1:8844',
  firestore: { host: '127.0.0.1', porta: 8824 },
} as const
