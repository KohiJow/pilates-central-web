import { diaDaSemana, horaDe, minutosDe, minutosEntre, momentoDaAula, periodoDe } from './datas'
import type { Momento } from './datas'
import type { Aula, DataISO, Id, Participante, Periodo, RegistroAula, Turma } from './tipos'

export function idDaAula(turmaId: Id, data: DataISO): string {
  return `${turmaId}_${data}`
}

export function turmaAconteceEm(turma: Turma, data: DataISO): boolean {
  return turma.ativa && turma.diaDaSemana === diaDaSemana(data) && turma.desde <= data
}

export interface OpcoesDaAula {
  /** aluno pausado ou inativo não ocupa lugar na turma */
  ehAtivo?: (alunoId: Id) => boolean
}

/**
 * Monta a aula de uma turma numa data, aplicando as exceções guardadas no registro.
 * Ordem dos participantes: fixos (na ordem da turma), depois reposições.
 */
export function montarAula(
  turma: Turma,
  data: DataISO,
  registro?: RegistroAula,
  opcoes: OpcoesDaAula = {},
): Aula {
  const marcacoes = registro?.marcacoes ?? {}
  const reposicoes = registro?.reposicoes ?? {}
  const ehAtivo = opcoes.ehAtivo ?? (() => true)
  const participantes: Participante[] = []
  const vistos = new Set<Id>()

  for (const alunoId of turma.alunosFixos) {
    if (vistos.has(alunoId) || reposicoes[alunoId] !== undefined) continue
    const marcacao = marcacoes[alunoId]
    // quem está pausado some da aula, a não ser que já tenha presença registrada nela
    if (!ehAtivo(alunoId) && marcacao === undefined) continue
    participantes.push(marcacao ? { alunoId, origem: 'fixo', marcacao } : { alunoId, origem: 'fixo' })
    vistos.add(alunoId)
  }
  for (const [alunoId, creditoId] of Object.entries(reposicoes)) {
    const marcacao = marcacoes[alunoId]
    participantes.push(
      marcacao
        ? { alunoId, origem: 'reposicao', creditoId, marcacao }
        : { alunoId, origem: 'reposicao', creditoId },
    )
    vistos.add(alunoId)
  }
  // histórico: alguém marcado nesta data que depois saiu da turma continua aparecendo
  for (const [alunoId, marcacao] of Object.entries(marcacoes)) {
    if (!vistos.has(alunoId)) participantes.push({ alunoId, origem: 'fixo', marcacao })
  }

  const ocupadas = participantes.filter((p) => p.marcacao !== 'avisou').length
  const aula: Aula = {
    id: idDaAula(turma.id, data),
    turmaId: turma.id,
    unidadeId: turma.unidadeId,
    data,
    inicio: turma.inicio,
    fim: horaDe(minutosDe(turma.inicio) + turma.duracaoMin),
    duracaoMin: turma.duracaoMin,
    capacidade: turma.capacidade,
    professorId: turma.professorId,
    participantes,
    ocupadas,
    vagas: registro?.cancelamento ? 0 : Math.max(0, turma.capacidade - ocupadas),
  }
  if (registro?.cancelamento) aula.cancelamento = registro.cancelamento
  return aula
}

export interface FiltroDoDia {
  unidadeId?: Id
  professorId?: Id
}

/**
 * Aulas de um dia: turmas que acontecem na data e também as que têm registro nela
 * (uma turma encerrada depois continua aparecendo nos dias em que aconteceu).
 */
export function aulasDoDia(
  data: DataISO,
  turmas: readonly Turma[],
  registroDe: (idAula: string) => RegistroAula | undefined,
  filtro: FiltroDoDia = {},
  opcoes: OpcoesDaAula = {},
): Aula[] {
  const aulas: Aula[] = []
  for (const turma of turmas) {
    if (filtro.unidadeId && turma.unidadeId !== filtro.unidadeId) continue
    if (filtro.professorId && turma.professorId !== filtro.professorId) continue
    const registro = registroDe(idDaAula(turma.id, data))
    const acontece = turmaAconteceEm(turma, data) || (registro !== undefined && turma.diaDaSemana === diaDaSemana(data))
    if (!acontece) continue
    aulas.push(montarAula(turma, data, registro, opcoes))
  }
  return aulas.sort((a, b) => a.inicio.localeCompare(b.inicio) || a.unidadeId.localeCompare(b.unidadeId))
}

export const PERIODOS: readonly Periodo[] = ['manha', 'tarde', 'noite']

export const NOME_DO_PERIODO: Record<Periodo, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
}

export function agruparPorPeriodo(aulas: readonly Aula[]): { periodo: Periodo; aulas: Aula[] }[] {
  return PERIODOS.map((periodo) => ({ periodo, aulas: aulas.filter((a) => periodoDe(a.inicio) === periodo) })).filter(
    (g) => g.aulas.length > 0,
  )
}

export type FaseDaAula = 'futura' | 'agora' | 'encerrada'

export function faseDaAula(aula: Pick<Aula, 'data' | 'inicio' | 'fim'>, agora: Momento): FaseDaAula {
  if (minutosEntre(agora, momentoDaAula(aula.data, aula.inicio)) > 0) return 'futura'
  if (minutosEntre(agora, momentoDaAula(aula.data, aula.fim)) > 0) return 'agora'
  return 'encerrada'
}

export function turmasDoAluno(alunoId: Id, turmas: readonly Turma[]): Turma[] {
  return turmas.filter((t) => t.ativa && t.alunosFixos.includes(alunoId))
}

/** Lugares ocupados de uma turma na semana-modelo (sem exceções), para montar turmas. */
export function lotacaoFixa(turma: Turma): { ocupadas: number; vagas: number } {
  const ocupadas = turma.alunosFixos.length
  return { ocupadas, vagas: Math.max(0, turma.capacidade - ocupadas) }
}
