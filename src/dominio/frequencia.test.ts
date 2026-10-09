import { describe, expect, it } from 'vitest'
import { montarAula } from './agenda'
import { registro, turma } from './apoio-de-teste'
import {
  agruparPorAluno,
  agruparPorTurma,
  alunosComAusenciasSeguidas,
  ausenciasSeguidas,
  frequencia,
  participacoesNoPeriodo,
} from './frequencia'
import type { Aula, Marcacao } from './tipos'

// sexta 7h, turma com a1..a4; o "agora" é sexta, 16/10, 12h
const AGORA = { data: '2026-10-16', minutos: 12 * 60 }
const t = turma()

function aula(data: string, marcacoes: Record<string, Marcacao> = {}, cancelada = false): Aula {
  const r = registro({ turmaId: t.id, data, marcacoes, ...(cancelada ? { cancelamento: { motivo: 'feriado' as const, observacao: '' } } : {}) })
  return montarAula(t, data, r)
}

const semanas: Record<string, Aula> = {
  '2026-09-25': aula('2026-09-25', { a1: 'presente', a2: 'presente', a3: 'faltou', a4: 'presente' }),
  '2026-10-02': aula('2026-10-02', { a1: 'faltou', a2: 'presente', a3: 'avisou', a4: 'presente' }),
  '2026-10-09': aula('2026-10-09', { a1: 'avisou', a2: 'presente', a3: 'faltou' }, false),
  '2026-10-12': aula('2026-10-12', {}, true),
  '2026-10-16': aula('2026-10-16', { a1: 'faltou' }),
  '2026-10-23': aula('2026-10-23'),
}
const aulasDoDia = (d: string) => (semanas[d] ? [semanas[d]] : [])
const datas = Object.keys(semanas)

describe('frequência', () => {
  const todas = participacoesNoPeriodo(datas, aulasDoDia)

  it('participações em ordem, sem aula cancelada', () => {
    expect(todas.some((p) => p.aula.data === '2026-10-12')).toBe(false)
    expect(todas[0]?.aula.data).toBe('2026-09-25')
  })

  it('por aluno: conta só aula que já aconteceu ou que tem marcação', () => {
    const porAluno = agruparPorAluno(todas)
    // a aula das 7h de hoje (16/10) já terminou e só tem a falta de a1: os outros ficam sem chamada
    expect(frequencia(porAluno.get('a2') ?? [], AGORA)).toEqual({
      aulas: 4,
      presentes: 3,
      faltas: 0,
      avisos: 0,
      reposicoes: 0,
      semMarcacao: 1,
      percentual: 100,
    })
    // aula sem chamada conta como aula, mas fica fora do percentual
    expect(frequencia(porAluno.get('a4') ?? [], AGORA)).toMatchObject({ aulas: 4, presentes: 2, semMarcacao: 2, percentual: 100 })
    // a1: a aula das 7h de 16/10 já tem falta marcada, a de 23/10 ainda não aconteceu
    expect(frequencia(porAluno.get('a1') ?? [], AGORA)).toMatchObject({ aulas: 4, presentes: 1, faltas: 2, avisos: 1, percentual: 25 })
  })

  it('por turma', () => {
    const porTurma = agruparPorTurma(todas)
    const f = frequencia(porTurma.get(t.id) ?? [], AGORA)
    expect(f.presentes).toBe(6)
    expect(f.percentual).toBe(50)
  })

  it('sem nenhuma aula marcada, o percentual fica vazio', () => {
    expect(frequencia([], AGORA).percentual).toBeNull()
  })
})

describe('ausências seguidas', () => {
  const porAluno = agruparPorAluno(participacoesNoPeriodo(datas, aulasDoDia))

  it('conta faltas e avisos desde a última presença', () => {
    expect(ausenciasSeguidas(porAluno.get('a1') ?? [], AGORA)).toBe(3)
    expect(ausenciasSeguidas(porAluno.get('a3') ?? [], AGORA)).toBe(3)
    expect(ausenciasSeguidas(porAluno.get('a2') ?? [], AGORA)).toBe(0)
  })

  it('aula sem chamada não conta nem interrompe', () => {
    expect(ausenciasSeguidas(porAluno.get('a4') ?? [], AGORA)).toBe(0)
  })

  it('lista quem passou do limite, do maior para o menor', () => {
    expect(alunosComAusenciasSeguidas(participacoesNoPeriodo(datas, aulasDoDia), AGORA, 3)).toEqual([
      { alunoId: 'a1', ausencias: 3 },
      { alunoId: 'a3', ausencias: 3 },
    ])
  })
})
