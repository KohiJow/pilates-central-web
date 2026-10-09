import { faseDaAula } from './agenda'
import { dataCurta, minutosEntre, momentoDaAula, somarDias } from './datas'
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
  config: Pick<Configuracao, 'validadeCreditoDias' | 'antecedenciaAvisoHoras'>
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
): CreditoReposicao {
  return {
    id: idDoCredito(alunoId, origem.turmaId, origem.data),
    alunoId,
    unidadeId,
    origem: { ...origem },
    criadoEm: ctx.instante,
    validoAte: somarDias(origem.data, ctx.config.validadeCreditoDias),
  }
}

/** Minutos entre agora e o início da aula (negativo se já começou). */
export function antecedenciaEmMinutos(aula: Pick<Aula, 'data' | 'inicio'>, agora: Momento): number {
  return minutosEntre(agora, momentoDaAula(aula.data, aula.inicio))
}

export function avisoNoPrazo(aula: Pick<Aula, 'data' | 'inicio'>, ctx: Contexto): boolean {
  return antecedenciaEmMinutos(aula, ctx.agora) >= ctx.config.antecedenciaAvisoHoras * 60
}

export interface Marcado {
  alteracoes: Alteracoes
  /** crédito de reposição criado por um aviso de falta */
  creditoGerado?: CreditoReposicao
  /** avisou com menos antecedência que o combinado: ficou sem crédito */
  avisoForaDoPrazo: boolean
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

  if ((nova === 'presente' || nova === 'faltou') && ctx.agora.data < aula.data) {
    return recusado('aula-no-futuro', 'Presença e falta só podem ser marcadas a partir do dia da aula.')
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
  if (nova === 'avisou') {
    avisoForaDoPrazo = !avisoNoPrazo(aula, ctx)
    if (!avisoForaDoPrazo) {
      creditoGerado = novoCredito(alunoId, aula.unidadeId, { turmaId: aula.turmaId, data: aula.data }, ctx)
      alteracoes.creditos.push(creditoGerado)
    }
  }

  const novo = registroDe(aula, registro, ctx.instante)
  if (nova === null) delete novo.marcacoes[alunoId]
  else novo.marcacoes[alunoId] = nova
  alteracoes.registros.push(novo)

  return aceito(creditoGerado ? { alteracoes, creditoGerado, avisoForaDoPrazo } : { alteracoes, avisoForaDoPrazo })
}

/**
 * A dona pode dar crédito a quem avisou fora do prazo (decisão dela, caso a caso).
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
  const creditoGerado = novoCredito(alunoId, aula.unidadeId, { turmaId: aula.turmaId, data: aula.data }, ctx)
  return aceito({ alteracoes: { registros: [], creditos: [creditoGerado], creditosRemovidos: [] }, creditoGerado })
}

/** "Todos presentes": marca como presente quem ainda não tem marcação. */
export function marcarTodosPresentes(
  aula: Aula,
  registro: RegistroAula | undefined,
  ctx: Contexto,
): Resultado<{ alteracoes: Alteracoes; quantidade: number; alunos: Id[] }> {
  if (aula.cancelamento) return recusado('aula-cancelada', 'Esta aula foi cancelada.')
  if (ctx.agora.data < aula.data) {
    return recusado('aula-no-futuro', 'Presença só pode ser marcada a partir do dia da aula.')
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
