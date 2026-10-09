// O app do aluno: as próximas aulas dele, avisar a falta e escolher onde repor. Tudo a partir
// do que o aluno pode ler (o portal com as turmas fixas, os próprios créditos e as vagas sem
// nomes), igual no modo demonstração e no Firebase.
import { faseDaAula } from './agenda'
import type { FaseDaAula } from './agenda'
import { diaDaSemana, momentoDe, somarDias } from './datas'
import type { Momento } from './datas'
import { antecedenciaEmMinutos, atingiuLimiteDoMes, idDoCredito, novoCredito } from './presenca'
import { DIAS_DA_JANELA } from './projecoes'
import { resumoDeCreditos } from './reposicao'
import { aceito, recusado } from './resultado'
import type { Resultado } from './resultado'
import type { Configuracao, CreditoReposicao, DataISO, Hora, Id, Instante, PortalDoAluno, Unidade, VagaDaAula } from './tipos'

export interface DadosDoAluno {
  portal: PortalDoAluno
  /** os créditos de reposição dele (e só dele) */
  creditos: CreditoReposicao[]
  /** vagas das aulas da janela, de todas as turmas, sem nomes */
  vagas: VagaDaAula[]
  configuracao: Configuracao
  unidades: Unidade[]
  /** aulas em que ele avisou a falta, com ou sem crédito */
  avisadas: string[]
}

export type SituacaoDaMinhaAula = 'confirmada' | 'avisou' | 'cancelada'

export interface MinhaAula {
  id: string
  turmaId: Id
  unidadeId: Id
  data: DataISO
  inicio: Hora
  fim: Hora
  origem: 'fixo' | 'reposicao'
  situacao: SituacaoDaMinhaAula
  fase: FaseDaAula
  /** ainda dá para avisar a falta (aula fixa) ou desistir (reposição) */
  noPrazo: boolean
  /** reposição: o crédito usado; aviso: o crédito que ele ganhou */
  creditoId?: Id
  vaga?: VagaDaAula
}

const idDaAula = (turmaId: Id, data: DataISO) => `${turmaId}_${data}`

function dentroDoPrazo(aula: { data: DataISO; inicio: Hora }, agora: Momento, config: Configuracao): boolean {
  return antecedenciaEmMinutos(aula, agora) >= config.antecedenciaAvisoHoras * 60
}

/** As próximas aulas do aluno (fixas e reposições), da mais próxima para a mais distante. */
export function minhasAulas(d: DadosDoAluno, agora: Momento, dias = DIAS_DA_JANELA): MinhaAula[] {
  const vagas = new Map(d.vagas.map((v) => [idDaAula(v.turmaId, v.data), v]))
  const avisadas = new Set(d.avisadas)
  const creditoDoAviso = new Map(
    d.creditos.filter((c) => (c.motivo ?? 'aviso') === 'aviso').map((c) => [idDaAula(c.origem.turmaId, c.origem.data), c.id]),
  )
  const saida: MinhaAula[] = []
  const ultimo = somarDias(agora.data, dias)

  for (let data = agora.data; data <= ultimo; data = somarDias(data, 1)) {
    const dia = diaDaSemana(data)
    for (const t of d.portal.turmas) {
      if (t.diaDaSemana !== dia || data < t.desde) continue
      const id = idDaAula(t.turmaId, data)
      const vaga = vagas.get(id)
      const avisou = avisadas.has(id) || creditoDoAviso.has(id)
      const aula: MinhaAula = {
        id,
        turmaId: t.turmaId,
        unidadeId: vaga?.unidadeId ?? d.portal.unidadeId,
        data,
        inicio: t.inicio,
        fim: t.fim,
        origem: 'fixo',
        situacao: vaga?.cancelada ? 'cancelada' : avisou ? 'avisou' : 'confirmada',
        fase: faseDaAula({ data, inicio: t.inicio, fim: t.fim }, agora),
        noPrazo: dentroDoPrazo({ data, inicio: t.inicio }, agora, d.configuracao),
      }
      const credito = creditoDoAviso.get(id)
      if (credito) aula.creditoId = credito
      if (vaga) aula.vaga = vaga
      saida.push(aula)
    }
  }

  for (const c of d.creditos) {
    if (!c.usadoEm || c.usadoEm.data < agora.data || c.usadoEm.data > ultimo) continue
    const id = idDaAula(c.usadoEm.turmaId, c.usadoEm.data)
    const vaga = vagas.get(id)
    // sem a vaga não se sabe o horário: fica fora até a equipe atualizar a agenda
    if (!vaga) continue
    saida.push({
      id,
      turmaId: c.usadoEm.turmaId,
      unidadeId: vaga.unidadeId,
      data: vaga.data,
      inicio: vaga.inicio,
      fim: vaga.fim,
      origem: 'reposicao',
      situacao: vaga.cancelada ? 'cancelada' : 'confirmada',
      fase: faseDaAula(vaga, agora),
      noPrazo: dentroDoPrazo(vaga, agora, d.configuracao),
      creditoId: c.id,
      vaga,
    })
  }

  return saida
    .filter((a) => a.fase !== 'encerrada')
    .sort((a, b) => a.data.localeCompare(b.data) || a.inicio.localeCompare(b.inicio))
}

