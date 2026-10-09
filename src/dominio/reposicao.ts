import { faseDaAula } from './agenda'
import { dataCurta, momentoDe } from './datas'
import type { Momento } from './datas'
import { idDoCredito, novoCredito, registroDe } from './presenca'
import type { Alteracoes, BuscaCredito, Contexto } from './presenca'
import { aceito, recusado } from './resultado'
import type { Resultado } from './resultado'
import type { Aula, CreditoReposicao, DataISO, Id, MotivoCancelamento, RegistroAula } from './tipos'

export type SituacaoCredito = 'disponivel' | 'usado' | 'vencido'

export function situacaoDoCredito(credito: CreditoReposicao, hoje: DataISO): SituacaoCredito {
  if (credito.usadoEm) return 'usado'
  if (credito.validoAte < hoje) return 'vencido'
  return 'disponivel'
}

/** Data (no relógio do estúdio) em que o crédito nasceu: não dá para repor antes do aviso. */
function dataDoAviso(credito: CreditoReposicao): DataISO {
  const instante = new Date(credito.criadoEm)
  return Number.isNaN(instante.getTime()) ? credito.origem.data : momentoDe(instante).data
}

/** Confere se um crédito pode ser usado nesta aula; não muda nada. */
export function verificarEncaixe(aula: Aula, credito: CreditoReposicao, agora: Momento): Resultado<true> {
  if (credito.usadoEm) return recusado('credito-indisponivel', 'Este crédito já foi usado.')
  if (aula.cancelamento) return recusado('aula-cancelada', 'Esta aula foi cancelada.')
  if (credito.unidadeId !== aula.unidadeId) {
    return recusado('credito-de-outra-unidade', 'O crédito é de outra unidade.')
  }
  if (aula.data > credito.validoAte) {
    return recusado('credito-vencido', `O crédito vale até ${dataCurta(credito.validoAte)}.`)
  }
  if (aula.data < dataDoAviso(credito)) {
    return recusado('credito-indisponivel', 'A reposição tem que ser depois do aviso de falta.')
  }
  if (credito.origem.turmaId === aula.turmaId && credito.origem.data === aula.data) {
    return recusado('mesma-aula', 'Esta é a aula da falta. Para voltar, desfaça o aviso.')
  }
  if (faseDaAula(aula, agora) === 'encerrada') return recusado('aula-encerrada', 'Esta aula já terminou.')
  if (aula.participantes.some((p) => p.alunoId === credito.alunoId)) {
    return recusado('aluno-ja-na-aula', 'Este aluno já está nesta aula.')
  }
  if (aula.vagas <= 0) return recusado('sem-vaga', 'A aula está lotada.')
  return aceito(true)
}

/** Encaixa a reposição: o aluno entra na aula e o crédito fica marcado como usado. */
export function encaixar(
  aula: Aula,
  registro: RegistroAula | undefined,
  credito: CreditoReposicao,
  ctx: Contexto,
): Resultado<Alteracoes> {
  const pode = verificarEncaixe(aula, credito, ctx.agora)
  if (!pode.ok) return pode
  const novo = registroDe(aula, registro, ctx.instante)
  novo.reposicoes[credito.alunoId] = credito.id
  return aceito({
    registros: [novo],
    creditos: [{ ...credito, usadoEm: { turmaId: aula.turmaId, data: aula.data } }],
    creditosRemovidos: [],
  })
}

/** Tira o aluno da aula de reposição e devolve o crédito para ser usado em outra. */
export function desfazerEncaixe(
  aula: Aula,
  registro: RegistroAula | undefined,
  alunoId: Id,
  creditoDe: BuscaCredito,
  ctx: Contexto,
): Resultado<Alteracoes> {
  const creditoId = registro?.reposicoes[alunoId]
  if (!registro || !creditoId) return recusado('aluno-fora-da-aula', 'Este aluno não está repondo nesta aula.')
  const novo = registroDe(aula, registro, ctx.instante)
  delete novo.reposicoes[alunoId]
  delete novo.marcacoes[alunoId]
  const credito = creditoDe(creditoId)
  const creditos: CreditoReposicao[] = []
  if (credito) {
    const livre: CreditoReposicao = { ...credito }
    delete livre.usadoEm
    creditos.push(livre)
  }
  return aceito({ registros: [novo], creditos, creditosRemovidos: [] })
}

