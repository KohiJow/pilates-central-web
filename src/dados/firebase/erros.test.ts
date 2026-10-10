import { describe, expect, it } from 'vitest'
import { codigoDoErro, erroDeConta, ErroDeConta, fraseDoCodigo, fraseGenerica } from './erros'

const erroDoSdk = (code: string, message = `Firebase: Error (${code}).`) => Object.assign(new Error(message), { code })

describe('erros do login em português', () => {
  it('Authentication não iniciado no console: diz exatamente o que falta', () => {
    for (const codigo of ['auth/configuration-not-found', 'auth/operation-not-allowed', 'auth/admin-restricted-operation']) {
      const e = erroDeConta(erroDoSdk(codigo), 'criar')
      expect(e.message).toContain('O login por e-mail e senha ainda não foi ativado no Firebase deste projeto')
      expect(e.message).toContain('docs/firebase.md')
      expect(e.codigo).toBe(codigo)
    }
  })

  it('rede, tentativas demais, domínio, chave, e-mail e senha fraca têm frase própria', () => {
    expect(fraseDoCodigo('auth/network-request-failed', 'entrar')).toMatch(/Sem conexão/)
    expect(fraseDoCodigo('auth/too-many-requests', 'entrar')).toMatch(/Muitas tentativas/)
    expect(fraseDoCodigo('auth/unauthorized-domain', 'entrar')).toMatch(/Domínios autorizados/)
    expect(fraseDoCodigo('auth/unauthorized-continue-uri', 'senhaNova')).toMatch(/Domínios autorizados/)
    expect(fraseDoCodigo('auth/invalid-email', 'entrar')).toMatch(/Confira o e-mail/)
    expect(fraseDoCodigo('auth/weak-password', 'criar')).toMatch(/pelo menos 8/)
    expect(fraseDoCodigo('auth/password-does-not-meet-requirements', 'criar')).toMatch(/pelo menos 8/)
    expect(fraseDoCodigo('auth/api-key-not-valid.-please-pass-a-valid-api-key.', 'entrar')).toMatch(/chave do projeto/)
    expect(fraseDoCodigo('auth/quota-exceeded', 'reenviar')).toMatch(/limite de e-mails/)
  })

  it('a frase nunca mostra o código bruto; ele fica em detalhe', () => {
    const e = erroDeConta(erroDoSdk('auth/too-many-requests'), 'entrar')
    expect(e.message).not.toContain('auth/')
    expect(e.detalhe).toContain('auth/too-many-requests')
    expect(e.detalhe).toContain('Firebase: Error')
  })

  it('entrar: senha errada, e-mail sem conta e credencial inválida respondem igual', () => {
    const frases = ['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'].map((c) =>
      erroDeConta(erroDoSdk(c), 'entrar').message,
    )
    expect(new Set(frases).size).toBe(1)
    expect(frases[0]).toBe('E-mail ou senha não conferem.')
  })

  it('criar: e-mail já usado e a recusa genérica (proteção contra enumeração) respondem igual', () => {
    const jaUsado = erroDeConta(erroDoSdk('auth/email-already-in-use'), 'criar').message
    const generica = erroDeConta(erroDoSdk('auth/invalid-credential'), 'criar').message
    const semCodigo = erroDeConta(new Error('x'), 'criar').message
    expect(jaUsado).toBe(generica)
    expect(jaUsado).toBe(semCodigo)
    expect(jaUsado).toMatch(/Já tenho conta/)
  })

  it('trocar a senha: a senha atual errada e a sessão antiga têm frases claras', () => {
    expect(fraseDoCodigo('auth/invalid-credential', 'trocarSenha')).toBe('A senha atual não confere.')
    expect(fraseDoCodigo('auth/requires-recent-login', 'trocarSenha')).toMatch(/saia e entre de novo/)
  })

  it('sem código: frase genérica da operação, com o que o erro disse em detalhe', () => {
    const e = erroDeConta(new TypeError('Failed to fetch'), 'reenviar')
    expect(e.message).toBe(fraseGenerica('reenviar'))
    expect(e.codigo).toBe('')
    expect(e.detalhe).toBe('Failed to fetch')
    expect(codigoDoErro(null)).toBe('')
    expect(codigoDoErro({ code: 7 })).toBe('')
  })

  it('um ErroDeConta passa adiante como está', () => {
    const pronto = new ErroDeConta('Frase pronta.', 'x/y')
    expect(erroDeConta(pronto, 'entrar')).toBe(pronto)
    expect(pronto.detalhe).toBe('x/y')
  })
})
