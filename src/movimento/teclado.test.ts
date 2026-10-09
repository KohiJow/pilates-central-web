import { describe, expect, it } from 'vitest'
import { coberturaDoTeclado } from './teclado'

describe('teclado', () => {
  it('mede o pedaço do pé da tela que o teclado cobre', () => {
    // iPhone 13: janela de 844, teclado de 336
    expect(coberturaDoTeclado(844, { height: 508, offsetTop: 0, scale: 1 })).toBe(336)
    // o Safari rolou a janela visual para mostrar o campo: a folha vai até onde se vê
    expect(coberturaDoTeclado(844, { height: 508, offsetTop: 120, scale: 1 })).toBe(216)
  })

  it('sem teclado, barra do navegador mexendo ou zoom de pinça: nada a compensar', () => {
    expect(coberturaDoTeclado(844, { height: 844, offsetTop: 0, scale: 1 })).toBe(0)
    expect(coberturaDoTeclado(844, { height: 800, offsetTop: 0, scale: 1 })).toBe(0)
    expect(coberturaDoTeclado(844, { height: 422, offsetTop: 200, scale: 2 })).toBe(0)
    // se o navegador já encolheu a página junto com o teclado, a conta dá zero
    expect(coberturaDoTeclado(508, { height: 508, offsetTop: 0, scale: 1 })).toBe(0)
  })
})
