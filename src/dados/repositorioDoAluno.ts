import type { DadosDoAluno, MinhaAula } from '../dominio/minhasAulas'
import type { CreditoReposicao, Id, Instante, VagaDaAula } from '../dominio/tipos'

/**
 * Contrato da camada de dados do app do aluno. O aluno só lê o que é dele e as vagas sem nomes;
 * cada ação mexe no registro da aula, no crédito e na vaga de uma vez (no Firebase, numa
 * transação que as regras conferem de novo).
 */
export interface RepositorioDoAluno {
  readonly modo: 'demonstracao' | 'firebase'
  carregar(): Promise<DadosDoAluno>
  /** avisa a falta; `credito` é o que o aviso gera (sem ele, passou do limite do mês) */
  avisar(aula: MinhaAula, credito: CreditoReposicao | undefined, instante: Instante): Promise<void>
  desfazerAviso(aula: MinhaAula, creditoId: Id | undefined, instante: Instante): Promise<void>
  encaixar(vaga: VagaDaAula, credito: CreditoReposicao, instante: Instante): Promise<void>
  desistir(aula: MinhaAula, creditoId: Id, instante: Instante): Promise<void>
}

/** Erro com a explicação para a pessoa (a aula lotou no meio do caminho, por exemplo). */
export class RecusaDoAluno extends Error {}
