import { describe, expect, it } from 'vitest'
import { credito, registro } from '../dominio/apoio-de-teste'
import { inversoDe } from './desfazer'

const DIA = '2026-10-09'

describe('desfazer', () => {
  it('volta só o aluno que mudou, preservando o que outro mudou depois', () => {
    const antes = registro({ turmaId: 't', data: DIA, marcacoes: { a1: 'presente' } })
    const depois = registro({ turmaId: 't', data: DIA, marcacoes: { a1: 'presente', a2: 'avisou' } })
    const agora = registro({ turmaId: 't', data: DIA, marcacoes: { a1: 'faltou', a2: 'avisou', a3: 'presente' } })
    const c = credito({ id: 'cr-a2' })
    const inverso = inversoDe(
      { registros: [depois], creditos: [c], creditosRemovidos: [] },
      { registro: () => antes, credito: () => undefined },
      { registro: () => agora },
      'x',
    )
    expect(inverso.registros[0]?.marcacoes).toEqual({ a1: 'faltou', a3: 'presente' })
    expect(inverso.creditosRemovidos).toEqual(['cr-a2'])
    expect(inverso.creditos).toEqual([])
  })

  it('devolve o crédito removido e o estado anterior do crédito alterado', () => {
    const removido = credito({ id: 'velho' })
    const alterado = credito({ id: 'usado' })
    const inverso = inversoDe(
      {
        registros: [registro({ turmaId: 't', data: DIA, reposicoes: { a9: 'usado' } })],
        creditos: [{ ...alterado, usadoEm: { turmaId: 't', data: DIA } }],
        creditosRemovidos: ['velho'],
      },
      { registro: () => undefined, credito: (id) => (id === 'velho' ? removido : id === 'usado' ? alterado : undefined) },
      { registro: () => undefined },
      'x',
    )
    expect(inverso.registros[0]?.reposicoes).toEqual({})
    expect(inverso.creditos.map((c) => c.id).sort()).toEqual(['usado', 'velho'])
    expect(inverso.creditos.find((c) => c.id === 'usado')?.usadoEm).toBeUndefined()
  })

  it('desfaz o registro de quem veio experimentar, sem mexer em quem outra pessoa registrou', () => {
    const joana = { nome: 'Joana Prado', telefone: '5511900000077' }
    const depois = registro({ turmaId: 't', data: DIA, experimentais: { 'x-1': joana } })
    const agora = registro({ turmaId: 't', data: DIA, experimentais: { 'x-1': joana, 'x-2': { nome: 'Outra Pessoa', telefone: '5511900000078' } } })
    const inverso = inversoDe(
      { registros: [depois], creditos: [], creditosRemovidos: [] },
      { registro: () => undefined, credito: () => undefined },
      { registro: () => agora },
      'x',
    )
    expect(inverso.registros[0]?.experimentais).toEqual({ 'x-2': { nome: 'Outra Pessoa', telefone: '5511900000078' } })
    // tirar a pessoa e desfazer: ela volta
    const semEla = registro({ turmaId: 't', data: DIA })
    const volta = inversoDe(
      { registros: [semEla], creditos: [], creditosRemovidos: [] },
      { registro: () => depois, credito: () => undefined },
      { registro: () => semEla },
      'x',
    )
    expect(volta.registros[0]?.experimentais).toEqual({ 'x-1': joana })
  })

  it('desfaz cancelamento de aula', () => {
    const depois = registro({ turmaId: 't', data: DIA, cancelamento: { motivo: 'feriado', observacao: '' } })
    const inverso = inversoDe(
      { registros: [depois], creditos: [], creditosRemovidos: [] },
      { registro: () => undefined, credito: () => undefined },
      { registro: () => depois },
      'x',
    )
    expect(inverso.registros[0]?.cancelamento).toBeUndefined()
  })
})
