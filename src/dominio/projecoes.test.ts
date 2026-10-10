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
      comecaEm: Date.UTC(2026, 9, 9, 10, 0),
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

  it('quem vem experimentar ocupa lugar na vaga e na página pública, sem o nome em lugar nenhum', () => {
    const r = registro({ turmaId: 't-sex-07', data: '2026-10-16', experimentais: { 'x-1': { nome: 'Joana Prado', telefone: '5511900000077' } } })
    const e = estado([turma()], [r])
    const vaga = vagasDaJanela(e, SEXTA, instante).get('t-sex-07_2026-10-16')
    expect(vaga?.ocupadas).toBe(5)
    expect(JSON.stringify(vaga)).not.toContain('Joana')
    const pagina = paginaPublica(e, { data: SEXTA, minutos: 8 * 60 }, instante)
    expect(pagina.horarios.find((h) => h.data === '2026-10-16')).toBeUndefined()
    expect(JSON.stringify(pagina)).not.toContain('Joana')
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

describe('o documento público com os horários em texto', () => {
  it('vai e volta sem perder nada, e o que não tem a forma fica de fora', async () => {
    const { codificarHorario, decodificarHorario, documentoDaPaginaPublica } = await import('./projecoes')
    const h = { data: '2026-10-13', inicio: '18:00', fim: '18:50', unidadeId: 'u-centro', vagas: 2 }
    expect(codificarHorario(h)).toBe('2026-10-13 18:00-18:50 u-centro 2')
    expect(decodificarHorario(codificarHorario(h))).toEqual(h)
    expect(decodificarHorario('2026-10-13 18:00-18:50 u-centro 30')?.vagas).toBe(30)
    for (const torto of ['', '2026-10-13 18:00-18:50 u-centro 31', '2026-13-01 18:00-18:50 u 1', '2026-10-13 24:00-18:50 u 1', 'x', 7, null]) {
      expect(decodificarHorario(torto), String(torto)).toBeNull()
    }
    const pagina = {
      nomeEstudio: 'E',
      whatsapp: '',
      unidades: [{ id: 'u-centro', nome: 'Centro', endereco: 'Rua A|B, 1\nsala 2' }],
      experimental: true,
      horarios: [h],
      atualizadoEm: 'x',
    }
    const documento = documentoDaPaginaPublica(pagina)
    expect(documento.horarios).toEqual(['2026-10-13 18:00-18:50 u-centro 2'])
    // a unidade vira 'nome|endereco', sem barra nem quebra de linha dentro
    expect(documento.unidades).toEqual({ 'u-centro': 'Centro|Rua A B, 1 sala 2' })
    const { decodificarUnidade } = await import('./projecoes')
    expect(decodificarUnidade('u-centro', 'Centro|Rua Exemplo, 100')).toEqual({ id: 'u-centro', nome: 'Centro', endereco: 'Rua Exemplo, 100' })
    expect(decodificarUnidade('u-centro', 'Centro|')).toEqual({ id: 'u-centro', nome: 'Centro', endereco: '' })
    expect(decodificarUnidade('u centro', 'Centro|')).toBeNull()
    expect(decodificarUnidade('u-centro', 'sem barra')).toBeNull()
    expect(decodificarUnidade('u-centro', '|sem nome')).toBeNull()
    expect(decodificarUnidade('u-centro', { nome: 'x' })).toBeNull()
  })

  it('a vaga leva o início da aula em milissegundos, na conta das regras (UTC-3)', async () => {
    const { inicioDaAulaEmMs } = await import('./datas')
    // 13/10/2026 às 18h em Campinas = 21h UTC
    expect(inicioDaAulaEmMs('2026-10-13', '18:00')).toBe(Date.UTC(2026, 9, 13, 21, 0))
    expect(inicioDaAulaEmMs('2026-01-01', '00:30')).toBe(Date.UTC(2026, 0, 1, 3, 30))
  })
})
