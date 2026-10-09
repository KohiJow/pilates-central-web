import { describe, expect, it } from 'vitest'
import { montarAula } from './agenda'
import { diaDaSemana } from './datas'
import { buscaEm, contexto, credito, registro, turma } from './apoio-de-teste'
import {
  aulasParaEncaixe,
  cancelarAula,
  candidatosAReposicao,
  desfazerEncaixe,
  encaixar,
  reabrirAula,
  resumoDeCreditos,
  situacaoDoCredito,
  verificarEncaixe,
} from './reposicao'

const SEXTA = '2026-10-09'
const antes = contexto(SEXTA, '06:00')

describe('situação do crédito', () => {
  it('disponível, usado ou vencido', () => {
    expect(situacaoDoCredito(credito(), '2026-11-06')).toBe('disponivel')
    expect(situacaoDoCredito(credito(), '2026-11-07')).toBe('vencido')
    expect(situacaoDoCredito(credito({ usadoEm: { turmaId: 'x', data: SEXTA } }), '2026-10-01')).toBe('usado')
  })
})

describe('encaixar reposição', () => {
  it('só onde há vaga: o aluno entra e o crédito fica usado', () => {
    const aula = montarAula(turma(), SEXTA)
    const c = credito()
    const r = encaixar(aula, undefined, c, antes)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valor.registros[0]?.reposicoes).toEqual({ a9: c.id })
    expect(r.valor.creditos[0]?.usadoEm).toEqual({ turmaId: 't-sex-07', data: SEXTA })
    const depois = montarAula(turma(), SEXTA, r.valor.registros[0])
    expect(depois.vagas).toBe(0)
    expect(depois.participantes.at(-1)).toMatchObject({ alunoId: 'a9', origem: 'reposicao' })
  })

  it('aula lotada recusa', () => {
    const aula = montarAula(turma({ capacidade: 4 }), SEXTA)
    expect(encaixar(aula, undefined, credito(), antes)).toMatchObject({ ok: false, codigo: 'sem-vaga' })
  })

  it('a vaga de quem avisou falta pode ser usada', () => {
    const r0 = registro({ turmaId: 't-sex-07', data: SEXTA, marcacoes: { a1: 'avisou' } })
    const aula = montarAula(turma({ capacidade: 4 }), SEXTA, r0)
    expect(encaixar(aula, r0, credito(), antes).ok).toBe(true)
  })

  it('confere unidade, validade, uso, aula da falta, horário e duplicidade', () => {
    const aula = montarAula(turma(), SEXTA)
    expect(verificarEncaixe(aula, credito({ unidadeId: 'u-jardim' }), antes.agora)).toMatchObject({
      codigo: 'credito-de-outra-unidade',
    })
    expect(verificarEncaixe(aula, credito({ validoAte: '2026-10-08' }), antes.agora)).toMatchObject({
      codigo: 'credito-vencido',
    })
    expect(
      verificarEncaixe(aula, credito({ usadoEm: { turmaId: 'x', data: '2026-10-02' } }), antes.agora),
    ).toMatchObject({ codigo: 'credito-indisponivel' })
    expect(
      verificarEncaixe(aula, credito({ origem: { turmaId: 't-sex-07', data: SEXTA } }), antes.agora),
    ).toMatchObject({ codigo: 'mesma-aula' })
    expect(verificarEncaixe(aula, credito(), { data: SEXTA, minutos: 8 * 60 })).toMatchObject({
      codigo: 'aula-encerrada',
    })
    expect(verificarEncaixe(aula, credito({ alunoId: 'a1' }), antes.agora)).toMatchObject({ codigo: 'aluno-ja-na-aula' })
    expect(verificarEncaixe(aula, credito({ criadoEm: '2026-10-10T12:00:00.000Z' }), antes.agora)).toMatchObject({
      codigo: 'credito-indisponivel',
    })
  })

  it('reposição de aula que já terminou não sai mais (fica no histórico)', () => {
    const r0 = registro({ turmaId: 't-sex-07', data: SEXTA, reposicoes: { a9: 'cr_x' }, marcacoes: { a9: 'presente' } })
    const aula = montarAula(turma(), SEXTA, r0)
    expect(desfazerEncaixe(aula, r0, 'a9', buscaEm([]), contexto(SEXTA, '08:00'))).toMatchObject({ ok: false, codigo: 'aula-encerrada' })
  })

  it('desfazer o encaixe devolve o crédito', () => {
    const c = credito()
    const r0 = registro({
      turmaId: 't-sex-07',
      data: SEXTA,
      reposicoes: { a9: c.id },
      marcacoes: { a9: 'presente' },
    })
    const usado = { ...c, usadoEm: { turmaId: 't-sex-07', data: SEXTA } }
    const aula = montarAula(turma(), SEXTA, r0)
    const r = desfazerEncaixe(aula, r0, 'a9', buscaEm([usado]), antes)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valor.registros[0]?.reposicoes).toEqual({})
    expect(r.valor.registros[0]?.marcacoes).toEqual({})
    expect(r.valor.creditos[0]?.usadoEm).toBeUndefined()
    expect(desfazerEncaixe(aula, r0, 'a1', buscaEm([usado]), antes).ok).toBe(false)
  })
})

