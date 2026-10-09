import { describe, expect, it } from 'vitest'
import { CONFIGURACAO_PADRAO, validarConfiguracao } from './configuracao'

describe('configuração', () => {
  it('o padrão é válido', () => {
    expect(validarConfiguracao(CONFIGURACAO_PADRAO)).toEqual([])
  })

  it('aponta cada problema em português simples', () => {
    const erros = validarConfiguracao({
      nomeEstudio: ' ',
      whatsapp: '11 9999',
      validadeCreditoDias: 0,
      antecedenciaAvisoHoras: 100,
      capacidadePadrao: 1.5,
    })
    expect(erros).toHaveLength(5)
  })
})
