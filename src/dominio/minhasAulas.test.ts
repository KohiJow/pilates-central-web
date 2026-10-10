import { describe, expect, it } from 'vitest'
import { inicioDaAulaEmMs } from './datas'
import { credito } from './apoio-de-teste'
import { CONFIGURACAO_PADRAO } from './configuracao'
import { aulasParaRepor, avisarFalta, conferirReposicao, desfazerAviso, desistirDaReposicao, minhasAulas } from './minhasAulas'
import type { DadosDoAluno } from './minhasAulas'
import type { VagaDaAula } from './tipos'

const SEXTA = '2026-10-09'
const instante = '2026-10-09T13:00:00.000Z'
// sexta, 10h em Campinas
const agora = { data: SEXTA, minutos: 10 * 60 }

function vaga(turmaId: string, data: string, inicio: string, parcial: Partial<VagaDaAula> = {}): VagaDaAula {
  const [h, m] = inicio.split(':').map(Number)
  const fimMin = (h ?? 0) * 60 + (m ?? 0) + 50
  const fim = `${String(Math.floor(fimMin / 60)).padStart(2, '0')}:${String(fimMin % 60).padStart(2, '0')}`
  return {
    turmaId,
    unidadeId: 'u-centro',
    data,
    inicio,
    fim,
    capacidade: 5,
    ocupadas: 4,
    cancelada: false,
    comecaEm: inicioDaAulaEmMs(data, inicio),
    atualizadoEm: instante,
    ...parcial,
  }
}

function dados(parcial: Partial<DadosDoAluno> = {}): DadosDoAluno {
  return {
    portal: {
      alunoId: 'a9',
      nome: 'Bia',
      unidadeId: 'u-centro',
      // sexta 18h e segunda 7h
      turmas: [
        { turmaId: 't-sex-18', diaDaSemana: 5, inicio: '18:00', fim: '18:50', desde: '2026-01-01' },
        { turmaId: 't-seg-07', diaDaSemana: 1, inicio: '07:00', fim: '07:50', desde: '2026-01-01' },
      ],
      atualizadoEm: instante,
    },
    creditos: [],
    vagas: [
      vaga('t-sex-18', SEXTA, '18:00'),
      vaga('t-seg-07', '2026-10-12', '07:00'),
      vaga('t-sex-18', '2026-10-16', '18:00'),
      vaga('t-ter-19', '2026-10-13', '19:00', { ocupadas: 2 }),
      vaga('t-qua-08', '2026-10-14', '08:00', { ocupadas: 5 }),
      vaga('t-qui-12', '2026-10-15', '12:00', { ocupadas: 1, unidadeId: 'u-jardim' }),
      vaga('t-sex-11', SEXTA, '11:00', { ocupadas: 0 }),
    ],
    configuracao: { ...CONFIGURACAO_PADRAO, acessoDoAluno: true },
    unidades: [],
    avisadas: [],
    ...parcial,
  }
}

describe('minhas próximas aulas', () => {
  it('as fixas da janela, a mais próxima antes, sem as que já passaram', () => {
    const aulas = minhasAulas(dados(), agora, 7)
    expect(aulas.map((a) => a.id)).toEqual(['t-sex-18_2026-10-09', 't-seg-07_2026-10-12', 't-sex-18_2026-10-16'])
    expect(aulas.every((a) => a.origem === 'fixo' && a.situacao === 'confirmada')).toBe(true)
  })

  it('mostra o aviso, o cancelamento e a reposição marcada', () => {
    const repondo = credito({ id: 'cr-x', alunoId: 'a9', usadoEm: { turmaId: 't-ter-19', data: '2026-10-13' } })
    const aviso = credito({ id: 'cr_a9_t-seg-07_2026-10-12', alunoId: 'a9', origem: { turmaId: 't-seg-07', data: '2026-10-12' } })
    const d = dados({ creditos: [repondo, aviso], avisadas: ['t-sex-18_2026-10-16'] })
    d.vagas[0] = vaga('t-sex-18', SEXTA, '18:00', { cancelada: true })
    const porId = new Map(minhasAulas(d, agora, 7).map((a) => [a.id, a]))
    expect(porId.get('t-sex-18_2026-10-09')?.situacao).toBe('cancelada')
    expect(porId.get('t-seg-07_2026-10-12')).toMatchObject({ situacao: 'avisou', creditoId: aviso.id })
    expect(porId.get('t-sex-18_2026-10-16')?.situacao).toBe('avisou')
    expect(porId.get('t-ter-19_2026-10-13')).toMatchObject({ origem: 'reposicao', creditoId: 'cr-x', inicio: '19:00' })
  })

  it('aula que começa em menos de 3 horas fica fora do prazo', () => {
    const ate17 = { data: SEXTA, minutos: 15 * 60 + 30 }
    const aula = minhasAulas(dados(), ate17, 0)[0]
    expect(aula?.noPrazo).toBe(false)
  })
})

