import { describe, expect, it, vi } from 'vitest'

// modo.ts lê location e localStorage ao ser importado: no Node, um endereço publicado de mentira
vi.stubGlobal('location', { hostname: 'kohijow.github.io', search: '?emulador=1' })

const { decidirEmulador, usaEmulador } = await import('./modo')

describe('emuladores do Firebase', () => {
  it('no site publicado nunca ligam, nem com ?emulador=1', () => {
    expect(usaEmulador).toBe(false)
    expect(decidirEmulador('kohijow.github.io', '1', 'demo-pilates')).toBeNull()
  })

  it('em localhost, só com o pedido explícito (que fica guardado até ?emulador=0)', () => {
    expect(decidirEmulador('127.0.0.1', null, null)).toBeNull()
    expect(decidirEmulador('127.0.0.1', '1', null)).toBe('demo-pilates')
    expect(decidirEmulador('localhost', null, 'demo-pilates')).toBe('demo-pilates')
    expect(decidirEmulador('localhost', '0', 'demo-pilates')).toBeNull()
  })

  it('outro projeto só se for de teste (demo-)', () => {
    expect(decidirEmulador('127.0.0.1', 'demo-pilates-vazio', null)).toBe('demo-pilates-vazio')
    expect(decidirEmulador('127.0.0.1', 'pilates-de-verdade', null)).toBeNull()
    expect(decidirEmulador('127.0.0.1', null, 'pilates-de-verdade')).toBeNull()
  })
})
