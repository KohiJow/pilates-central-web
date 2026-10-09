import { describe, expect, it } from 'vitest'
import { montarAula } from './agenda'
import { buscaEm, contexto, credito, registro, turma } from './apoio-de-teste'
import { concederCredito, contarMarcacoes, marcar, marcarTodosPresentes } from './presenca'

const SEXTA = '2026-10-09'
const semCreditos = buscaEm([])

describe('marcar presença', () => {
  it('marca presente no dia da aula e guarda só a exceção', () => {
    const aula = montarAula(turma(), SEXTA)
    const r = marcar(aula, undefined, 'a1', 'presente', semCreditos, contexto(SEXTA, '07:05'))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const [novo] = r.valor.alteracoes.registros
    expect(novo?.id).toBe('t-sex-07_2026-10-09')
    expect(novo?.marcacoes).toEqual({ a1: 'presente' })
    expect(r.valor.alteracoes.creditos).toEqual([])
  })

  it('não deixa marcar presença antes do dia da aula', () => {
    const aula = montarAula(turma(), SEXTA)
    const r = marcar(aula, undefined, 'a1', 'presente', semCreditos, contexto('2026-10-08', '20:00'))
    expect(r).toMatchObject({ ok: false, codigo: 'aula-no-futuro' })
  })

  it('recusa aluno que não está na aula e aula cancelada', () => {
    const aula = montarAula(turma(), SEXTA)
    expect(marcar(aula, undefined, 'zz', 'presente', semCreditos, contexto(SEXTA, '07:00'))).toMatchObject({
      ok: false,
      codigo: 'aluno-fora-da-aula',
    })
    const cancelada = registro({ turmaId: 't-sex-07', data: SEXTA, cancelamento: { motivo: 'feriado', observacao: '' } })
    const aulaCancelada = montarAula(turma(), SEXTA, cancelada)
    expect(marcar(aulaCancelada, cancelada, 'a1', 'presente', semCreditos, contexto(SEXTA, '07:00'))).toMatchObject({
      ok: false,
      codigo: 'aula-cancelada',
    })
  })

  it('não altera o registro recebido (tudo imutável)', () => {
    const original = registro({ turmaId: 't-sex-07', data: SEXTA, marcacoes: { a1: 'presente' } })
    const aula = montarAula(turma(), SEXTA, original)
    const r = marcar(aula, original, 'a2', 'faltou', semCreditos, contexto(SEXTA, '08:00'))
    expect(r.ok).toBe(true)
    expect(original.marcacoes).toEqual({ a1: 'presente' })
  })

  it('marcar de novo a mesma coisa não faz nada', () => {
    const r0 = registro({ turmaId: 't-sex-07', data: SEXTA, marcacoes: { a1: 'presente' } })
    const aula = montarAula(turma(), SEXTA, r0)
    expect(marcar(aula, r0, 'a1', 'presente', semCreditos, contexto(SEXTA, '08:00'))).toMatchObject({
      ok: false,
      codigo: 'nada-a-fazer',
    })
  })

  it('null desmarca', () => {
    const r0 = registro({ turmaId: 't-sex-07', data: SEXTA, marcacoes: { a1: 'presente' } })
    const aula = montarAula(turma(), SEXTA, r0)
    const r = marcar(aula, r0, 'a1', null, semCreditos, contexto(SEXTA, '08:00'))
    expect(r.ok && r.valor.alteracoes.registros[0]?.marcacoes).toEqual({})
  })
})

