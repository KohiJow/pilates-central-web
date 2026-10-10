// O SDK modular do Firebase, carregado só quando o app abre com projeto configurado (este
// arquivo e o que ele importa ficam num pedaço separado, fora do pacote inicial e fora do
// cache do service worker). Firestore "lite": só leituras e gravações por REST, sem tempo real
// nem cache offline, que o app não usa; fica bem menor e mais previsível no Safari.
import { initializeApp } from 'firebase/app'
import type { FirebaseApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { browserLocalPersistence, connectAuthEmulator, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth'
import type { Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore/lite'
import type { Firestore } from 'firebase/firestore/lite'
import type { ConfiguracaoDoFirebase } from '../../config/firebase'
import { CHAVE_DO_APP_CHECK, ehLocal, EMULADOR } from '../../config/firebase'

export interface Sdk {
  app: FirebaseApp
  auth: Auth
  db: Firestore
  emulador: boolean
}

let atual: Sdk | null = null

/**
 * App Check com reCAPTCHA v3, só com a chave configurada no build. O login e o Firestore passam a
 * mandar o token em cada pedido; em localhost com o projeto real vale o token de depuração, que
 * o SDK mostra no console para registrar no Firebase. Com os emuladores fica desligado: eles não
 * impõem App Check, e o reCAPTCHA pediria o script do Google (que os testes cortam).
 */
function ligarAppCheck(app: FirebaseApp, emulador: boolean): void {
  if (!CHAVE_DO_APP_CHECK || emulador) return
  if (ehLocal()) (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(CHAVE_DO_APP_CHECK), isTokenAutoRefreshEnabled: true })
}

export function ligarSdk(config: ConfiguracaoDoFirebase, emulador: boolean): Sdk {
  if (atual) return atual
  const app = initializeApp(config)
  ligarAppCheck(app, emulador)
  // sem o "resolvedor" de popup e redirecionamento: login só por e-mail e senha, então o SDK
  // não carrega o iframe de autenticação do Google
  const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })
  auth.languageCode = 'pt-BR'
  const db = getFirestore(app)
  if (emulador) {
    connectAuthEmulator(auth, EMULADOR.auth, { disableWarnings: true })
    connectFirestoreEmulator(db, EMULADOR.firestore.host, EMULADOR.firestore.porta)
  }
  atual = { app, auth, db, emulador }
  return atual
}
