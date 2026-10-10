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

/**
 * Papéis da equipe. "titular" é quem responde pela conta (aparece como "Responsável" na tela);
 * titular e administradores formam a "Administração", com o mesmo acesso ao dia a dia, financeiro
 * incluído. Só o titular promove ou remove administradores e passa a titularidade adiante.
 */
export type Papel = 'titular' | 'administrador' | 'professor'

export interface MembroEquipe {
  id: Id
  nome: string
  papel: Papel
  email: string
  telefone: string
  /** unidades onde a pessoa trabalha (a administração vê todas) */
  unidades: Id[]
  ativo: boolean
  /** convidado pelo app e ainda sem primeiro acesso (o envio de verdade chega com o login) */
  convite?: { enviadoEm: Instante; porId: Id }
}

export type SituacaoAluno = 'ativo' | 'pausado' | 'inativo'

export type FormaPagamento =
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'dinheiro'
  | 'transferencia'
  | 'gympass'
  | 'totalpass'
  | 'outro'

export interface Aluno {
  id: Id
  nome: string
  unidadeId: Id
  telefone: string
  email: string
  /** plano: quantas aulas por semana */
  vezesPorSemana: number
  /** ativo, pausado (férias, viagem: guarda o lugar na turma) ou inativo (arquivado) */
  situacao: SituacaoAluno
  /** observação livre, só a equipe vê (nada de ficha de saúde estruturada) */
  observacao: string
  /** desde quando é aluno */
  desde: DataISO
  /**
   * Acesso liberado ao app do aluno (pela administração, na ficha). Com o login de verdade, o
   * convite fica no e-mail do aluno; tirar o acesso apaga o convite e corta o papel.
   */
  acesso?: { convidadoEm: Instante; porId: Id }
  // As turmas fixas do aluno não ficam aqui: a fonte é Turma.alunosFixos (ver turmasDoAluno).
  // Valor e forma de pagamento também não: ficam em FinanceiroDoAluno, que o professor não lê.
}

/**
 * A parte financeira do cadastro, separada do aluno: no Firestore uma regra libera ou nega o
 * documento inteiro, então o que o professor não pode ver mora em outro documento.
 */
export interface FinanceiroDoAluno {
  alunoId: Id
  unidadeId: Id
  valorMensal: Centavos
  formaPreferida: FormaPagamento
  /** dia do mês em que a mensalidade vence (1 a 28) */
  diaVencimento: number
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
  /**
   * Desde quando cada aluno está na turma. Sem a data, o aluno conta desde o começo da turma.
   * Quem entra hoje não aparece nas aulas que já passaram (nem como chamada pendente).
   */
  fixosDesde?: Record<Id, DataISO>
  ativa: boolean
  /** primeira data em que a turma acontece */
  desde: DataISO
}

export type Marcacao = 'presente' | 'faltou' | 'avisou'

export type MotivoCancelamento = 'feriado' | 'estudio'

/**
 * Quem vem fazer uma aula experimental: ainda não é aluno, só nome e WhatsApp, registrados pela
 * equipe na própria aula (ocupa um lugar e entra na chamada). Fica no registro da aula, que só a
 * equipe lê. Quando a pessoa vira aluno, o cadastro que nasceu daqui fica apontado.
 */
export interface Experimental {
  nome: string
  /** só dígitos, com DDI */
  telefone: string
  alunoId?: Id
}

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
  /** presença por aluno (fixos, reposições e experimentais); ausência da chave = ainda não marcado */
  marcacoes: Record<Id, Marcacao>
  /** reposições encaixadas nesta aula: aluno -> crédito usado */
  reposicoes: Record<Id, Id>
  /** aulas experimentais registradas nesta aula: código -> quem vem */
  experimentais?: Record<Id, Experimental>
  cancelamento?: { motivo: MotivoCancelamento; observacao: string }
  atualizadoEm: Instante
}

/** De onde veio o crédito: aviso no prazo, aula cancelada pelo estúdio ou decisão da administração. */
export type MotivoCredito = 'aviso' | 'cancelamento' | 'cortesia'

export interface CreditoReposicao {
  /** `cr_${alunoId}_${turmaId}_${data}`: um aviso gera no máximo um crédito */
  id: Id
  alunoId: Id
  unidadeId: Id
  /** sem motivo (dados antigos) conta como aviso */
  motivo?: MotivoCredito
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
  /** quem lançou (com mais de uma pessoa na administração, ajuda a conferir o caixa) */
  registradoPorId?: Id
}