describe('quem pode repor nesta aula', () => {
  it('um crédito por aluno, o que vence primeiro, só os elegíveis', () => {
    const aula = montarAula(turma(), SEXTA)
    const creditos = [
      credito({ id: 'b-longe', alunoId: 'b', validoAte: '2026-11-20' }),
      credito({ id: 'b-perto', alunoId: 'b', validoAte: '2026-10-20' }),
      credito({ id: 'c', alunoId: 'c', validoAte: '2026-10-15' }),
      credito({ id: 'outra', alunoId: 'd', unidadeId: 'u-jardim' }),
      credito({ id: 'fixo', alunoId: 'a1' }),
    ]
    expect(candidatosAReposicao(aula, creditos, antes.agora).map((c) => c.id)).toEqual(['c', 'b-perto'])
  })
})

describe('cancelar aula', () => {
  it('feriado: devolve créditos de reposição e, se pedido, dá crédito aos fixos', () => {
    const cRepos = { ...credito(), usadoEm: { turmaId: 't-sex-07', data: SEXTA } }
    const r0 = registro({
      turmaId: 't-sex-07',
      data: SEXTA,
      marcacoes: { a2: 'avisou' },
      reposicoes: { a9: cRepos.id },
    })
    const aula = montarAula(turma(), SEXTA, r0)
    const r = cancelarAula(aula, r0, { motivo: 'feriado', observacao: ' Dia da padroeira ', gerarCreditos: true }, buscaEm([cRepos]), antes)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const novo = r.valor.alteracoes.registros[0]
    expect(novo?.cancelamento).toEqual({ motivo: 'feriado', observacao: 'Dia da padroeira' })
    expect(novo?.reposicoes).toEqual({})
    expect(novo?.marcacoes).toEqual({ a2: 'avisou' })
    // a1, a3 e a4 ganham crédito (a2 já tinha avisado); a9 recebe o crédito de volta
    expect(r.valor.creditosGerados).toBe(3)
    const livre = r.valor.alteracoes.creditos.find((c) => c.id === cRepos.id)
    expect(livre?.usadoEm).toBeUndefined()
    expect(montarAula(turma(), SEXTA, novo).vagas).toBe(0)
  })

  it('sem crédito para os fixos quando o estúdio decide assim', () => {
    const aula = montarAula(turma(), SEXTA)
    const r = cancelarAula(aula, undefined, { motivo: 'estudio', observacao: '', gerarCreditos: false }, buscaEm([]), antes)
    expect(r.ok && r.valor.creditosGerados).toBe(0)
  })

  it('reabrir retira os créditos do cancelamento que ninguém usou', () => {
    const aula0 = montarAula(turma(), SEXTA)
    const cancelado = cancelarAula(aula0, undefined, { motivo: 'estudio', observacao: '', gerarCreditos: true }, buscaEm([]), antes)
    if (!cancelado.ok) throw new Error('deveria cancelar')
    const r1 = cancelado.valor.alteracoes.registros[0]
    const creditos = cancelado.valor.alteracoes.creditos
    const aula1 = montarAula(turma(), SEXTA, r1)
    const r = reabrirAula(aula1, r1, buscaEm(creditos), antes)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valor.registros[0]?.cancelamento).toBeUndefined()
    expect(r.valor.creditosRemovidos).toHaveLength(4)

    const usado = creditos.map((c, i) => (i === 0 ? { ...c, usadoEm: { turmaId: 'x', data: '2026-10-12' } } : c))
    expect(reabrirAula(aula1, r1, buscaEm(usado), antes)).toMatchObject({ ok: false, codigo: 'credito-ja-usado' })
  })
})

