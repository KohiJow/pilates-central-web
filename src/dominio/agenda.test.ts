import { describe, expect, it } from 'vitest'
import { agruparPorPeriodo, aulasDoDia, faseDaAula, montarAula, turmaAconteceEm, turmasDoAluno } from './agenda'
import { registro, turma } from './apoio-de-teste'
import type { RegistroAula } from './tipos'

const SEXTA = '2026-10-09'

describe('recorrência das turmas', () => {
  it('acontece no dia da semana certo, se ativa e já iniciada', () => {
    expect(turmaAconteceEm(turma(), SEXTA)).toBe(true)
    expect(turmaAconteceEm(turma(), '2026-10-08')).toBe(false)
    expect(turmaAconteceEm(turma({ ativa: false }), SEXTA)).toBe(false)
    expect(turmaAconteceEm(turma({ desde: '2026-10-10' }), SEXTA)).toBe(false)
  })

  it('acha as turmas fixas de um aluno', () => {
    const turmas = [turma(), turma({ id: 't2', alunosFixos: ['a9'] }), turma({ id: 't3', ativa: false })]
    expect(turmasDoAluno('a1', turmas).map((t) => t.id)).toEqual(['t-sex-07'])
  })
})

describe('montar a aula de uma data', () => {
  it('sem exceções, a aula tem os fixos e as vagas que sobram', () => {
    const aula = montarAula(turma(), SEXTA)
    expect(aula.id).toBe('t-sex-07_2026-10-09')
    expect(aula.fim).toBe('07:50')
    expect(aula.participantes.map((p) => p.alunoId)).toEqual(['a1', 'a2', 'a3', 'a4'])
    expect(aula.ocupadas).toBe(4)
    expect(aula.vagas).toBe(1)
  })

  it('quem avisou falta libera o lugar e a reposição ocupa', () => {
    const r = registro({
      turmaId: 't-sex-07',
      data: SEXTA,
      marcacoes: { a2: 'avisou', a1: 'presente' },
      reposicoes: { a9: 'cr-1' },
    })
    const aula = montarAula(turma(), SEXTA, r)
    expect(aula.participantes).toEqual([
      { alunoId: 'a1', origem: 'fixo', marcacao: 'presente' },
      { alunoId: 'a2', origem: 'fixo', marcacao: 'avisou' },
      { alunoId: 'a3', origem: 'fixo' },
      { alunoId: 'a4', origem: 'fixo' },
      { alunoId: 'a9', origem: 'reposicao', creditoId: 'cr-1' },
    ])
    expect(aula.ocupadas).toBe(4)
    expect(aula.vagas).toBe(1)
  })

  it('aluno pausado não ocupa lugar, mas o histórico dele continua', () => {
    const ehAtivo = (id: string) => id !== 'a4' && id !== 'a3'
    const r = registro({ turmaId: 't-sex-07', data: SEXTA, marcacoes: { a3: 'presente' } })
    const aula = montarAula(turma(), SEXTA, r, { ehAtivo })
    expect(aula.participantes.map((p) => p.alunoId)).toEqual(['a1', 'a2', 'a3'])
    expect(aula.vagas).toBe(2)
  })

  it('quem saiu da turma depois continua na aula em que foi marcado', () => {
    const r = registro({ turmaId: 't-sex-07', data: SEXTA, marcacoes: { a7: 'faltou' } })
    const aula = montarAula(turma(), SEXTA, r)
    expect(aula.participantes.at(-1)).toEqual({ alunoId: 'a7', origem: 'fixo', marcacao: 'faltou' })
  })

  it('aula cancelada não tem vaga para encaixe', () => {
    const r = registro({ turmaId: 't-sex-07', data: SEXTA, cancelamento: { motivo: 'feriado', observacao: '' } })
    const aula = montarAula(turma(), SEXTA, r)
    expect(aula.cancelamento?.motivo).toBe('feriado')
    expect(aula.vagas).toBe(0)
  })

  it('nunca mostra vaga negativa', () => {
    const cheia = turma({ capacidade: 3 })
    expect(montarAula(cheia, SEXTA).vagas).toBe(0)
  })
})

describe('aulas do dia', () => {
  const turmas = [
    turma({ id: 'noite', inicio: '19:00', professorId: 'p-2' }),
    turma({ id: 'manha', inicio: '07:00' }),
    turma({ id: 'outra-unidade', inicio: '08:00', unidadeId: 'u-jardim' }),
    turma({ id: 'quinta', diaDaSemana: 4 }),
    turma({ id: 'encerrada', inicio: '12:00', ativa: false }),
  ]
  const registros = new Map<string, RegistroAula>([
    ['encerrada_2026-10-09', registro({ turmaId: 'encerrada', data: SEXTA, marcacoes: { a1: 'presente' } })],
  ])
  const busca = (id: string) => registros.get(id)

  it('ordena por horário e inclui turma encerrada que teve registro no dia', () => {
    expect(aulasDoDia(SEXTA, turmas, busca).map((a) => a.turmaId)).toEqual(['manha', 'outra-unidade', 'encerrada', 'noite'])
  })

  it('filtra por unidade e por professor', () => {
    expect(aulasDoDia(SEXTA, turmas, busca, { unidadeId: 'u-jardim' }).map((a) => a.turmaId)).toEqual(['outra-unidade'])
    expect(aulasDoDia(SEXTA, turmas, busca, { professorId: 'p-2' }).map((a) => a.turmaId)).toEqual(['noite'])
  })

  it('agrupa por manhã, tarde e noite, sem grupos vazios', () => {
    const grupos = agruparPorPeriodo(aulasDoDia(SEXTA, turmas, busca))
    expect(grupos.map((g) => [g.periodo, g.aulas.length])).toEqual([
      ['manha', 2],
      ['tarde', 1],
      ['noite', 1],
    ])
  })
})

describe('fase da aula', () => {
  const aula = { data: SEXTA, inicio: '07:00', fim: '07:50' }
  it('futura, agora e encerrada', () => {
    expect(faseDaAula(aula, { data: SEXTA, minutos: 6 * 60 + 59 })).toBe('futura')
    expect(faseDaAula(aula, { data: SEXTA, minutos: 7 * 60 })).toBe('agora')
    expect(faseDaAula(aula, { data: SEXTA, minutos: 7 * 60 + 50 })).toBe('encerrada')
    expect(faseDaAula(aula, { data: '2026-10-08', minutos: 23 * 60 })).toBe('futura')
  })
})
