import { signal } from '@preact/signals'
import { ehPapel } from '../dominio/permissoes'
import type { Id, Papel } from '../dominio/tipos'
import { gravarLocal, lerLocal } from './armazenamento'

/**
 * Quem está usando o app. O papel guardado aqui é só para a primeira pintura: assim que os
 * dados chegam vale o papel do cadastro da equipe (que pode ter mudado, ver `perfil.ts`).
 * Na demonstração a escolha fica guardada no aparelho; no Firebase quem diz é o login.
 */
export interface Sessao {
  papel: Papel
  membroId: Id
}

const CHAVE = 'pc-sessao'
const CHAVE_ALUNO = 'pc-sessao-aluno'

function ler(): Sessao | null {
  try {
    const dado = JSON.parse(lerLocal(CHAVE) ?? 'null') as Partial<Sessao> | null
    if (dado && ehPapel(dado.papel) && typeof dado.membroId === 'string') {
      return { papel: dado.papel, membroId: dado.membroId }
    }
  } catch {
    // sessão ilegível: volta para a tela de entrada
  }
  return null
}

function lerAluno(): { alunoId: Id } | null {
  try {
    const dado = JSON.parse(lerLocal(CHAVE_ALUNO) ?? 'null') as { alunoId?: unknown } | null
    if (dado && typeof dado.alunoId === 'string') return { alunoId: dado.alunoId }
  } catch {
    // ilegível: volta para a entrada
  }
  return null
}

export const sessao = signal<Sessao | null>(ler())

/** Aluno usando o app do aluno. */
export const sessaoDoAluno = signal<{ alunoId: Id } | null>(lerAluno())

let guardarNoAparelho = true
let aoSairDaConta: (() => void) | null = null

/**
 * No Firebase a sessão não fica guardada (o login guarda a dele) e sair também sai da conta;
 * na demonstração, sair só volta à entrada.
 */
export function configurarSessao(opcoes: { guardar: boolean; aoSair: (() => void) | null }): void {
  guardarNoAparelho = opcoes.guardar
  aoSairDaConta = opcoes.aoSair
  if (!opcoes.guardar) {
    sessao.value = null
    sessaoDoAluno.value = null
  }
}

export function entrar(s: Sessao): void {
  sessao.value = s
  if (guardarNoAparelho) gravarLocal(CHAVE, JSON.stringify(s))
}

export function entrarComoAluno(alunoId: Id): void {
  sessaoDoAluno.value = { alunoId }
  if (guardarNoAparelho) gravarLocal(CHAVE_ALUNO, JSON.stringify({ alunoId }))
}

export function sair(): void {
  sessao.value = null
  sessaoDoAluno.value = null
  if (guardarNoAparelho) {
    gravarLocal(CHAVE, null)
    gravarLocal(CHAVE_ALUNO, null)
  }
  aoSairDaConta?.()
}
