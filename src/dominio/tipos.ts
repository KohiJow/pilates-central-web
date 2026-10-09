// Tipos do domínio. Nada aqui sabe de onde os dados vêm (demonstração ou Firebase).
// Datas de calendário são texto 'AAAA-MM-DD' e horários 'HH:MM', sempre no fuso do estúdio:
// assim uma aula das 7h é das 7h em qualquer aparelho, sem conversão de fuso no meio.

export type Id = string
/** Data de calendário: 'AAAA-MM-DD' */
export type DataISO = string
/** Horário do dia: 'HH:MM' (24h) */
export type Hora = string
/** Data e hora completas (ISO 8601 com fuso), usada para registrar quando algo aconteceu */
export type Instante = string
/** Mês de referência de uma mensalidade: 'AAAA-MM' */
export type Competencia = string
/** 0 = domingo ... 6 = sábado (igual ao Date.getDay) */
export type DiaDaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6
/** Valores em centavos, para não somar dinheiro em ponto flutuante */
export type Centavos = number

export interface Unidade {
  id: Id
  nome: string
  endereco: string
  ativa: boolean
}

export type Papel = 'dona' | 'professor'

export interface MembroEquipe {
  id: Id
  nome: string
  papel: Papel
  email: string
  telefone: string
  /** unidades onde a pessoa trabalha (a dona vê todas) */
  unidades: Id[]
  ativo: boolean
}

export type SituacaoAluno = 'ativo' | 'pausado' | 'inativo'

export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'transferencia'

export interface Aluno {
  id: Id
  nome: string
  unidadeId: Id
  telefone: string
  email: string
  /** plano: quantas aulas por semana */
  vezesPorSemana: number
  situacao: SituacaoAluno
  valorMensal: Centavos
  formaPagamento: FormaPagamento
  /** observação livre, só a equipe vê (nada de ficha de saúde estruturada) */
  observacao: string
  /** desde quando é aluno */
  desde: DataISO
  // As turmas fixas do aluno não ficam aqui: a fonte é Turma.alunosFixos (ver turmasDoAluno).
}

/** Turma recorrente: toda semana, no mesmo dia e horário. */
export interface Turma {
  id: Id
  unidadeId: Id
  diaDaSemana: DiaDaSemana
  inicio: Hora
  duracaoMin: number
  capacidade: number
  professorId: Id
  alunosFixos: Id[]
  ativa: boolean
  /** primeira data em que a turma acontece */
  desde: DataISO
}

export type Marcacao = 'presente' | 'faltou' | 'avisou'

export type MotivoCancelamento = 'feriado' | 'estudio'

/**
 * Exceções guardadas de uma aula (a ocorrência de uma turma numa data).
 * A aula em si é derivada da turma; só o que foge da regra é gravado.
 */
export interface RegistroAula {
  /** `${turmaId}_${data}` */
  id: string
  turmaId: Id
  unidadeId: Id
  data: DataISO
  /** presença por aluno (fixos e reposições); ausência da chave = ainda não marcado */
  marcacoes: Record<Id, Marcacao>
  /** reposições encaixadas nesta aula: aluno -> crédito usado */
  reposicoes: Record<Id, Id>
  cancelamento?: { motivo: MotivoCancelamento; observacao: string }
  atualizadoEm: Instante
}

export interface CreditoReposicao {
  /** `cr_${alunoId}_${turmaId}_${data}`: um aviso gera no máximo um crédito */
  id: Id
  alunoId: Id
  unidadeId: Id
  /** aula da qual o aluno faltou avisando (ou que o estúdio cancelou) */
  origem: { turmaId: Id; data: DataISO }
  criadoEm: Instante
  /** último dia em que o crédito pode ser usado */
  validoAte: DataISO
  /** aula onde a reposição foi encaixada */
  usadoEm?: { turmaId: Id; data: DataISO }
}

export interface Pagamento {
  id: Id
  alunoId: Id
  unidadeId: Id
  competencia: Competencia
  valor: Centavos
  forma: FormaPagamento
  pagoEm: DataISO
  observacao: string
}

export interface Configuracao {
  nomeEstudio: string
  /** só dígitos, com DDI: 55 + DDD + número */
  whatsapp: string
  validadeCreditoDias: number
  /** com menos que isso de antecedência, o aviso de falta não gera reposição */
  antecedenciaAvisoHoras: number
  capacidadePadrao: number
}

// ---------- visões derivadas (calculadas, nunca gravadas) ----------

export type OrigemParticipante = 'fixo' | 'reposicao'

export interface Participante {
  alunoId: Id
  origem: OrigemParticipante
  /** undefined = ainda não marcado */
  marcacao?: Marcacao
  creditoId?: Id
}

export interface Aula {
  /** `${turmaId}_${data}` */
  id: string
  turmaId: Id
  unidadeId: Id
  data: DataISO
  inicio: Hora
  fim: Hora
  duracaoMin: number
  capacidade: number
  professorId: Id
  participantes: Participante[]
  cancelamento?: { motivo: MotivoCancelamento; observacao: string }
  /** lugares ocupados: fixos que não avisaram falta + reposições */
  ocupadas: number
  vagas: number
}

export type Periodo = 'manha' | 'tarde' | 'noite'
