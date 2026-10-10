import { describe, expect, it } from 'vitest'
import { CAMINHO_BASE_PADRAO, caminhoBase } from './caminho-base.ts'

/** Roda `teste` com BASE_PATH valendo `valor` no ambiente (ou ausente), e devolve o que estava. */
function comBasePathNoAmbiente(valor: string | undefined, teste: () => void) {
  const guardado = process.env.BASE_PATH
  if (valor === undefined) delete process.env.BASE_PATH
  else process.env.BASE_PATH = valor
  try {
    teste()
  } finally {
    if (guardado === undefined) delete process.env.BASE_PATH
    else process.env.BASE_PATH = guardado
  }
}

describe('caminho base do site', () => {
  it('sem BASE_PATH vale o padrão do repositório de hoje', () => {
    // sem argumento, a função lê o ambiente: o teste tira a variável de lá (passar undefined de
    // propósito cairia no parâmetro padrão, que também lê o ambiente, e o teste dependeria de
    // como a suíte foi chamada)
    comBasePathNoAmbiente(undefined, () => expect(caminhoBase()).toBe('/pilates-central-web/'))
    expect(caminhoBase('')).toBe(CAMINHO_BASE_PADRAO)
    expect(caminhoBase('   ')).toBe(CAMINHO_BASE_PADRAO)
  })

  it('com BASE_PATH no ambiente, lê dela (é assim que o workflow publica na raiz)', () => {
    comBasePathNoAmbiente('/', () => expect(caminhoBase()).toBe('/'))
    comBasePathNoAmbiente('outro-nome', () => expect(caminhoBase()).toBe('/outro-nome/'))
  })

  it('a raiz do site (repositório <alguem>.github.io) é só a barra', () => {
    expect(caminhoBase('/')).toBe('/')
    expect(caminhoBase(' / ')).toBe('/')
    expect(caminhoBase('//')).toBe('/')
  })

  it('qualquer outro nome fica entre barras, como o Vite espera', () => {
    expect(caminhoBase('pilates-central-web')).toBe('/pilates-central-web/')
    expect(caminhoBase('/pilates-central-web')).toBe('/pilates-central-web/')
    expect(caminhoBase('pilates-central-web/')).toBe('/pilates-central-web/')
    expect(caminhoBase('/outro/')).toBe('/outro/')
  })
})
