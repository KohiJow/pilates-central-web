import { describe, expect, it } from 'vitest'
import { montarAula } from './agenda'
import { registro, turma } from './apoio-de-teste'
import { resumoDoDia } from './resumo'

const SEXTA = '2026-10-09'

describe('resumo do dia', () => {
  const t7 = turma({ id: 't7', inicio: '07:00' })
  const t18 = turma({ id: 't18', inicio: '18:00', alunosFixos: ['b1', 'b2', 'b3'] })
  const t12 = turma({ id: 't12', inicio: '12:00' })
  const aulas = [
    montarAula(t7, SEXTA, registro({ turmaId: 't7', data: SEXTA, marcacoes: { a1: 'presente', a2: 'avisou', a3: 'presente' } })),
    montarAula(t12, SEXTA, registro({ turmaId: 't12', data: SEXTA, cancelamento: { motivo: 'estudio', observacao: '' } })),
    montarAula(t18, SEXTA, registro({ turmaId: 't18', data: SEXTA, reposicoes: { z1: 'cr-z1' }, marcacoes: { b2: 'avisou' } })),
  ]

  it('conta esperados, presentes, avisos e reposições ignorando a cancelada', () => {
    const r = resumoDoDia(aulas, { data: SEXTA, minutos: 10 * 60 })
    expect(r.totalDeAulas).toBe(3)
    expect(r.canceladas).toBe(1)
    // 7h: a1, a3, a4 (a2 avisou) = 3; 18h: b1, b3, z1 = 3
    expect(r.alunosEsperados).toBe(6)
    expect(r.presentes).toBe(2)
    expect(r.faltasAvisadas.map((f) => f.alunoId)).toEqual(['a2', 'b2'])
    expect(r.reposicoes.map((f) => f.alunoId)).toEqual(['z1'])
    expect(r.proximas.map((a) => a.turmaId)).toEqual(['t18'])
    expect(r.emAndamento).toBeUndefined()
  })

  it('aponta a aula em andamento', () => {
    const r = resumoDoDia(aulas, { data: SEXTA, minutos: 7 * 60 + 20 })
    expect(r.emAndamento?.turmaId).toBe('t7')
    expect(r.proximas.map((a) => a.turmaId)).toEqual(['t7', 't18'])
  })

  it('dia sem aula', () => {
    const r = resumoDoDia([], { data: SEXTA, minutos: 0 })
    expect(r).toMatchObject({ totalDeAulas: 0, alunosEsperados: 0, proximas: [] })
  })
})
