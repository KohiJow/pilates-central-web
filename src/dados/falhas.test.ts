import { describe, expect, it } from 'vitest'
import { acessoMudou, FRASE_REGRAS_VELHAS, FRASE_SEM_ACESSO, FRASE_SEM_REDE, fraseDaFalha, fraseDoErro, tipoDaFalha } from './falhas'

class ErroDoFirestore extends Error {
  constructor(
    readonly code: string,
    mensagem = '',
  ) {
    super(mensagem)
  }
}

describe('o que dizer quando a gravação não entra', () => {
  it('regras recusando é permissão; sem rede é rede; o resto é outra', () => {
    expect(tipoDaFalha(new ErroDoFirestore('permission-denied', 'Missing or insufficient permissions.'), true)).toBe('permissao')
    expect(tipoDaFalha(new ErroDoFirestore('unavailable', 'Failed to fetch'), true)).toBe('rede')
    expect(tipoDaFalha(new ErroDoFirestore('deadline-exceeded'), true)).toBe('rede')
    expect(tipoDaFalha(new TypeError('Load failed'), true)).toBe('rede')
    expect(tipoDaFalha(new Error('NetworkError when attempting to fetch resource.'), true)).toBe('rede')
    expect(tipoDaFalha(new Error('qualquer coisa'), false)).toBe('rede')
    expect(tipoDaFalha(new ErroDoFirestore('invalid-argument'), true)).toBe('outra')
    expect(tipoDaFalha('texto', true)).toBe('outra')
    // sem rede, a recusa das regras ainda é das regras (ela chegou do servidor)
    expect(tipoDaFalha(new ErroDoFirestore('permission-denied'), false)).toBe('permissao')
  })

  it('a frase explica o que fazer, e a recusa distingue conta e regras velhas', () => {
    expect(fraseDaFalha('rede')).toBe(FRASE_SEM_REDE)
    expect(fraseDaFalha('permissao', false)).toBe(FRASE_REGRAS_VELHAS)
    expect(fraseDaFalha('permissao', true)).toBe(FRASE_SEM_ACESSO)
    expect(fraseDaFalha('outra')).toBe('Não deu para salvar. Tente de novo.')
    // o que fazer, sem jargão: a administração publica as regras novas
    expect(FRASE_REGRAS_VELHAS).toContain('Peça para a administração publicar as regras novas.')
    expect(FRASE_SEM_ACESSO).toBe('Sua conta não tem esse acesso. Fale com a administração do estúdio.')
  })

  it('erro que já vem com a frase pronta (o adaptador do Firebase) mostra a frase dele', () => {
    const pronto = new Error('Esta pessoa ainda não entrou no app com o e-mail confirmado.')
    pronto.name = 'ErroDeConta'
    expect(tipoDaFalha(pronto, true)).toBe('conta')
    expect(fraseDoErro(pronto)).toBe('Esta pessoa ainda não entrou no app com o e-mail confirmado.')
    expect(fraseDoErro(new TypeError('Failed to fetch'))).toBe(FRASE_SEM_REDE)
    expect(fraseDoErro(new ErroDoFirestore('permission-denied'))).toBe(FRASE_REGRAS_VELHAS)
    expect(fraseDoErro(new ErroDoFirestore('permission-denied'), true)).toBe(FRASE_SEM_ACESSO)
  })

  it('o acesso mudou quando o papel, o ativo ou as unidades mudaram, ou quando a pessoa sumiu', () => {
    const eu = { ativo: true, papel: 'professor', unidades: ['u-centro', 'u-jardim'] }
    expect(acessoMudou(eu, { ...eu, unidades: ['u-jardim', 'u-centro'] })).toBe(false)
    expect(acessoMudou(eu, { ...eu, ativo: false })).toBe(true)
    expect(acessoMudou(eu, { ...eu, papel: 'administrador' })).toBe(true)
    expect(acessoMudou(eu, { ...eu, unidades: ['u-centro'] })).toBe(true)
    expect(acessoMudou(eu, undefined)).toBe(true)
  })
})
