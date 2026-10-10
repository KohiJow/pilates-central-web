import { signal } from '@preact/signals'
import type { Id, SituacaoAluno } from '../../dominio/tipos'

// Filtros da lista de alunos e das turmas fora do componente: abrir uma ficha e voltar mantém a
// busca e a unidade escolhidas.
export const buscaDeAlunos = signal('')
export const unidadeDosAlunos = signal<Id | null>(null)
export const situacaoDosAlunos = signal<SituacaoAluno>('ativo')
export const unidadeDasTurmas = signal<Id | null>(null)
export const unidadeDasReposicoes = signal<Id | null>(null)

/** Quem veio experimentar e vai virar aluno: o cadastro novo abre já preenchido com isto. */
export interface CadastroDeExperimental {
  aulaId: string
  experimentalId: Id
  nome: string
  telefone: string
  unidadeId: Id
}

export const cadastroDeExperimental = signal<CadastroDeExperimental | null>(null)
