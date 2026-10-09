import { faseDaAula } from './agenda'
import { competenciaDe, dataCurta, minutosEntre, momentoDaAula, somarDias } from './datas'
import type { Momento } from './datas'
import { aceito, recusado } from './resultado'
import type { Resultado } from './resultado'
import type {
  Aula,
  Configuracao,
  CreditoReposicao,
  DataISO,
  Id,
  Instante,
  Marcacao,
  MotivoCredito,
  RegistroAula,
} from './tipos'

/** O que uma ação muda e precisa ser gravado de uma vez (lote/transação no Firebase). */
export interface Alteracoes {
  registros: RegistroAula[]
  /** créditos criados ou alterados */
  creditos: CreditoReposicao[]
  creditosRemovidos: Id[]
}

export interface Contexto {
  /** agora, no relógio do estúdio */
  agora: Momento
  /** o mesmo agora como instante real, para gravar em atualizadoEm/criadoEm */
  instante: Instante
  config: Pick<Configuracao, 'validadeCreditoDias' | 'antecedenciaAvisoHoras'> &
    Partial<Pick<Configuracao, 'limiteReposicoesMes'>>
  /** créditos do aluno, para conferir o limite de reposições do mês (sem isto, não há limite) */
  creditosDoAluno?: (alunoId: Id) => readonly CreditoReposicao[]
}

export type BuscaCredito = (id: Id) => CreditoReposicao | undefined

export function idDoCredito(alunoId: Id, turmaId: Id, data: DataISO): Id {
  return `cr_${alunoId}_${turmaId}_${data}`
}

export function registroDe(aula: Aula, registro: RegistroAula | undefined, instante: Instante): RegistroAula {
  const base: RegistroAula = registro
    ? { ...registro, marcacoes: { ...registro.marcacoes }, reposicoes: { ...registro.reposicoes } }
    : {
        id: aula.id,
        turmaId: aula.turmaId,
        unidadeId: aula.unidadeId,
        data: aula.data,
        marcacoes: {},
        reposicoes: {},
        atualizadoEm: instante,
      }
  base.atualizadoEm = instante
  return base
}

export function novoCredito(
  alunoId: Id,
  unidadeId: Id,
  origem: { turmaId: Id; data: DataISO },
  ctx: Contexto,
  motivo: MotivoCredito = 'aviso',
): CreditoReposicao {
  return {
    id: idDoCredito(alunoId, origem.turmaId, origem.data),
    alunoId,
    unidadeId,
    motivo,
    origem: { ...origem },
    criadoEm: ctx.instante,
    validoAte: somarDias(origem.data, ctx.config.validadeCreditoDias),
  }
}

/** Minutos entre agora e o início da aula (negativo se já começou). */
export function antecedenciaEmMinutos(aula: Pick<Aula, 'data' | 'inicio'>, agora: Momento): number {
  return minutosEntre(agora, momentoDaAula(aula.data, aula.inicio))
}

/**
 * A chamada abre meia hora antes do início: dá para marcar quem já chegou, mas não dá para
 * marcar de manhã a turma da noite (um "Todos presentes" sem querer contaria presença de quem
 * ainda nem veio). Antes disso só o aviso de falta vale.
 */
export const ABERTURA_DA_CHAMADA_MIN = 30

export function chamadaAberta(aula: Pick<Aula, 'data' | 'inicio'>, agora: Momento): boolean {
  return antecedenciaEmMinutos(aula, agora) <= ABERTURA_DA_CHAMADA_MIN
}

export function avisoNoPrazo(aula: Pick<Aula, 'data' | 'inicio'>, ctx: Contexto): boolean {
  return antecedenciaEmMinutos(aula, ctx.agora) >= ctx.config.antecedenciaAvisoHoras * 60
}

/**
 * O aluno já ganhou, por aviso, todas as reposições do mês da aula? Créditos de cancelamento
 * do estúdio e cortesias da administração não contam.
 */
export function atingiuLimiteDoMes(alunoId: Id, data: DataISO, ctx: Contexto): boolean {
  const limite = ctx.config.limiteReposicoesMes ?? 0
  if (limite <= 0 || !ctx.creditosDoAluno) return false
  const mes = competenciaDe(data)
  const doMes = ctx.creditosDoAluno(alunoId).filter(
    (c) => (c.motivo ?? 'aviso') === 'aviso' && competenciaDe(c.origem.data) === mes,
  )
  return doMes.length >= limite
}

export interface Marcado {
  alteracoes: Alteracoes
  /** crédito de reposição criado por um aviso de falta */
  creditoGerado?: CreditoReposicao
  /** avisou com menos antecedência que o combinado: ficou sem crédito */
  avisoForaDoPrazo: boolean
  /** avisou no prazo, mas já tinha usado as reposições do mês: ficou sem crédito */
  limiteAtingido: boolean
}

/**
 * Marca (ou desmarca, com `nova = null`) a presença de um aluno numa aula.
 * Avisar falta no prazo gera crédito de reposição; tirar o "avisou" devolve o crédito,
 * desde que ele ainda não tenha sido usado.
 */
