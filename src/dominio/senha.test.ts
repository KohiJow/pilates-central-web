import { describe, expect, it } from 'vitest'
import { forcaDaSenha, SENHA_MINIMA } from './senha'

describe('força da senha', () => {
  it('menos de 8 caracteres não serve e diz quantos faltam', () => {
    expect(SENHA_MINIMA).toBe(8)
    expect(forcaDaSenha('')).toEqual({ nivel: 0, rotulo: 'Curta demais', dica: 'Faltam 8 caracteres.' })
    expect(forcaDaSenha('abcdefg')).toMatchObject({ nivel: 0, dica: 'Faltam 1 caractere.' })
  })

  it('não exige símbolo: letras minúsculas compridas já são fortes', () => {
    expect(forcaDaSenha('gato no sofa de manha').nivel).toBe(3)
    expect(forcaDaSenha('cadeiraverde12').nivel).toBe(3)
  })

  it('senhas de todo mundo e sem variedade são fracas mesmo com 8 ou mais', () => {
    for (const s of ['12345678', 'password', 'Senha123', 'aaaaaaaa', 'abababab', 'abcdefghij', '87654321']) {
      expect(forcaDaSenha(s).nivel, s).toBe(1)
    }
  })

  it('8 caracteres com uma classe só é fraca; com variedade ou mais comprida fica boa', () => {
    expect(forcaDaSenha('girassol').nivel).toBe(1)
    expect(forcaDaSenha('girassol7').nivel).toBe(2)
    expect(forcaDaSenha('girassolazul').nivel).toBe(2)
    expect(forcaDaSenha('Girassol7!').nivel).toBe(3)
  })
})
