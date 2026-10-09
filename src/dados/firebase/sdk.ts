// O SDK modular do Firebase, carregado só quando o app abre com projeto configurado (este
// arquivo e o que ele importa ficam num pedaço separado, fora do pacote inicial e fora do
// cache do service worker). Firestore "lite": só leituras e gravações por REST, sem tempo real
// nem cache offline, que o app não usa; fica bem menor e mais previsível no Safari.
import { initializeApp } from 'firebase/app'
import type { FirebaseApp } from 'firebase/app'
import { browserLocalPersistence, connectAuthEmulator, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth'
import type { Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore/lite'
import type { Firestore } from 'firebase/firestore/lite'
import type { ConfiguracaoDoFirebase } from '../../config/firebase'
import { EMULADOR } from '../../config/firebase'

export interface Sdk {
  app: FirebaseApp
  auth: Auth
  db: Firestore
  emulador: boolean
}

let atual: Sdk | null = null

export function ligarSdk(config: ConfiguracaoDoFirebase, emulador: boolean): Sdk {
  if (atual) return atual
  const app = initializeApp(config)
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
