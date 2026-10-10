import { describe, expect, it } from 'vitest'
import { enderecoDeScriptPermitido, enderecosDeScriptPermitidos } from './confianca'

describe('política de confiança (Trusted Types)', () => {
  const origem = 'https://kohijow.github.io'
  const base = '/pilates-central-web/'
  const pagina = `${origem}${base}#/hoje`

  it('sem App Check, só o service worker do próprio site carrega por endereço', () => {
    const permitidos = enderecosDeScriptPermitidos(origem, base, false)
    expect(permitidos).toEqual(['https://kohijow.github.io/pilates-central-web/sw.js'])
    expect(enderecoDeScriptPermitido('https://kohijow.github.io/pilates-central-web/sw.js', permitidos, pagina)).toBe(true)
    expect(enderecoDeScriptPermitido('https://kohijow.github.io/pilates-central-web/sw.js?v=2', permitidos, pagina)).toBe(true)
    expect(enderecoDeScriptPermitido('https://kohijow.github.io/pilates-central-web/sw.js.evil/x', permitidos, pagina)).toBe(false)
    expect(enderecoDeScriptPermitido('https://kohijow.github.io/outro/sw.js', permitidos, pagina)).toBe(false)
    expect(enderecoDeScriptPermitido('https://www.google.com/recaptcha/api.js', permitidos, pagina)).toBe(false)
  })

  it('o caminho relativo com que o app registra o service worker é resolvido contra a página', () => {
    const permitidos = enderecosDeScriptPermitidos(origem, base, false)
    expect(enderecoDeScriptPermitido('/pilates-central-web/sw.js', permitidos, pagina)).toBe(true)
    expect(enderecoDeScriptPermitido('sw.js', permitidos, pagina)).toBe(true)
    expect(enderecoDeScriptPermitido('../sw.js', permitidos, pagina)).toBe(false)
    expect(enderecoDeScriptPermitido('//evil.example.com/pilates-central-web/sw.js', permitidos, pagina)).toBe(false)
    expect(enderecoDeScriptPermitido('/pilates-central-web/sw.js', permitidos, 'https://evil.example.com/')).toBe(false)
  })

  it('com o site na raiz do domínio, o service worker fica na raiz', () => {
    const permitidos = enderecosDeScriptPermitidos('https://pilates-central.github.io', '/', false)
    expect(permitidos).toEqual(['https://pilates-central.github.io/sw.js'])
    expect(enderecoDeScriptPermitido('/sw.js', permitidos, 'https://pilates-central.github.io/#/hoje')).toBe(true)
    expect(enderecoDeScriptPermitido('/outro/sw.js', permitidos, 'https://pilates-central.github.io/')).toBe(false)
  })

  it('com App Check, o reCAPTCHA entra e nada mais', () => {
    const permitidos = enderecosDeScriptPermitidos(origem, base, true)
    expect(enderecoDeScriptPermitido('https://www.google.com/recaptcha/api.js?render=chave', permitidos, pagina)).toBe(true)
    expect(enderecoDeScriptPermitido('https://www.gstatic.com/recaptcha/releases/abc/recaptcha__pt_br.js', permitidos, pagina)).toBe(true)
    expect(enderecoDeScriptPermitido('https://www.google.com/outra/coisa.js', permitidos, pagina)).toBe(false)
    expect(enderecoDeScriptPermitido('https://evil.example.com/recaptcha/api.js', permitidos, pagina)).toBe(false)
  })
})
