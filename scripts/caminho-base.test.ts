import { describe, expect, it } from 'vitest'
import { CAMINHO_BASE_PADRAO, caminhoBase } from './caminho-base.ts'

describe('caminho base do site', () => {
  it('sem BASE_PATH vale o padrão do repositório de hoje', () => {
    expect(caminhoBase(undefined)).toBe('/pilates-central-web/')
    expect(caminhoBase('')).toBe(CAMINHO_BASE_PADRAO)
    expect(caminhoBase('   ')).toBe(CAMINHO_BASE_PADRAO)
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
