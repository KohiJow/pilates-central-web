// Token do App Check para a página pública, que lê o Firestore por REST sem o SDK do banco.
// Só é baixado (import() sob demanda) quando o App Check está configurado no build. O nome do
// arquivo leva "firebase" para o service worker deixá-lo fora do cache, como o resto do SDK.
import { getApps, initializeApp } from 'firebase/app'
import { getToken, initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import type { ConfiguracaoDoFirebase } from '../config/firebase'
import { ehLocal } from '../config/firebase'

let pedido: Promise<string | null> | null = null

export function tokenDoAppCheck(config: ConfiguracaoDoFirebase, chave: string): Promise<string | null> {
  pedido ??= (async () => {
    try {
      if (ehLocal()) (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true
      const app = getApps()[0] ?? initializeApp(config)
      const appCheck = initializeAppCheck(app, { provider: new ReCaptchaV3Provider(chave), isTokenAutoRefreshEnabled: false })
      return (await getToken(appCheck)).token
    } catch {
      // sem token o pedido vai mesmo assim: com o App Check não imposto, o Firestore atende
      return null
    }
  })()
  return pedido
}
