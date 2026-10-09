// Login por e-mail e senha. As mensagens não dizem se o e-mail tem conta ou não (para ninguém
// descobrir quem é aluno do estúdio tentando e-mails).
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import type { Sdk } from './sdk'

export interface Usuario {
  uid: string
  email: string
  emailConfirmado: boolean
}

function usuarioDe(u: User | null): Usuario | null {
  if (!u || !u.email) return null
  return { uid: u.uid, email: u.email.toLowerCase(), emailConfirmado: u.emailVerified }
}

/** Erro com mensagem pronta para a tela. */
export class ErroDeConta extends Error {}

function codigoDe(erro: unknown): string {
  return typeof erro === 'object' && erro !== null && 'code' in erro ? String((erro as { code: unknown }).code) : ''
}

function mensagemDe(erro: unknown, padrao: string): ErroDeConta {
  const codigo = codigoDe(erro)
  if (codigo === 'auth/network-request-failed') return new ErroDeConta('Sem conexão com a internet. Confira e tente de novo.')
  if (codigo === 'auth/too-many-requests') {
    return new ErroDeConta('Muitas tentativas seguidas. Espere alguns minutos e tente de novo.')
  }
  return new ErroDeConta(padrao)
}

export function observarUsuario(sdk: Sdk, aoMudar: (u: Usuario | null) => void): () => void {
  return onAuthStateChanged(sdk.auth, (u) => aoMudar(usuarioDe(u)))
}

export async function entrarComEmail(sdk: Sdk, email: string, senha: string): Promise<Usuario> {
  try {
    const r = await signInWithEmailAndPassword(sdk.auth, email.trim(), senha)
    const u = usuarioDe(r.user)
    if (!u) throw new Error('conta sem e-mail')
    return u
  } catch (erro) {
    throw mensagemDe(erro, 'E-mail ou senha não conferem.')
  }
}

export async function criarConta(sdk: Sdk, email: string, senha: string): Promise<Usuario> {
  try {
    const r = await createUserWithEmailAndPassword(sdk.auth, email.trim(), senha)
    await sendEmailVerification(r.user)
    const u = usuarioDe(r.user)
    if (!u) throw new Error('conta sem e-mail')
    return u
  } catch (erro) {
    if (codigoDe(erro) === 'auth/weak-password') throw new ErroDeConta('Use uma senha com pelo menos 8 caracteres.')
    // e-mail já usado cai aqui também, de propósito
    throw mensagemDe(erro, 'Não deu para criar a conta com este e-mail. Se você já tem conta, use Entrar ou Esqueci a senha.')
  }
}

/** Sempre a mesma resposta, tenha ou não conta com este e-mail. */
export async function recuperarSenha(sdk: Sdk, email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(sdk.auth, email.trim())
  } catch (erro) {
    const codigo = codigoDe(erro)
    if (codigo === 'auth/network-request-failed' || codigo === 'auth/too-many-requests') throw mensagemDe(erro, '')
  }
}

export async function reenviarConfirmacao(sdk: Sdk): Promise<void> {
  const u = sdk.auth.currentUser
  if (!u) return
  try {
    await sendEmailVerification(u)
  } catch (erro) {
    throw mensagemDe(erro, 'Não deu para reenviar agora. Tente de novo em alguns minutos.')
  }
}

/** Recarrega a conta e o token, para valer a confirmação do e-mail feita em outra aba. */
export async function conferirConfirmacao(sdk: Sdk): Promise<Usuario | null> {
  const u = sdk.auth.currentUser
  if (!u) return null
  await reload(u)
  // o papel nas regras do banco vem do token: sem renovar, ele ainda diria "não confirmado"
  await u.getIdToken(true)
  return usuarioDe(sdk.auth.currentUser)
}

export async function sairDaConta(sdk: Sdk): Promise<void> {
  await signOut(sdk.auth)
}
