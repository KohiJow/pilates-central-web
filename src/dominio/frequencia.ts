// Frequência: quantas aulas cada aluno (ou turma) teve num período e como foi a presença.
// Conta só aula que já aconteceu ou que já tem marcação; aula cancelada não entra.
import { faseDaAula } from './agenda'
import type { Momento } from './datas'
import type { Aula, DataISO, Id, Participante } from './tipos'

export interface Participacao {
  aula: Aula
  participante: Participante
}

/** Todas as participações nas aulas das datas pedidas, na ordem do calendário. */
export function participacoesNoPeriodo(datas: readonly DataISO[], aulasDoDia: (data: DataISO) => readonly Aula[]): Participacao[] {
  const saida: Participacao[] = []
  for (const data of [...datas].sort()) {
    const aulas = [...aulasDoDia(data)].sort((a, b) => a.inicio.localeCompare(b.inicio))
    for (const aula of aulas) {
      if (aula.cancelamento) continue
      for (const participante of aula.participantes) saida.push({ aula, participante })
    }
  }
  return saida
}

export interface Frequencia {
  /** aulas que já aconteceram (ou com marcação) */
  aulas: number
  presentes: number
  faltas: number
  avisos: number
  /** aulas que o aluno veio repor */
  reposicoes: number
  /** aula que já terminou e ficou sem chamada */
  semMarcacao: number
  /** presentes sobre as aulas marcadas (0 a 100), ou null sem nenhuma aula marcada */
  percentual: number | null
}

function contaComoFeita(p: Participacao, agora: Momento): boolean {
  return p.participante.marcacao !== undefined || faseDaAula(p.aula, agora) === 'encerrada'
}

export function frequencia(participacoes: readonly Participacao[], agora: Momento): Frequencia {
  const f: Frequencia = { aulas: 0, presentes: 0, faltas: 0, avisos: 0, reposicoes: 0, semMarcacao: 0, percentual: null }
  for (const p of participacoes) {
    if (!contaComoFeita(p, agora)) continue
    f.aulas++
    if (p.participante.origem === 'reposicao') f.reposicoes++
    const m = p.participante.marcacao
    if (m === 'presente') f.presentes++
    else if (m === 'faltou') f.faltas++
    else if (m === 'avisou') f.avisos++
    else f.semMarcacao++
  }
  const marcadas = f.presentes + f.faltas + f.avisos
  f.percentual = marcadas > 0 ? Math.round((f.presentes / marcadas) * 100) : null
  return f
}

export function agruparPorAluno(participacoes: readonly Participacao[]): Map<Id, Participacao[]> {
  const mapa = new Map<Id, Participacao[]>()
  for (const p of participacoes) {
    const lista = mapa.get(p.participante.alunoId)
    if (lista) lista.push(p)
    else mapa.set(p.participante.alunoId, [p])
  }
  return mapa
}

export function agruparPorTurma(participacoes: readonly Participacao[]): Map<Id, Participacao[]> {
  const mapa = new Map<Id, Participacao[]>()
  for (const p of participacoes) {
    const lista = mapa.get(p.aula.turmaId)
    if (lista) lista.push(p)
    else mapa.set(p.aula.turmaId, [p])
  }
  return mapa
}

/**
 * Ausências seguidas mais recentes de um aluno (faltou ou avisou), contando de trás para a
 * frente até a última presença. Aula sem chamada não conta nem interrompe.
 */
export function ausenciasSeguidas(participacoesDoAluno: readonly Participacao[], agora: Momento): number {
  const feitas = participacoesDoAluno
    .filter((p) => contaComoFeita(p, agora))
    .sort((a, b) => a.aula.data.localeCompare(b.aula.data) || a.aula.inicio.localeCompare(b.aula.inicio))
  let n = 0
  for (let i = feitas.length - 1; i >= 0; i--) {
    const m = feitas[i]?.participante.marcacao
    if (m === 'presente') break
    if (m === 'faltou' || m === 'avisou') n++
  }
  return n
}

/** Alunos com `limite` ou mais ausências seguidas, do maior número para o menor. */
export function alunosComAusenciasSeguidas(
  participacoes: readonly Participacao[],
  agora: Momento,
  limite: number,
): { alunoId: Id; ausencias: number }[] {
  const saida: { alunoId: Id; ausencias: number }[] = []
  for (const [alunoId, lista] of agruparPorAluno(participacoes)) {
    const ausencias = ausenciasSeguidas(lista, agora)
    if (ausencias >= limite) saida.push({ alunoId, ausencias })
  }
  return saida.sort((a, b) => b.ausencias - a.ausencias || a.alunoId.localeCompare(b.alunoId))
}
