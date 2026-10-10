import { describe, expect, it } from 'vitest'
import { montarAula } from './agenda'
import { buscaEm, contexto, registro, turma } from './apoio-de-teste'
import {
  experimentaisSemCadastro,
  limparNome,
  MAXIMO_DE_EXPERIMENTAIS,
  registrarExperimental,
  tirarExperimental,
  validarExperimental,
  vincularAluno,
} from './aulaExperimental'
import { marcar } from './presenca'
import type { Experimental, RegistroAula } from './tipos'

const SEXTA = '2026-10-09'
const T = turma({ alunosFixos: ['a1', 'a2', 'a3'] })
const PESSOA = { nome: '  Joana   Prado ', telefone: '(11) 90000-0077' }
const DE_MANHA = contexto(SEXTA, '06:00')

describe('registrar quem vem experimentar', () => {
  it('entra na aula com vaga, ocupa um lugar e aparece na chamada', () => {
    const aula = montarAula(T, SEXTA)
    const r = registrarExperimental(aula, undefined, 'x-1', PESSOA, DE_MANHA)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valor.experimental).toEqual({ nome: 'Joana Prado', telefone: '5511900000077' })
    const [novo] = r.valor.alteracoes.registros
    expect(novo?.experimentais).toEqual({ 'x-1': { nome: 'Joana Prado', telefone: '5511900000077' } })
    expect(r.valor.alteracoes.creditos).toEqual([])
    const depois = montarAula(T, SEXTA, novo)
    expect(depois.participantes.at(-1)).toEqual({ alunoId: 'x-1', origem: 'experimental', experimental: r.valor.experimental })
    expect(depois.ocupadas).toBe(4)
    expect(depois.vagas).toBe(1)
  })

  it('recusa sem vaga, aula cancelada ou já terminada', () => {
    const cheia = montarAula(turma({ alunosFixos: ['a1', 'a2', 'a3', 'a4', 'a5'] }), SEXTA)
    expect(registrarExperimental(cheia, undefined, 'x-1', PESSOA, DE_MANHA)).toMatchObject({ ok: false, codigo: 'sem-vaga' })
    const cancelada = registro({ turmaId: T.id, data: SEXTA, cancelamento: { motivo: 'feriado', observacao: '' } })
    expect(registrarExperimental(montarAula(T, SEXTA, cancelada), cancelada, 'x-1', PESSOA, DE_MANHA)).toMatchObject({ ok: false, codigo: 'aula-cancelada' })
    expect(registrarExperimental(montarAula(T, SEXTA), undefined, 'x-1', PESSOA, contexto(SEXTA, '08:00'))).toMatchObject({ ok: false, codigo: 'aula-encerrada' })
  })

  it('pede nome e WhatsApp, e a mesma pessoa não entra duas vezes', () => {
    expect(validarExperimental({ nome: 'J', telefone: '' })).toEqual({ nome: 'Escreva o nome da pessoa.', telefone: 'Use DDD e número, por exemplo (19) 90000-0000.' })
    expect(validarExperimental(PESSOA)).toEqual({})
    const aula = montarAula(T, SEXTA)
    expect(registrarExperimental(aula, undefined, 'x-1', { nome: '', telefone: '11900000077' }, DE_MANHA)).toMatchObject({ ok: false, codigo: 'dados-invalidos' })
    const ja = registro({ turmaId: T.id, data: SEXTA, experimentais: { 'x-1': { nome: 'Joana Prado', telefone: '5511900000077' } } })
    expect(registrarExperimental(montarAula(T, SEXTA, ja), ja, 'x-2', PESSOA, DE_MANHA)).toMatchObject({ ok: false, codigo: 'nada-a-fazer' })
  })

  it('tem um teto por aula', () => {
    const experimentais: Record<string, Experimental> = {}
    for (let i = 0; i < MAXIMO_DE_EXPERIMENTAIS; i++) experimentais[`x-${i}`] = { nome: `Pessoa ${i}`, telefone: `551190000${String(i).padStart(4, '0')}` }
    const lotada = registro({ turmaId: turma({ alunosFixos: [], capacidade: 30 }).id, data: SEXTA, experimentais })
    const aula = montarAula(turma({ alunosFixos: [], capacidade: 30 }), SEXTA, lotada)
    expect(aula.ocupadas).toBe(MAXIMO_DE_EXPERIMENTAIS)
    expect(registrarExperimental(aula, lotada, 'x-mais', PESSOA, DE_MANHA)).toMatchObject({ ok: false, codigo: 'sem-vaga' })
  })

  it('o nome guardado não leva a barra nem a quebra de linha que o banco usa para separar', () => {
    expect(limparNome(' Ana|Lima\nSouza ')).toBe('Ana Lima Souza')
    expect(limparNome('a'.repeat(100))).toHaveLength(80)
  })
})

describe('quem veio experimentar na chamada', () => {
  const comPessoa = registro({ turmaId: T.id, data: SEXTA, experimentais: { 'x-1': { nome: 'Joana Prado', telefone: '5511900000077' } } })
  const aula = montarAula(T, SEXTA, comPessoa)

  it('recebe presença ou falta, nunca aviso (não há reposição por trás)', () => {
    const presente = marcar(aula, comPessoa, 'x-1', 'presente', buscaEm([]), contexto(SEXTA, '07:05'))
    expect(presente.ok).toBe(true)
    if (presente.ok) expect(presente.valor.alteracoes.registros[0]?.marcacoes).toEqual({ 'x-1': 'presente' })
    expect(marcar(aula, comPessoa, 'x-1', 'avisou', buscaEm([]), DE_MANHA)).toMatchObject({ ok: false, codigo: 'reposicao-nao-avisa' })
  })

  it('sai da aula enquanto ela não terminou, e some da chamada', () => {
    const r = tirarExperimental(aula, comPessoa, 'x-1', DE_MANHA)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const novo = r.valor.registros[0] as RegistroAula
    expect(novo).not.toHaveProperty('experimentais')
    expect(montarAula(T, SEXTA, novo).participantes.map((p) => p.alunoId)).toEqual(['a1', 'a2', 'a3'])
    expect(tirarExperimental(aula, comPessoa, 'x-1', contexto(SEXTA, '08:00'))).toMatchObject({ ok: false, codigo: 'aula-encerrada' })
    expect(tirarExperimental(aula, comPessoa, 'x-9', DE_MANHA)).toMatchObject({ ok: false, codigo: 'aluno-fora-da-aula' })
  })

  it('vira aluno: o registro passa a apontar para o cadastro e sai da lista de quem falta cadastrar', () => {
    expect(experimentaisSemCadastro(comPessoa).map(([id]) => id)).toEqual(['x-1'])
    const vinculado = vincularAluno(comPessoa, 'x-1', 'a-novo', '2026-10-09T13:00:00.000Z')
    expect(vinculado?.experimentais?.['x-1']).toEqual({ nome: 'Joana Prado', telefone: '5511900000077', alunoId: 'a-novo' })
    expect(experimentaisSemCadastro(vinculado ?? undefined)).toEqual([])
    // já vinculado ou inexistente: nada a fazer
    expect(vincularAluno(vinculado as RegistroAula, 'x-1', 'a-outro', 'x')).toBeNull()
    expect(vincularAluno(comPessoa, 'x-9', 'a-novo', 'x')).toBeNull()
  })
})
