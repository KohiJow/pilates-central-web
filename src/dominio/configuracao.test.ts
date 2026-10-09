import { describe, expect, it } from 'vitest'
import { completarConfiguracao, CONFIGURACAO_PADRAO, textoDasRegras, validarConfiguracao } from './configuracao'

describe('configuração', () => {
  it('o padrão é válido', () => {
    expect(validarConfiguracao(CONFIGURACAO_PADRAO)).toEqual({})
  })

  it('aponta cada problema no campo certo, em português simples', () => {
    const erros = validarConfiguracao({
      nomeEstudio: ' ',
      whatsapp: '11 9999',
      validadeCreditoDias: 0,
      antecedenciaAvisoHoras: 100,
      limiteReposicoesMes: -1,
      alertaAusenciasSeguidas: 1,
      capacidadePadrao: 1.5,
    })
    expect(Object.keys(erros).sort()).toEqual([
      'alertaAusenciasSeguidas',
      'antecedenciaAvisoHoras',
      'capacidadePadrao',
      'limiteReposicoesMes',
      'nomeEstudio',
      'validadeCreditoDias',
      'whatsapp',
    ])
    expect(erros.whatsapp).toBe('Use DDD e número, por exemplo (19) 90000-0000.')
  })

  it('aceita o WhatsApp como a pessoa digita', () => {
    expect(validarConfiguracao({ ...CONFIGURACAO_PADRAO, whatsapp: '(19) 90000-0000' })).toEqual({})
  })

  it('completa configuração antiga com os campos novos', () => {
    const antiga = { nomeEstudio: 'X', whatsapp: '', validadeCreditoDias: 15, antecedenciaAvisoHoras: 2, capacidadePadrao: 5 }
    expect(completarConfiguracao(antiga)).toMatchObject({ validadeCreditoDias: 15, limiteReposicoesMes: 0, alertaAusenciasSeguidas: 3 })
  })

  it('explica as regras para quem não pode mudar', () => {
    expect(textoDasRegras(CONFIGURACAO_PADRAO)).toBe(
      'Avisar a falta com 3 horas de antecedência dá direito a uma reposição, que vale 30 dias.',
    )
    expect(textoDasRegras({ ...CONFIGURACAO_PADRAO, antecedenciaAvisoHoras: 1, limiteReposicoesMes: 2 })).toBe(
      'Avisar a falta com 1 hora de antecedência dá direito a uma reposição, que vale 30 dias. Até 2 reposições por mês.',
    )
  })
})
