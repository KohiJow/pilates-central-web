import type { Papel } from './tipos'

// Tabela única do que cada papel pode fazer. A interface consulta daqui e as regras do
// Firestore (firestore.rules) seguem a mesma tabela, para a tela nunca oferecer o que o banco recusa.
export type Acao =
  | 'ver-agenda'
  | 'marcar-presenca'
  | 'encaixar-reposicao'
  | 'ver-alunos'
  | 'ver-turmas'
  | 'ver-todas-as-unidades'
  | 'dar-credito-fora-do-prazo'
  | 'cancelar-aula'
  | 'editar-alunos'
  | 'editar-turmas'
  | 'ver-financeiro'
  | 'registrar-pagamento'
  | 'editar-unidades'
  | 'editar-configuracao'
  | 'convidar-professor'
  | 'editar-professores'
  | 'gerenciar-administradores'
  | 'transferir-titularidade'

const DO_PROFESSOR: readonly Acao[] = ['ver-agenda', 'marcar-presenca', 'encaixar-reposicao', 'ver-alunos', 'ver-turmas']

// administração: o dia a dia inteiro, financeiro incluído
const DO_ADMINISTRADOR: readonly Acao[] = [
  ...DO_PROFESSOR,
  'ver-todas-as-unidades',
  'dar-credito-fora-do-prazo',
  'cancelar-aula',
  'editar-alunos',
  'editar-turmas',
  'ver-financeiro',
  'registrar-pagamento',
  'editar-unidades',
  'editar-configuracao',
  'convidar-professor',
  'editar-professores',
]

// só quem é titular mexe em quem administra e passa a conta adiante
const DO_TITULAR: readonly Acao[] = [...DO_ADMINISTRADOR, 'gerenciar-administradores', 'transferir-titularidade']

const PERMISSOES: Record<Papel, ReadonlySet<Acao>> = {
  titular: new Set(DO_TITULAR),
  administrador: new Set(DO_ADMINISTRADOR),
  professor: new Set(DO_PROFESSOR),
}

export function pode(papel: Papel | undefined, acao: Acao): boolean {
  return papel !== undefined && PERMISSOES[papel].has(acao)
}

/** Titular e administradores: o grupo que a tela chama de "Administração". */
export function ehAdministracao(papel: Papel | undefined): boolean {
  return papel === 'titular' || papel === 'administrador'
}

/** Rótulos sem gênero: quem responde pela conta pode ser qualquer pessoa da família. */
export const NOME_DO_PAPEL: Record<Papel, string> = {
  titular: 'Responsável',
  administrador: 'Administração',
  professor: 'Professor',
}

export function ehPapel(valor: unknown): valor is Papel {
  return valor === 'titular' || valor === 'administrador' || valor === 'professor'
}
