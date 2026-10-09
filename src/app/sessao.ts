import { signal } from '@preact/signals'
import type { Id, Papel } from '../dominio/tipos'
import { gravarLocal, lerLocal } from './armazenamento'

export interface Sessao {
  papel: Papel
  membroId: Id
}

const CHAVE = 'pc-sessao'

function ler(): Sessao | null {
  try {
    const dado = JSON.parse(lerLocal(CHAVE) ?? 'null') as Partial<Sessao> | null
    if (dado && (dado.papel === 'dona' || dado.papel === 'professor') && typeof dado.membroId === 'string') {
      return { papel: dado.papel, membroId: dado.membroId }
    }
  } catch {
    // sessão ilegível: volta para a tela de entrada
  }
  return null
}

export const sessao = signal<Sessao | null>(ler())

export function entrar(s: Sessao): void {
  sessao.value = s
  gravarLocal(CHAVE, JSON.stringify(s))
}

export function sair(): void {
  sessao.value = null
  gravarLocal(CHAVE, null)
}
