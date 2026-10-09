import type { Alteracoes } from '../dominio/presenca'
import type {
  Aluno,
  Competencia,
  Configuracao,
  CreditoReposicao,
  DataISO,
  FinanceiroDoAluno,
  Id,
  MembroEquipe,
  Pagamento,
  RegistroAula,
  Turma,
  Unidade,
} from '../dominio/tipos'

/** O que muda pouco e o app carrega inteiro ao abrir (sem nada financeiro: o professor lê isto). */
export interface DadosBase {
  configuracao: Configuracao
  unidades: Unidade[]
  equipe: MembroEquipe[]
  alunos: Aluno[]
  turmas: Turma[]
}

export interface Intervalo {
  de: DataISO
  ate: DataISO
}

/**
 * Uma gravação é atômica: ou tudo entra, ou nada (lote no Firebase, uma escrita na demonstração).
 * Cadastros vão inteiros (aluno, turma, unidade, membro); registros e créditos seguem as regras
 * do domínio (`Alteracoes`).
 */
export interface Gravacao extends Partial<Alteracoes> {
  pagamentos?: Pagamento[]
  pagamentosRemovidos?: Id[]
  alunos?: Aluno[]
  financeiro?: FinanceiroDoAluno[]
  turmas?: Turma[]
  unidades?: Unidade[]
  equipe?: MembroEquipe[]
  configuracao?: Configuracao
}

/**
 * Contrato da camada de dados. A tela e a lógica só conhecem isto; quem implementa é o
 * adaptador de demonstração (dados no aparelho) ou o do Firebase.
 */
export interface Repositorio {
  readonly modo: 'demonstracao' | 'firebase'
  carregarBase(): Promise<DadosBase>
  /** registros de aula com data dentro do intervalo (inclusive) */
  registros(intervalo: Intervalo): Promise<RegistroAula[]>
  creditos(): Promise<CreditoReposicao[]>
  /** valor, forma e vencimento de cada aluno: só a administração pede (o professor não lê) */
  financeiro(): Promise<FinanceiroDoAluno[]>
  pagamentos(competencias: Competencia[]): Promise<Pagamento[]>
  salvar(gravacao: Gravacao): Promise<void>
}

export interface RepositorioDeDemonstracao extends Repositorio {
  readonly modo: 'demonstracao'
  /** apaga tudo e gera os dados fictícios de novo, a partir de agora */
  recomecar(): Promise<void>
  /** false quando o navegador não deixa guardar (aba anônima, por exemplo) */
  readonly persistente: boolean
}
