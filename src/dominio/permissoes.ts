import type { Papel } from './tipos'

// Tabela única do que cada papel pode fazer. A interface consulta daqui e as regras do
// Firestore (etapa 2) seguem a mesma tabela, para a tela nunca oferecer o que o banco recusa.
export type Acao =
  | 'ver-agenda'
  | 'marcar-presenca'
  | 'encaixar-reposicao'
  | 'dar-credito-fora-do-prazo'
  | 'cancelar-aula'
  | 'ver-alunos'
  | 'editar-alunos'
  | 'ver-financeiro'
  | 'registrar-pagamento'
  | 'editar-turmas'
  | 'editar-equipe'
  | 'editar-configuracao'

const DO_PROFESSOR: readonly Acao[] = ['ver-agenda', 'marcar-presenca', 'encaixar-reposicao', 'ver-alunos']

const DA_DONA: readonly Acao[] = [
  ...DO_PROFESSOR,
  'dar-credito-fora-do-prazo',
  'cancelar-aula',
  'editar-alunos',
  'ver-financeiro',
  'registrar-pagamento',
  'editar-turmas',
  'editar-equipe',
  'editar-configuracao',
]

const PERMISSOES: Record<Papel, ReadonlySet<Acao>> = {
  dona: new Set(DA_DONA),
  professor: new Set(DO_PROFESSOR),
}

export function pode(papel: Papel, acao: Acao): boolean {
  return PERMISSOES[papel].has(acao)
}

export const NOME_DO_PAPEL: Record<Papel, string> = {
  dona: 'Dona',
  professor: 'Professor',
}
