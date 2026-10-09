import { describe, expect, it } from 'vitest'
import { montarAula } from './agenda'
import { registro, turma } from './apoio-de-teste'
import { CONFIGURACAO_PADRAO } from './configuracao'
import {
  aulasDaJanela,
  horariosParaExperimental,
  mesmaProjecao,
  mudancasDeVagas,
  paginaPublica,
  portalDoAluno,
  portaisDosAlunos,
  vagaDaAula,
  vagasDaJanela,
} from './projecoes'
import type { EstadoParaProjetar } from './projecoes'
import type { Aluno, RegistroAula, Turma, Unidade } from './tipos'

const SEXTA = '2026-10-09'
const instante = '2026-10-09T13:00:00.000Z'
const UNIDADES: Unidade[] = [
  { id: 'u-centro', nome: 'Centro', endereco: 'Rua Exemplo, 100', ativa: true },
  { id: 'u-fechada', nome: 'Antiga', endereco: '', ativa: false },
]

function aluno(id: string, parcial: Partial<Aluno> = {}): Aluno {
  return {
    id,
    nome: `Ana ${id} Souza`,
    unidadeId: 'u-centro',
    telefone: '',
    email: `${id}@example.com`,
    vezesPorSemana: 2,
    situacao: 'ativo',
    observacao: 'só a equipe lê isto',
    desde: '2026-01-01',
    ...parcial,
  }
}

function estado(turmas: Turma[], registros: RegistroAula[] = [], alunos: Aluno[] = []): EstadoParaProjetar {
  const ids = new Set(turmas.flatMap((t) => t.alunosFixos))
  const todos = [...alunos, ...[...ids].filter((id) => !alunos.some((a) => a.id === id)).map((id) => aluno(id))]
  return {
    configuracao: { ...CONFIGURACAO_PADRAO, whatsapp: '5511900000000', paginaExperimental: true },
    unidades: UNIDADES,
    alunos: todos,
    turmas,
    registro: (id) => registros.find((r) => r.id === id),
  }
}

describe('vaga da aula', () => {
  it('leva só os números, nunca quem está na aula', () => {
    const r = registro({ turmaId: 't-sex-07', data: SEXTA, marcacoes: { a1: 'avisou' } })
    const vaga = vagaDaAula(montarAula(turma(), SEXTA, r), instante)
    expect(vaga).toEqual({
      turmaId: 't-sex-07',
      unidadeId: 'u-centro',
      data: SEXTA,
      inicio: '07:00',
      fim: '07:50',
      capacidade: 5,
      ocupadas: 3,
      cancelada: false,
      atualizadoEm: instante,
    })
    expect(JSON.stringify(vaga)).not.toMatch(/a1|a2|a3|a4/)
  })

  it('aula cancelada fica marcada', () => {
    const r = registro({ turmaId: 't-sex-07', data: SEXTA, cancelamento: { motivo: 'feriado', observacao: '' } })
    expect(vagaDaAula(montarAula(turma(), SEXTA, r), instante).cancelada).toBe(true)
  })

  it('a janela vai de hoje até 14 dias, com as aulas de cada data', () => {
    const vagas = vagasDaJanela(estado([turma()]), SEXTA, instante)
    expect([...vagas.keys()]).toEqual(['t-sex-07_2026-10-09', 't-sex-07_2026-10-16', 't-sex-07_2026-10-23'])
  })

  it('aluno pausado não ocupa lugar na vaga', () => {
    const e = estado([turma()], [], [aluno('a1', { situacao: 'pausado' })])
    expect(aulasDaJanela(e, SEXTA, 0)[0]?.ocupadas).toBe(3)
  })
})

describe('mudanças de vaga', () => {
  const antes = vagasDaJanela(estado([turma()]), SEXTA, instante)

  it('só o que mudou, com o quanto somar em ocupadas', () => {
    const r = registro({ turmaId: 't-sex-07', data: '2026-10-16', marcacoes: { a2: 'avisou' } })
    const depois = vagasDaJanela(estado([turma()], [r]), SEXTA, '2026-10-09T14:00:00.000Z')
    const mudancas = mudancasDeVagas(antes, depois)
    expect(mudancas).toHaveLength(1)
    expect(mudancas[0]).toMatchObject({ id: 't-sex-07_2026-10-16', delta: -1 })
  })

  it('nada muda quando só o instante é outro', () => {
    const depois = vagasDaJanela(estado([turma()]), SEXTA, '2026-10-09T15:00:00.000Z')
    expect(mudancasDeVagas(antes, depois)).toEqual([])
    expect(mesmaProjecao(antes.get('t-sex-07_2026-10-09'), depois.get('t-sex-07_2026-10-09'))).toBe(true)
  })

  it('turma encerrada: as aulas dela ficam canceladas, para ninguém se encaixar', () => {
    const depois = vagasDaJanela(estado([turma({ ativa: false })]), SEXTA, instante)
    const mudancas = mudancasDeVagas(antes, depois)
    expect(mudancas).toHaveLength(3)
    expect(mudancas.every((m) => m.vaga.cancelada && m.delta === 0)).toBe(true)
  })
})