/** Créditos que ainda podem ser usados, o que vence primeiro antes. */
export function meusCreditosLivres(d: DadosDoAluno, hoje: DataISO): CreditoReposicao[] {
  return resumoDeCreditos(d.creditos, hoje).disponiveis
}

/** Data (no relógio do estúdio) em que o crédito nasceu: não dá para repor antes do aviso. */
function dataDoAviso(c: CreditoReposicao): DataISO {
  const instante = new Date(c.criadoEm)
  return Number.isNaN(instante.getTime()) ? c.origem.data : momentoDe(instante).data
}

/**
 * Onde o crédito pode ser usado: aula da mesma unidade, de pé, com lugar, dentro da validade,
 * no prazo, que não seja a da falta nem uma em que ele já esteja.
 */
export function aulasParaRepor(credito: CreditoReposicao, d: DadosDoAluno, agora: Momento): VagaDaAula[] {
  const minhas = new Set(minhasAulas(d, agora).filter((a) => a.situacao !== 'avisou').map((a) => a.id))
  const desde = dataDoAviso(credito)
  return d.vagas
    .filter((v) => {
      const id = idDaAula(v.turmaId, v.data)
      return (
        v.unidadeId === credito.unidadeId &&
        !v.cancelada &&
        v.ocupadas < v.capacidade &&
        v.data <= credito.validoAte &&
        v.data >= desde &&
        !(v.turmaId === credito.origem.turmaId && v.data === credito.origem.data) &&
        !minhas.has(id) &&
        dentroDoPrazo(v, agora, d.configuracao)
      )
    })
    .sort((a, b) => a.data.localeCompare(b.data) || a.inicio.localeCompare(b.inicio))
}

export interface AvisoDoAluno {
  /** crédito de reposição que o aviso gera (sem ele, o aluno passou do limite do mês) */
  credito?: CreditoReposicao
  limiteAtingido: boolean
}

function mensagemDoPrazo(config: Configuracao): string {
  const h = config.antecedenciaAvisoHoras
  return `Pelo app, a falta é avisada com pelo menos ${h} ${h === 1 ? 'hora' : 'horas'} de antecedência. Fale com o estúdio pelo WhatsApp.`
}

