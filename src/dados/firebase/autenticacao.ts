// Login por e-mail e senha. Toda falha vira um ErroDeConta com frase em português (ver
// erros.ts); as mensagens não dizem se o e-mail tem conta ou não (para ninguém descobrir quem é
// aluno do estúdio tentando e-mails).
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  indexedDBLocalPersistence,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { erroDeConta, ErroDeConta } from './erros'
import type { Sdk } from './sdk'

export { ErroDeConta } from './erros'

export interface Usuario {
  uid: string
  email: string
  emailConfirmado: boolean
}

function usuarioDe(u: User | null): Usuario | null {
  if (!u || !u.email) return null
  return { uid: u.uid, email: u.email.toLowerCase(), emailConfirmado: u.emailVerified }
}

export function observarUsuario(sdk: Sdk, aoMudar: (u: Usuario | null) => void): () => void {
  return onAuthStateChanged(sdk.auth, (u) => aoMudar(usuarioDe(u)))
}

/**
 * Onde a sessão fica: no aparelho (padrão, para não pedir a senha toda vez) ou só nesta aba
 * ("não lembrar neste aparelho": fecha o navegador e a sessão some).
 */
async function escolherPersistencia(sdk: Sdk, lembrar: boolean): Promise<void> {
  if (lembrar) {
    try {
      await setPersistence(sdk.auth, indexedDBLocalPersistence)
    } catch {
      await setPersistence(sdk.auth, browserLocalPersistence)
    }
  } else {
    await setPersistence(sdk.auth, browserSessionPersistence)
  }
}

export async function entrarComEmail(sdk: Sdk, email: string, senha: string, lembrar = true): Promise<Usuario> {
  try {
    await escolherPersistencia(sdk, lembrar)
    const r = await signInWithEmailAndPassword(sdk.auth, email.trim(), senha)
    const u = usuarioDe(r.user)
    if (!u) throw new ErroDeConta('Esta conta não tem e-mail.', 'conta-sem-email')
    return u
  } catch (erro) {
    throw erroDeConta(erro, 'entrar')
  }
}

export async function criarConta(sdk: Sdk, email: string, senha: string, lembrar = true): Promise<Usuario> {
  let user: User
  try {
    await escolherPersistencia(sdk, lembrar)
    user = (await createUserWithEmailAndPassword(sdk.auth, email.trim(), senha)).user
  } catch (erro) {
    throw erroDeConta(erro, 'criar')
  }
  const u = usuarioDe(user)
  if (!u) throw new ErroDeConta('Esta conta não tem e-mail.', 'conta-sem-email')
  // a conta existe; se o e-mail de confirmação não sair agora, a tela seguinte deixa reenviar
  try {
    await sendEmailVerification(user)
  } catch (erro) {
    throw erroDeConta(erro, 'reenviar')
  }
  return u
}

/** Sempre a mesma resposta, tenha ou não conta com este e-mail. */
export async function recuperarSenha(sdk: Sdk, email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(sdk.auth, email.trim())
  } catch (erro) {
    const e = erroDeConta(erro, 'senhaNova')
    // sem a proteção contra enumeração, o Firebase diz "sem conta": a tela não repassa
    if (e.codigo === 'auth/user-not-found' || e.codigo === 'auth/invalid-email') return
    throw e
  }
}

export async function reenviarConfirmacao(sdk: Sdk): Promise<void> {
  const u = sdk.auth.currentUser
  if (!u) throw new ErroDeConta('Você não está mais na conta. Entre de novo.', 'sem-conta')
  try {
    await sendEmailVerification(u)
  } catch (erro) {
    throw erroDeConta(erro, 'reenviar')
  }
}

/** Recarrega a conta e o token, para valer a confirmação do e-mail feita em outra aba. */
export async function conferirConfirmacao(sdk: Sdk): Promise<Usuario | null> {
  const u = sdk.auth.currentUser
  if (!u) return null
  try {
    await reload(u)
    // o papel nas regras do banco vem do token: sem renovar, ele ainda diria "não confirmado"
    if (u.emailVerified) await u.getIdToken(true)
  } catch (erro) {
    throw erroDeConta(erro, 'conferir')
  }
  return usuarioDe(sdk.auth.currentUser)
}

/** Troca a senha conferindo a atual (o Firebase pede login recente para isto). */
export async function trocarSenha(sdk: Sdk, senhaAtual: string, senhaNova: string): Promise<void> {
  const u = sdk.auth.currentUser
  if (!u?.email) throw new ErroDeConta('Você não está mais na conta. Entre de novo.', 'sem-conta')
  try {
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, senhaAtual))
    await updatePassword(u, senhaNova)
  } catch (erro) {
    throw erroDeConta(erro, 'trocarSenha')
  }
}

export async function sairDaConta(sdk: Sdk): Promise<void> {
  try {
    await signOut(sdk.auth)
  } catch (erro) {
    throw erroDeConta(erro, 'sair')
  }
}
