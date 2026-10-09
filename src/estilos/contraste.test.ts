import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Confere o contraste das combinações que a interface usa, lendo as cores direto de tokens.css.
const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

function bloco(seletor: string): Record<string, string> {
  const inicio = css.indexOf(seletor)
  const abre = css.indexOf('{', inicio)
  const fecha = css.indexOf('}', abre)
  return Object.fromEntries([...css.slice(abre, fecha).matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]))
}

const claro = bloco(':root {')
const escuro = { ...claro, ...bloco(":root[data-theme='dark']") }

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return ((l1 ?? 0) + 0.05) / ((l2 ?? 0) + 0.05)
}

// texto (4,5:1 no mínimo)
const TEXTO: [string, string][] = [
  ['text', 'surface'],
  ['text', 'surface-raised'],
  ['text', 'surface-sunken'],
  ['text', 'surface-accent'],
  ['text-secondary', 'surface'],
  ['text-secondary', 'surface-raised'],
  ['text-secondary', 'surface-sunken'],
  ['text-secondary', 'surface-accent'],
  ['brand', 'surface'],
  ['brand', 'surface-raised'],
  ['brand', 'surface-sunken'],
  ['brand-strong', 'surface'],
  ['brand-strong', 'surface-raised'],
  ['text-on-brand', 'brand'],
  ['text-on-brand', 'brand-pressed'],
  ['brand', 'text-on-brand'],
  ['text-on-accent', 'surface-accent'],
  ['text-on-inverse', 'surface-inverse'],
  ['success', 'success-surface'],
  ['success', 'surface-raised'],
  ['warning', 'warning-surface'],
  ['danger', 'danger-surface'],
  ['danger', 'surface-raised'],
]

// ícones, pontos de vaga e bordas que identificam um controle (3:1 no mínimo)
const GRAFICO: [string, string][] = [
  ['brand-muted', 'surface'],
  ['brand-muted', 'surface-raised'],
  ['brand-muted', 'surface-sunken'],
  ['brand-muted', 'surface-accent'],
]

describe.each([
  ['claro', claro],
  ['escuro', escuro],
])('contraste no tema %s', (_nome, tema) => {
  it.each(TEXTO)('texto %s sobre %s passa de 4,5:1', (frente, fundo) => {
    expect(contraste(tema[frente] ?? '', tema[fundo] ?? '')).toBeGreaterThanOrEqual(4.5)
  })
  it.each(GRAFICO)('gráfico %s sobre %s passa de 3:1', (frente, fundo) => {
    expect(contraste(tema[frente] ?? '', tema[fundo] ?? '')).toBeGreaterThanOrEqual(3)
  })
})

describe('as regras do briefing continuam valendo', () => {
  it('âmbar não serve para texto e clay sobre pêssego só para ícone', () => {
    expect(contraste(claro['accent-amber'] ?? '', claro.surface ?? '')).toBeLessThan(3)
    expect(contraste(claro['brand-muted'] ?? '', claro['surface-accent'] ?? '')).toBeLessThan(4.5)
  })
})