/** Confere o aviso de falta e monta o crédito que ele gera. */
export function avisarFalta(aula: MinhaAula, d: DadosDoAluno, agora: Momento, instante: Instante): Resultado<AvisoDoAluno> {
  if (aula.origem !== 'fixo') return recusado('reposicao-nao-avisa', 'Esta é uma reposição: para não vir, desista dela.')
  if (aula.situacao === 'cancelada') return recusado('aula-cancelada', 'Esta aula foi cancelada pelo estúdio.')
  if (aula.situacao === 'avisou') return recusado('nada-a-fazer', 'Você já avisou que não vem.')
  if (!aula.vaga) return recusado('nada-a-fazer', 'Esta aula ainda não abriu na agenda. Tente mais perto da data.')
  if (!dentroDoPrazo(aula, agora, d.configuracao)) return recusado('aula-encerrada', mensagemDoPrazo(d.configuracao))
  const ctx = {
    agora,
    instante,
    config: d.configuracao,
    creditosDoAluno: () => d.creditos,
  }
  if (atingiuLimiteDoMes(d.portal.alunoId, aula.data, ctx)) return aceito({ limiteAtingido: true })
  const origem = { turmaId: aula.turmaId, data: aula.data }
  if (d.creditos.some((c) => c.id === idDoCredito(d.portal.alunoId, aula.turmaId, aula.data))) {
    return aceito({ limiteAtingido: false })
  }
  return aceito({ credito: novoCredito(d.portal.alunoId, aula.unidadeId, origem, ctx, 'aviso'), limiteAtingido: false })
}

/** Desfazer o aviso: só no prazo e se o crédito não foi usado. */
export function desfazerAviso(aula: MinhaAula, d: DadosDoAluno, agora: Momento): Resultado<{ creditoId?: Id }> {
  if (aula.situacao !== 'avisou') return recusado('nada-a-fazer', 'Você não avisou falta nesta aula.')
  if (!aula.vaga) return recusado('nada-a-fazer', 'Esta aula saiu da agenda.')
  if (!dentroDoPrazo(aula, agora, d.configuracao)) return recusado('aula-encerrada', mensagemDoPrazo(d.configuracao))
  if (aula.vaga.ocupadas >= aula.vaga.capacidade) {
    return recusado('sem-vaga', 'Alguém já ocupou o seu lugar nesta aula. Fale com o estúdio pelo WhatsApp.')
  }
  const credito = d.creditos.find((c) => c.id === aula.creditoId)
  if (credito?.usadoEm) return recusado('credito-ja-usado', 'O crédito desta falta já foi usado. Desista da reposição antes.')
  return aceito(credito ? { creditoId: credito.id } : {})
}

/** Confere se o crédito pode entrar nesta aula (a mesma regra que o banco confere de novo). */
export function conferirReposicao(credito: CreditoReposicao, vaga: VagaDaAula, d: DadosDoAluno, agora: Momento): Resultado<true> {
  if (credito.usadoEm) return recusado('credito-indisponivel', 'Este crédito já foi usado.')
  if (credito.validoAte < agora.data) return recusado('credito-vencido', 'Este crédito venceu.')
  if (vaga.cancelada) return recusado('aula-cancelada', 'Esta aula foi cancelada.')
  if (vaga.ocupadas >= vaga.capacidade) return recusado('sem-vaga', 'A aula acabou de lotar. Escolha outro horário.')
  if (!aulasParaRepor(credito, d, agora).some((v) => v.turmaId === vaga.turmaId && v.data === vaga.data)) {
    return recusado('nada-a-fazer', 'Este horário não está disponível para este crédito.')
  }
  return aceito(true)
}

/** Desistir da reposição: no prazo, e a vaga volta para o crédito. */
export function desistirDaReposicao(aula: MinhaAula, d: DadosDoAluno, agora: Momento): Resultado<{ creditoId: Id }> {
  if (aula.origem !== 'reposicao' || !aula.creditoId) return recusado('nada-a-fazer', 'Esta aula não é uma reposição.')
  if (!dentroDoPrazo(aula, agora, d.configuracao)) return recusado('aula-encerrada', mensagemDoPrazo(d.configuracao))
  return aceito({ creditoId: aula.creditoId })
}