/**
 * Quem pode repor nesta aula: um crédito por aluno (o que vence primeiro), só os que passam
 * em todas as regras de encaixe.
 */
export function candidatosAReposicao(
  aula: Aula,
  creditos: Iterable<CreditoReposicao>,
  agora: Momento,
): CreditoReposicao[] {
  const melhorPorAluno = new Map<Id, CreditoReposicao>()
  for (const c of creditos) {
    if (!verificarEncaixe(aula, c, agora).ok) continue
    const atual = melhorPorAluno.get(c.alunoId)
    if (!atual || c.validoAte < atual.validoAte) melhorPorAluno.set(c.alunoId, c)
  }
  return [...melhorPorAluno.values()].sort((a, b) => a.validoAte.localeCompare(b.validoAte))
}

export interface OpcoesDeCancelamento {
  motivo: MotivoCancelamento
  observacao: string
  /** dar crédito de reposição para os alunos fixos (o estúdio decide por cancelamento) */
  gerarCreditos: boolean
}

/**
 * Cancela a aula (feriado ou imprevisto do estúdio). Quem estava repondo nela recebe o crédito
 * de volta; os fixos ganham crédito se o estúdio quiser.
 */
export function cancelarAula(
  aula: Aula,
  registro: RegistroAula | undefined,
  opcoes: OpcoesDeCancelamento,
  creditoDe: BuscaCredito,
  ctx: Contexto,
): Resultado<{ alteracoes: Alteracoes; creditosGerados: number }> {
  if (aula.cancelamento) return recusado('nada-a-fazer', 'A aula já está cancelada.')
  const novo = registroDe(aula, registro, ctx.instante)
  novo.cancelamento = { motivo: opcoes.motivo, observacao: opcoes.observacao.trim() }
  const creditos: CreditoReposicao[] = []
  let creditosGerados = 0

  for (const [alunoId, creditoId] of Object.entries(novo.reposicoes)) {
    const credito = creditoDe(creditoId)
    if (credito) {
      const livre: CreditoReposicao = { ...credito }
      delete livre.usadoEm
      creditos.push(livre)
    }
    delete novo.marcacoes[alunoId]
  }
  novo.reposicoes = {}

  for (const p of aula.participantes) {
    if (p.origem !== 'fixo') continue
    if (p.marcacao === 'avisou') continue // já tem (ou não tem, por prazo) o crédito do aviso
    delete novo.marcacoes[p.alunoId]
    if (opcoes.gerarCreditos && !creditoDe(idDoCredito(p.alunoId, aula.turmaId, aula.data))) {
      creditos.push(novoCredito(p.alunoId, aula.unidadeId, { turmaId: aula.turmaId, data: aula.data }, ctx))
      creditosGerados++
    }
  }
  return aceito({ alteracoes: { registros: [novo], creditos, creditosRemovidos: [] }, creditosGerados })
}

/** Desfaz o cancelamento. Créditos dados pelo cancelamento e ainda não usados são retirados. */
export function reabrirAula(
  aula: Aula,
  registro: RegistroAula | undefined,
  creditoDe: BuscaCredito,
  ctx: Contexto,
): Resultado<Alteracoes> {
  if (!registro?.cancelamento) return recusado('nada-a-fazer', 'A aula não está cancelada.')
  const removidos: Id[] = []
  for (const p of aula.participantes) {
    if (p.origem !== 'fixo' || p.marcacao === 'avisou') continue
    const credito = creditoDe(idDoCredito(p.alunoId, aula.turmaId, aula.data))
    if (!credito) continue
    if (credito.usadoEm) {
      return recusado(
        'credito-ja-usado',
        `Um crédito deste cancelamento já foi usado em ${dataCurta(credito.usadoEm.data)}.`,
      )
    }
    removidos.push(credito.id)
  }
  const novo = registroDe(aula, registro, ctx.instante)
  delete novo.cancelamento
  return aceito({ registros: [novo], creditos: [], creditosRemovidos: removidos })
}