describe('avisar falta', () => {
  it('no prazo gera crédito de reposição com validade', () => {
    const aula = montarAula(turma(), SEXTA)
    const r = marcar(aula, undefined, 'a2', 'avisou', semCreditos, contexto('2026-10-08', '18:00'))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valor.avisoForaDoPrazo).toBe(false)
    expect(r.valor.creditoGerado).toMatchObject({
      id: 'cr_a2_t-sex-07_2026-10-09',
      alunoId: 'a2',
      unidadeId: 'u-centro',
      origem: { turmaId: 't-sex-07', data: SEXTA },
      validoAte: '2026-11-08',
    })
    expect(r.valor.alteracoes.creditos).toHaveLength(1)
  })

  it('exatamente no limite da antecedência ainda vale', () => {
    const aula = montarAula(turma(), SEXTA)
    const r = marcar(aula, undefined, 'a2', 'avisou', semCreditos, contexto(SEXTA, '04:00'))
    expect(r.ok && r.valor.creditoGerado).toBeTruthy()
  })

  it('em cima da hora fica registrado, mas sem crédito', () => {
    const aula = montarAula(turma(), SEXTA)
    const r = marcar(aula, undefined, 'a2', 'avisou', semCreditos, contexto(SEXTA, '06:30'))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valor.avisoForaDoPrazo).toBe(true)
    expect(r.valor.creditoGerado).toBeUndefined()
    expect(r.valor.alteracoes.registros[0]?.marcacoes).toEqual({ a2: 'avisou' })
  })

  it('depois que a aula terminou, não é aviso: é falta', () => {
    const aula = montarAula(turma(), SEXTA)
    expect(marcar(aula, undefined, 'a2', 'avisou', semCreditos, contexto(SEXTA, '09:00'))).toMatchObject({
      ok: false,
      codigo: 'aula-encerrada',
    })
  })

  it('quem está repondo não gera outro crédito', () => {
    const r0 = registro({ turmaId: 't-sex-07', data: SEXTA, reposicoes: { a9: 'cr-x' } })
    const aula = montarAula(turma(), SEXTA, r0)
    expect(marcar(aula, r0, 'a9', 'avisou', semCreditos, contexto('2026-10-08', '10:00'))).toMatchObject({
      ok: false,
      codigo: 'reposicao-nao-avisa',
    })
  })

  it('tirar o aviso devolve o crédito ainda não usado', () => {
    const r0 = registro({ turmaId: 't-sex-07', data: SEXTA, marcacoes: { a2: 'avisou' } })
    const c = credito({ id: 'cr_a2_t-sex-07_2026-10-09', alunoId: 'a2', origem: { turmaId: 't-sex-07', data: SEXTA } })
    const aula = montarAula(turma(), SEXTA, r0)
    const r = marcar(aula, r0, 'a2', 'presente', buscaEm([c]), contexto(SEXTA, '07:10'))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valor.alteracoes.creditosRemovidos).toEqual([c.id])
    expect(r.valor.alteracoes.registros[0]?.marcacoes).toEqual({ a2: 'presente' })
  })

  it('se o crédito já foi usado, não deixa tirar o aviso', () => {
    const r0 = registro({ turmaId: 't-sex-07', data: SEXTA, marcacoes: { a2: 'avisou' } })
    const c = credito({
      id: 'cr_a2_t-sex-07_2026-10-09',
      alunoId: 'a2',
      origem: { turmaId: 't-sex-07', data: SEXTA },
      usadoEm: { turmaId: 't-seg-07', data: '2026-10-05' },
    })
    const aula = montarAula(turma(), SEXTA, r0)
    const r = marcar(aula, r0, 'a2', null, buscaEm([c]), contexto(SEXTA, '07:10'))
    expect(r).toMatchObject({ ok: false, codigo: 'credito-ja-usado' })
    expect(!r.ok && r.mensagem).toContain('5/10')
  })

  it('a dona pode dar crédito a quem avisou fora do prazo, uma vez só', () => {
    const r0 = registro({ turmaId: 't-sex-07', data: SEXTA, marcacoes: { a2: 'avisou' } })
    const aula = montarAula(turma(), SEXTA, r0)
    const r = concederCredito(aula, 'a2', semCreditos, contexto(SEXTA, '06:50'))
    expect(r.ok && r.valor.creditoGerado.validoAte).toBe('2026-11-08')
    const jaTem = buscaEm([credito({ id: 'cr_a2_t-sex-07_2026-10-09' })])
    expect(concederCredito(aula, 'a2', jaTem, contexto(SEXTA, '06:50')).ok).toBe(false)
    expect(concederCredito(aula, 'a1', semCreditos, contexto(SEXTA, '06:50')).ok).toBe(false)
  })
})

describe('todos presentes num toque', () => {
  it('marca só quem está sem marcação', () => {
    const r0 = registro({ turmaId: 't-sex-07', data: SEXTA, marcacoes: { a2: 'avisou', a3: 'faltou' } })
    const aula = montarAula(turma(), SEXTA, r0)
    const r = marcarTodosPresentes(aula, r0, contexto(SEXTA, '07:01'))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valor.quantidade).toBe(2)
    expect(r.valor.alunos).toEqual(['a1', 'a4'])
    expect(r.valor.alteracoes.registros[0]?.marcacoes).toEqual({ a1: 'presente', a2: 'avisou', a3: 'faltou', a4: 'presente' })
  })

  it('avisa quando não há ninguém para marcar', () => {
    const r0 = registro({
      turmaId: 't-sex-07',
      data: SEXTA,
      marcacoes: { a1: 'presente', a2: 'presente', a3: 'presente', a4: 'presente' },
    })
    const aula = montarAula(turma(), SEXTA, r0)
    expect(marcarTodosPresentes(aula, r0, contexto(SEXTA, '07:30'))).toMatchObject({ ok: false, codigo: 'nada-a-fazer' })
  })

  it('não marca aula de amanhã', () => {
    const aula = montarAula(turma(), SEXTA)
    expect(marcarTodosPresentes(aula, undefined, contexto('2026-10-08', '07:30'))).toMatchObject({
      ok: false,
      codigo: 'aula-no-futuro',
    })
  })

  it('conta as marcações para o resumo da chamada', () => {
    const r0 = registro({ turmaId: 't-sex-07', data: SEXTA, marcacoes: { a1: 'presente', a2: 'avisou' } })
    expect(contarMarcacoes(montarAula(turma(), SEXTA, r0))).toEqual({ presente: 1, faltou: 0, avisou: 1, pendente: 2 })
  })
})