describe('avisar a falta pelo app', () => {
  it('no prazo gera o crédito da aula, com a validade combinada', () => {
    const aula = minhasAulas(dados(), agora, 0)[0]
    if (!aula) throw new Error('sem aula')
    const r = avisarFalta(aula, dados(), agora, instante)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valor.credito).toMatchObject({
      id: 'cr_a9_t-sex-18_2026-10-09',
      alunoId: 'a9',
      motivo: 'aviso',
      origem: { turmaId: 't-sex-18', data: SEXTA },
      validoAte: '2026-11-08',
    })
  })

  it('fora do prazo recusa e manda falar com o estúdio', () => {
    const tarde = { data: SEXTA, minutos: 16 * 60 }
    const aula = minhasAulas(dados(), tarde, 0)[0]
    if (!aula) throw new Error('sem aula')
    const r = avisarFalta(aula, dados(), tarde, instante)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.mensagem).toMatch(/3 horas.*WhatsApp/)
  })

  it('passou do limite do mês: avisa, mas sem crédito', () => {
    const usados = [1, 2].map((n) =>
      credito({ id: `cr-${n}`, alunoId: 'a9', motivo: 'aviso', origem: { turmaId: 't-seg-07', data: `2026-10-0${n + 4}` } }),
    )
    const d = dados({ creditos: usados, configuracao: { ...CONFIGURACAO_PADRAO, limiteReposicoesMes: 2 } })
    const aula = minhasAulas(d, agora, 0)[0]
    if (!aula) throw new Error('sem aula')
    const r = avisarFalta(aula, d, agora, instante)
    expect(r.ok && r.valor).toEqual({ limiteAtingido: true })
  })

  it('desfazer: só no prazo, com lugar e com o crédito ainda livre', () => {
    const aviso = credito({ id: 'cr_a9_t-sex-18_2026-10-09', alunoId: 'a9', origem: { turmaId: 't-sex-18', data: SEXTA } })
    const d = dados({ creditos: [aviso] })
    d.vagas[0] = vaga('t-sex-18', SEXTA, '18:00', { ocupadas: 3 })
    const aula = minhasAulas(d, agora, 0)[0]
    if (!aula) throw new Error('sem aula')
    expect(desfazerAviso(aula, d, agora)).toEqual({ ok: true, valor: { creditoId: aviso.id } })
    d.vagas[0] = vaga('t-sex-18', SEXTA, '18:00', { ocupadas: 5 })
    const lotada = minhasAulas(d, agora, 0)[0]
    if (!lotada) throw new Error('sem aula')
    expect(desfazerAviso(lotada, d, agora)).toMatchObject({ ok: false, codigo: 'sem-vaga' })
  })
})

describe('escolher a reposição', () => {
  const livre = credito({ id: 'cr-livre', alunoId: 'a9', criadoEm: '2026-10-08T12:00:00.000Z', validoAte: '2026-10-14' })

  it('só aula da unidade, com lugar, no prazo, dentro da validade e que não seja dele', () => {
    const d = dados({ creditos: [livre] })
    const opcoes = aulasParaRepor(livre, d, agora).map((v) => `${v.turmaId}_${v.data}`)
    // fora: as fixas dele, a lotada (qua), a de outra unidade (qui) e a que começa em 1 hora (sex 11h)
    expect(opcoes).toEqual(['t-ter-19_2026-10-13'])
  })

  it('confere de novo na hora de confirmar (alguém pode ter ocupado)', () => {
    const d = dados({ creditos: [livre] })
    const terca = d.vagas[3]
    if (!terca) throw new Error('sem vaga')
    expect(conferirReposicao(livre, terca, d, agora).ok).toBe(true)
    expect(conferirReposicao(livre, { ...terca, ocupadas: 5 }, d, agora)).toMatchObject({ ok: false, codigo: 'sem-vaga' })
  })

  it('desistir devolve o crédito, no prazo', () => {
    const usado = { ...livre, usadoEm: { turmaId: 't-ter-19', data: '2026-10-13' } }
    const d = dados({ creditos: [usado] })
    const reposicao = minhasAulas(d, agora).find((a) => a.origem === 'reposicao')
    if (!reposicao) throw new Error('sem reposição')
    expect(desistirDaReposicao(reposicao, d, agora)).toEqual({ ok: true, valor: { creditoId: 'cr-livre' } })
    const naHora = { data: '2026-10-13', minutos: 18 * 60 }
    expect(desistirDaReposicao(reposicao, d, naHora).ok).toBe(false)
  })
})
