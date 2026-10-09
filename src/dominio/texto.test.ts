import { describe, expect, it } from 'vitest'
import { iniciais, linkDoWhatsApp, listaFalada, nomeCurto, normalizar, plural, primeiroNome, telefoneLegivel } from './texto'

describe('texto da interface', () => {
  it('nomes', () => {
    expect(primeiroNome('  Ana Souza ')).toBe('Ana')
    expect(nomeCurto('Ana Maria Souza')).toBe('Ana S.')
    expect(nomeCurto('Ana')).toBe('Ana')
    expect(iniciais('Ana Maria Souza')).toBe('AS')
    expect(iniciais('bia')).toBe('B')
  })

  it('busca sem acento', () => {
    expect(normalizar(' Conceição ')).toBe('conceicao')
  })

  it('telefone e WhatsApp', () => {
    expect(telefoneLegivel('5511900000012')).toBe('(11) 90000-0012')
    expect(telefoneLegivel('1133334444')).toBe('(11) 3333-4444')
    expect(linkDoWhatsApp('5511900000012', 'Oi, tudo bem?')).toBe('https://wa.me/5511900000012?text=Oi%2C%20tudo%20bem%3F')
  })

  it('plural e listas faladas', () => {
    expect(plural(1, 'vaga')).toBe('1 vaga')
    expect(plural(0, 'vaga')).toBe('0 vagas')
    expect(plural(2, 'reposição', 'reposições')).toBe('2 reposições')
    expect(listaFalada([])).toBe('')
    expect(listaFalada(['Ana'])).toBe('Ana')
    expect(listaFalada(['Ana', 'Bia', 'Caio'])).toBe('Ana, Bia e Caio')
  })
})
