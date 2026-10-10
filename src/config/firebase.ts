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
 * Chave do site do reCAPTCHA v3 para o App Check (VITE_FIREBASE_APPCHECK_SITE_KEY). Sem ela o
 * App Check fica desligado; com ela, cada pedido ao Firebase leva um token que diz "veio do site
 * de verdade", e o dono do projeto pode impor isso no console (ver docs/firebase.md).
 */
export const CHAVE_DO_APP_CHECK: string | null = (import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY ?? '').trim() || null

/** Em localhost o App Check usa um token de depuração (o SDK escreve o token no console). */
export function ehLocal(hostname = location.hostname): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

/**
 * Emuladores locais (testes e desenvolvimento): só valem em localhost e só com `?emulador=1`
 * no endereço (ver app/modo.ts). No site publicado isto nunca liga. As portas vêm de
 * firebase.json, lidas no build (vite.config.ts).
 */
export const EMULADOR = {
  projectId: 'demo-pilates',
  // chave falsa: o emulador aceita qualquer uma
  apiKey: 'chave-do-emulador',
  auth: `http://127.0.0.1:${__EMULADOR__.auth}`,
  firestore: { host: '127.0.0.1', porta: __EMULADOR__.firestore },
} as const
