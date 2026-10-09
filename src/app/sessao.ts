import { signal } from '@preact/signals'
import { ehPapel } from '../dominio/permissoes'
import type { Id, Papel } from '../dominio/tipos'
import { gravarLocal, lerLocal } from './armazenamento'

/**
 * Quem está usando o app. O papel guardado aqui é só para a primeira pintura: assim que os
 * dados chegam vale o papel do cadastro da equipe (que pode ter mudado, ver `perfil.ts`).
 */
export interface Sessao {
  papel: Papel
  membroId: Id
}

const CHAVE = 'pc-sessao'

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

export const sessao = signal<Sessao | null>(ler())

export function entrar(s: Sessao): void {
  sessao.value = s
  gravarLocal(CHAVE, JSON.stringify(s))
}

export function sair(): void {
  sessao.value = null
  gravarLocal(CHAVE, null)
}
