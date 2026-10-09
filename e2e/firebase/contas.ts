// Contas e endereços do teste com os emuladores do Firebase (projeto demo-pilates).
import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8')) as {
  emulators: { auth: { port: number }; firestore: { port: number } }
}

export const PROJETO = 'demo-pilates'
export const AUTH = `http://127.0.0.1:${config.emulators.auth.port}`
export const FIRESTORE = `http://127.0.0.1:${config.emulators.firestore.port}`
export const SENHA = 'senha-de-teste-123'

export const CONTAS = {
  responsavel: { email: 'helena@example.com', membroId: 'e-helena' },
  professor: { email: 'camila@example.com', membroId: 'e-camila' },
  // um aluno por motor: os dois projetos podem rodar ao mesmo tempo no mesmo emulador
  alunoChromium: { email: 'aluno11@example.com', alunoId: 'a-11' },
  alunoWebkit: { email: 'aluno14@example.com', alunoId: 'a-14' },
} as const

/** Professor convidado que ainda não criou a conta (o teste de primeiro acesso cria). */
export function convidadoDoMotor(motor: string) {
  return { email: `convidado-${motor}@example.com`, membroId: `e-convidado-${motor}` }
}

export const MOTORES = ['chromium', 'webkit'] as const

/** Aluno que o teste da administração exclui, um por motor. */
export const EXCLUIDO_DO_MOTOR: Record<(typeof MOTORES)[number], string> = { chromium: 'a-15', webkit: 'a-16' }

/** Projeto vazio, um por motor, para o teste do primeiro acesso (começa sem dono). */
export function projetoVazio(motor: string): string {
  return `demo-pilates-vazio-${motor}`
}

/** Lê um documento direto do emulador, sem regras (cabeçalho "owner" do emulador). */
export async function lerDocumento(caminho: string, projeto = PROJETO): Promise<Record<string, unknown> | null> {
  const r = await fetch(`${FIRESTORE}/v1/projects/${projeto}/databases/(default)/documents/${caminho}`, {
    headers: { Authorization: 'Bearer owner' },
  })
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`leitura de ${caminho}: ${r.status}`)
  return (await r.json()) as Record<string, unknown>
}

/** Link de confirmação de e-mail que o emulador "enviou" para este endereço. */
export async function linkDeConfirmacao(email: string, projeto = PROJETO): Promise<string> {
  const r = await fetch(`${AUTH}/emulator/v1/projects/${projeto}/oobCodes`)
  const { oobCodes } = (await r.json()) as { oobCodes: { email: string; requestType: string; oobLink: string }[] }
  const codigo = [...oobCodes].reverse().find((c) => c.email === email && c.requestType === 'VERIFY_EMAIL')
  if (!codigo) throw new Error(`sem e-mail de confirmação para ${email}`)
  return codigo.oobLink
}