describe('portal do aluno', () => {
  it('primeiro nome, unidade e turmas fixas, sem observação nem colegas', () => {
    const t1 = turma({ id: 't-seg', diaDaSemana: 1, inicio: '18:00', alunosFixos: ['a1', 'a2'] })
    const t2 = turma({ id: 't-qua', diaDaSemana: 3, inicio: '07:00', alunosFixos: ['a1'], fixosDesde: { a1: '2026-09-02' } })
    const portal = portalDoAluno(aluno('a1'), [t2, t1, turma({ id: 't-outra', alunosFixos: ['a2'] })], instante)
    expect(portal).toEqual({
      alunoId: 'a1',
      nome: 'Ana',
      unidadeId: 'u-centro',
      turmas: [
        { turmaId: 't-seg', diaDaSemana: 1, inicio: '18:00', fim: '18:50', desde: '2026-01-01' },
        { turmaId: 't-qua', diaDaSemana: 3, inicio: '07:00', fim: '07:50', desde: '2026-09-02' },
      ],
      atualizadoEm: instante,
    })
    expect(JSON.stringify(portal)).not.toMatch(/a2|equipe|Souza/)
  })

  it('só quem tem acesso liberado e não está arquivado ganha portal', () => {
    const acesso = { convidadoEm: instante, porId: 'e-1' }
    const e = estado([turma()], [], [aluno('a1', { acesso }), aluno('a2'), aluno('a3', { acesso, situacao: 'inativo' })])
    expect([...portaisDosAlunos(e, instante).keys()]).toEqual(['a1'])
  })
})

describe('página pública', () => {
  const agora = { data: SEXTA, minutos: 5 * 60 }

  it('horários com vaga, sem nomes, a partir de duas horas antes da aula', () => {
    const e = estado([turma(), turma({ id: 't-sex-06', inicio: '06:00' })])
    const aulas = aulasDaJanela(e, SEXTA, 0)
    // 6h começa em 1 hora: fora; 7h começa em 2 horas: entra
    expect(horariosParaExperimental(aulas, UNIDADES, agora).map((h) => h.inicio)).toEqual(['07:00'])
  })

  it('aula lotada, cancelada ou de unidade fechada não aparece', () => {
    const cheia = turma({ id: 't-cheia', inicio: '10:00', capacidade: 4 })
    const fechada = turma({ id: 't-fechada', inicio: '11:00', unidadeId: 'u-fechada' })
    const cancelada = turma({ id: 't-cancelada', inicio: '12:00' })
    const r = registro({ turmaId: 't-cancelada', data: SEXTA, cancelamento: { motivo: 'estudio', observacao: '' } })
    const aulas = aulasDaJanela(estado([cheia, fechada, cancelada], [r]), SEXTA, 0)
    expect(horariosParaExperimental(aulas, UNIDADES, agora)).toEqual([])
  })

  it('desligada, publica só nome, contato e unidades abertas', () => {
    const e = { ...estado([turma()]), configuracao: { ...CONFIGURACAO_PADRAO, paginaExperimental: false } }
    const p = paginaPublica(e, agora, instante)
    expect(p.experimental).toBe(false)
    expect(p.horarios).toEqual([])
    expect(p.unidades).toEqual([{ id: 'u-centro', nome: 'Centro', endereco: 'Rua Exemplo, 100' }])
  })

  it('ligada, lista os horários das duas semanas', () => {
    const p = paginaPublica(estado([turma()]), agora, instante)
    expect(p.experimental).toBe(true)
    expect(p.horarios.map((h) => h.data)).toEqual([SEXTA, '2026-10-16', '2026-10-23'])
    expect(p.horarios[0]).toEqual({ data: SEXTA, inicio: '07:00', fim: '07:50', unidadeId: 'u-centro', vagas: 1 })
  })
})