describe('central de reposição', () => {
  it('aulas com vaga para o crédito, só da unidade dele, até a validade', () => {
    const c = credito({ validoAte: '2026-10-16', criadoEm: '2026-10-08T12:00:00.000-03:00' })
    const sexta = turma()
    const cheia = turma({ id: 't-sex-08', inicio: '08:00', capacidade: 4 })
    const outraUnidade = turma({ id: 't-sex-09', inicio: '09:00', unidadeId: 'u-jardim', alunosFixos: [] })
    const aulasDoDia = (data: string) =>
      [sexta, cheia, outraUnidade].filter((t) => t.diaDaSemana === diaDaSemana(data)).map((t) => montarAula(t, data))
    const aulas = aulasParaEncaixe(c, aulasDoDia, { data: SEXTA, minutos: 6 * 60 })
    // sexta 9/10 e 16/10 às 7h; a das 8h está lotada e a das 9h é de outra unidade
    expect(aulas.map((a) => a.id)).toEqual(['t-sex-07_2026-10-09', 't-sex-07_2026-10-16'])
    // depois das 7h50 de hoje, a aula de hoje já terminou
    expect(aulasParaEncaixe(c, aulasDoDia, { data: SEXTA, minutos: 8 * 60 }).map((a) => a.data)).toEqual(['2026-10-16'])
    // janela de 3 dias: só hoje
    expect(aulasParaEncaixe(c, aulasDoDia, { data: SEXTA, minutos: 6 * 60 }, 3).map((a) => a.data)).toEqual([SEXTA])
  })

  it('separa créditos a vencer, vencidos e usados', () => {
    const r = resumoDeCreditos(
      [
        credito({ id: 'longe', validoAte: '2026-11-01' }),
        credito({ id: 'perto', validoAte: '2026-10-12' }),
        credito({ id: 'venceu', validoAte: '2026-10-08' }),
        credito({ id: 'venceu-antes', validoAte: '2026-10-01' }),
        credito({ id: 'usado', validoAte: '2026-10-20', usadoEm: { turmaId: 't', data: '2026-10-07' } }),
      ],
      SEXTA,
    )
    expect(r.disponiveis.map((c) => c.id)).toEqual(['perto', 'longe'])
    expect(r.aVencer.map((c) => c.id)).toEqual(['perto'])
    expect(r.vencidos.map((c) => c.id)).toEqual(['venceu', 'venceu-antes'])
    expect(r.usados.map((c) => c.id)).toEqual(['usado'])
  })

  it('crédito de cancelamento sai com o motivo certo', () => {
    const aula = montarAula(turma(), '2026-10-16')
    const r = cancelarAula(aula, undefined, { motivo: 'estudio', observacao: '', gerarCreditos: true }, buscaEm([]), antes)
    expect(r.ok && r.valor.alteracoes.creditos.every((c) => c.motivo === 'cancelamento')).toBe(true)
  })
})
