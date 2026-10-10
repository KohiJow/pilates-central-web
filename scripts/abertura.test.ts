import { describe, expect, it } from 'vitest'
import { arquivoDeAbertura, linksDeAbertura, TAMANHOS_DE_ABERTURA } from './abertura.ts'

describe('telas de abertura do iPhone', () => {
  it('uma imagem por tamanho e por tema, com o nome em pixels de verdade', () => {
    const primeiro = TAMANHOS_DE_ABERTURA[0]
    expect(primeiro).toBeDefined()
    if (!primeiro) return
    expect(arquivoDeAbertura(primeiro, 'claro')).toBe('abertura/750x1334.png')
    expect(arquivoDeAbertura(primeiro, 'escuro')).toBe('abertura/750x1334-escuro.png')
    // tamanhos sem repetição (o iOS escolhe pela mídia exata; dois iguais seriam um desperdício)
    const chaves = TAMANHOS_DE_ABERTURA.map((t) => `${t.largura}x${t.altura}@${t.escala}`)
    expect(new Set(chaves).size).toBe(chaves.length)
  })

  it('as <link> levam o caminho base e a mídia exata do aparelho, nos dois temas', () => {
    const links = linksDeAbertura('/pilates-central-web/')
    expect(links).toHaveLength(TAMANHOS_DE_ABERTURA.length * 2)
    const dos390 = links.filter((l) => l.includes('(device-width: 390px)'))
    expect(dos390).toHaveLength(2)
    expect(dos390[0]).toContain('rel="apple-touch-startup-image"')
    expect(dos390[0]).toContain('(device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)')
    expect(dos390[0]).toContain('href="/pilates-central-web/abertura/1170x2532.png"')
    expect(dos390[1]).toContain('(prefers-color-scheme: dark)')
    expect(dos390[1]).toContain('href="/pilates-central-web/abertura/1170x2532-escuro.png"')
    // na raiz do domínio, o caminho é só a barra
    expect(linksDeAbertura('/')[0]).toContain('href="/abertura/')
  })
})