export function marcar(
  aula: Aula,
  registro: RegistroAula | undefined,
  alunoId: Id,
  nova: Marcacao | null,
  creditoDe: BuscaCredito,
  ctx: Contexto,
): Resultado<Marcado> {
  if (aula.cancelamento) return recusado('aula-cancelada', 'Esta aula foi cancelada.')
  const participante = aula.participantes.find((p) => p.alunoId === alunoId)
  if (!participante) return recusado('aluno-fora-da-aula', 'Este aluno não está nesta aula.')
  const anterior = participante.marcacao ?? null
  if (anterior === nova) return recusado('nada-a-fazer', 'Nada mudou.')

  if ((nova === 'presente' || nova === 'faltou') && !chamadaAberta(aula, ctx.agora)) {
    return recusado('aula-no-futuro', 'A chamada abre meia hora antes da aula. Antes disso, só o aviso de falta.')
  }
  if (nova === 'avisou') {
    if (participante.origem === 'reposicao') {
      return recusado('reposicao-nao-avisa', 'Quem veio repor não gera outro crédito. Desfaça o encaixe.')
    }
    if (faseDaAula(aula, ctx.agora) === 'encerrada') {
      return recusado('aula-encerrada', 'A aula já terminou. Marque como faltou.')
    }
  }

  const alteracoes: Alteracoes = { registros: [], creditos: [], creditosRemovidos: [] }

  if (anterior === 'avisou') {
    const credito = creditoDe(idDoCredito(alunoId, aula.turmaId, aula.data))
    if (credito?.usadoEm) {
      return recusado(
        'credito-ja-usado',
        `O crédito desta falta já foi usado em ${dataCurta(credito.usadoEm.data)}. Desfaça a reposição antes.`,
      )
    }
    if (credito) alteracoes.creditosRemovidos.push(credito.id)
  }

  let creditoGerado: CreditoReposicao | undefined
  let avisoForaDoPrazo = false
  let limiteAtingido = false
  if (nova === 'avisou') {
    avisoForaDoPrazo = !avisoNoPrazo(aula, ctx)
    limiteAtingido = !avisoForaDoPrazo && atingiuLimiteDoMes(alunoId, aula.data, ctx)
    if (!avisoForaDoPrazo && !limiteAtingido) {
      creditoGerado = novoCredito(alunoId, aula.unidadeId, { turmaId: aula.turmaId, data: aula.data }, ctx)
      alteracoes.creditos.push(creditoGerado)
    }
  }

  const novo = registroDe(aula, registro, ctx.instante)
  if (nova === null) delete novo.marcacoes[alunoId]
  else novo.marcacoes[alunoId] = nova
  alteracoes.registros.push(novo)

  return aceito(
    creditoGerado
      ? { alteracoes, creditoGerado, avisoForaDoPrazo, limiteAtingido }
      : { alteracoes, avisoForaDoPrazo, limiteAtingido },
  )
}

/**
 * A administração pode dar crédito a quem avisou fora do prazo ou passou do limite do mês
 * (decisão caso a caso). Esse crédito não conta para o limite.
 */
export function concederCredito(
  aula: Aula,
  alunoId: Id,
  creditoDe: BuscaCredito,
  ctx: Contexto,
): Resultado<{ alteracoes: Alteracoes; creditoGerado: CreditoReposicao }> {
  const participante = aula.participantes.find((p) => p.alunoId === alunoId)
  if (!participante || participante.marcacao !== 'avisou') {
    return recusado('nada-a-fazer', 'Só quem avisou a falta pode receber crédito.')
  }
  if (creditoDe(idDoCredito(alunoId, aula.turmaId, aula.data))) {
    return recusado('nada-a-fazer', 'Esta falta já tem crédito de reposição.')
  }
  const creditoGerado = novoCredito(alunoId, aula.unidadeId, { turmaId: aula.turmaId, data: aula.data }, ctx, 'cortesia')
  return aceito({ alteracoes: { registros: [], creditos: [creditoGerado], creditosRemovidos: [] }, creditoGerado })
}

/** "Todos presentes": marca como presente quem ainda não tem marcação. */
export function marcarTodosPresentes(
  aula: Aula,
  registro: RegistroAula | undefined,
  ctx: Contexto,
): Resultado<{ alteracoes: Alteracoes; quantidade: number; alunos: Id[] }> {
  if (aula.cancelamento) return recusado('aula-cancelada', 'Esta aula foi cancelada.')
  if (!chamadaAberta(aula, ctx.agora)) {
    return recusado('aula-no-futuro', 'A chamada abre meia hora antes da aula.')
  }
  const pendentes = aula.participantes.filter((p) => p.marcacao === undefined).map((p) => p.alunoId)
  if (pendentes.length === 0) return recusado('nada-a-fazer', 'Todo mundo já está marcado.')
  const novo = registroDe(aula, registro, ctx.instante)
  for (const alunoId of pendentes) novo.marcacoes[alunoId] = 'presente'
  return aceito({
    alteracoes: { registros: [novo], creditos: [], creditosRemovidos: [] },
    quantidade: pendentes.length,
    alunos: pendentes,
  })
}

/** Contagem das marcações de uma aula, para mostrar o resumo da chamada. */
export function contarMarcacoes(aula: Aula): Record<Marcacao | 'pendente', number> {
  const total = { presente: 0, faltou: 0, avisou: 0, pendente: 0 }
  for (const p of aula.participantes) total[p.marcacao ?? 'pendente']++
  return total
}
