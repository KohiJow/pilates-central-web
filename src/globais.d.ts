/** versão do package.json, injetada pelo Vite no build */
declare const __VERSAO__: string
/** portas dos emuladores do Firebase (de firebase.json), injetadas pelo Vite no build */
declare const __EMULADOR__: { readonly auth: number; readonly firestore: number }

// configuração do Firebase, lida no build (ver src/config/firebase.ts)
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly VITE_FIREBASE_APPCHECK_SITE_KEY?: string
}