/** O que fica anotado no registro de alterações (quem fez o quê, e quando). */
export type AcaoAuditada =
  | 'pagamento-lancado'
  | 'pagamento-apagado'
  | 'aluno-excluido'
  | 'acesso-do-aluno-liberado'
  | 'acesso-do-aluno-tirado'
  | 'papel-mudado'
  | 'acesso-da-equipe-desligado'
  | 'acesso-da-equipe-religado'
  | 'conta-passada'

/**
 * Uma linha do registro de alterações, só com códigos (nenhum nome, telefone ou e-mail): quem
 * fez, o quê, com quem e quando. Nunca é editada nem apagada; só a administração lê.
 */
export interface RegistroDeAuditoria {
  id: Id
  acao: AcaoAuditada
  /** quem fez (id na equipe) */
  porId: Id
  /** o cadastro tocado (aluno, membro ou lançamento), só o código */
  alvoId: Id
  /** complemento curto sem dado pessoal: valor e mês de um pagamento, o papel novo */
  detalhe: string
  em: Instante
}

/**
 * O que o estúdio diz de si na página pública: tudo configurável em Mais, Estúdio, para nada
 * de um estúdio em particular ficar escrito no código.
 */
export interface TextosDoEstudio {
  /** uma frase de apresentação na capa da página pública */
  fraseCurta: string
  /** até três focos do trabalho (pílulas na capa) */
  focos: string[]
  /** endereço em texto livre (rua, número, bairro, cidade); as unidades têm o delas */
  endereco: string
  /** link do mapa (opcional); sem ele a página procura o endereço no mapa */
  linkDoMapa: string
  /** usuário do Instagram, sem o @ */
  instagram: string
}

export interface Configuracao extends TextosDoEstudio {
  nomeEstudio: string
  /** só dígitos, com DDI: 55 + DDD + número */
  whatsapp: string
  validadeCreditoDias: number
  /** com menos que isso de antecedência, o aviso de falta não gera reposição */
  antecedenciaAvisoHoras: number
  /** quantas reposições por aviso cada aluno ganha por mês (0 = sem limite) */
  limiteReposicoesMes: number
  /** a partir de quantas ausências seguidas o aluno ganha um destaque na lista */
  alertaAusenciasSeguidas: number
  capacidadePadrao: number
  /** alunos com acesso liberado entram no app para avisar falta e escolher reposição */
  acessoDoAluno: boolean
  /** a página pública mostra os horários com vaga para aula experimental */
  paginaExperimental: boolean
}

// ---------- cópias para quem não pode ler tudo (projeções) ----------
// Gravadas pela equipe junto com cada mudança, porque o aluno e a página pública não leem
// turmas, registros nem cadastros: só estas cópias sem nomes de outros alunos.

/** A aula de uma data sem ninguém dentro: só lugares, para o aluno e para a página pública. */
export interface VagaDaAula {
  turmaId: Id
  unidadeId: Id
  data: DataISO
  inicio: Hora
  fim: Hora
  capacidade: number
  ocupadas: number
  cancelada: boolean
  /** início da aula em milissegundos desde 1970 (UTC): as regras conferem o prazo do aluno com ele */
  comecaEm: number
  atualizadoEm: Instante
}

export interface TurmaDoPortal {
  turmaId: Id
  diaDaSemana: DiaDaSemana
  inicio: Hora
  fim: Hora
  /** primeira data em que o aluno está nesta turma */
  desde: DataISO
}

/** O que o aluno lê de si: primeiro nome, unidade e as turmas fixas, sem os colegas. */
export interface PortalDoAluno {
  alunoId: Id
  nome: string
  unidadeId: Id
  turmas: TurmaDoPortal[]
  atualizadoEm: Instante
}

export interface HorarioPublico {
  data: DataISO
  inicio: Hora
  fim: Hora
  unidadeId: Id
  vagas: number
}

/** Documento público (sem login): a página de aula experimental lê só isto. */
export interface PaginaPublica extends TextosDoEstudio {
  nomeEstudio: string
  whatsapp: string
  unidades: Pick<Unidade, 'id' | 'nome' | 'endereco'>[]
  experimental: boolean
  horarios: HorarioPublico[]
  atualizadoEm: Instante
}

// ---------- visões derivadas (calculadas, nunca gravadas) ----------

export type OrigemParticipante = 'fixo' | 'reposicao' | 'experimental'

export interface Participante {
  /** id do aluno; na aula experimental, o código do registro da pessoa (ela ainda não é aluno) */
  alunoId: Id
  origem: OrigemParticipante
  /** undefined = ainda não marcado */
  marcacao?: Marcacao
  creditoId?: Id
  /** quem vem experimentar (só quando a origem é experimental) */
  experimental?: Experimental
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
