import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { LINEAR_SUAVE, LINEAR_VIVA, MOLA_SUAVE, MOLA_VIVA, molaEmLinear, simularMola } from './mola'

describe('molas em linear()', () => {
  it('começa em 0 e termina em 1', () => {
    for (const mola of [MOLA_SUAVE, MOLA_VIVA]) {
      const v = simularMola(mola)
      expect(v[0]).toBe(0)
      expect(v.at(-1)).toBe(1)
    }
  })

  it('a suave não passa do ponto; a viva repica um pouco (menos de 10%)', () => {
    expect(Math.max(...simularMola(MOLA_SUAVE))).toBeLessThanOrEqual(1.0005)
    const pico = Math.max(...simularMola(MOLA_VIVA))
    expect(pico).toBeGreaterThan(1.01)
    expect(pico).toBeLessThan(1.1)
  })

  it('gera texto linear() válido', () => {
    expect(molaEmLinear(MOLA_SUAVE, 4)).toMatch(/^linear\(0, [\d.]+, [\d.]+, [\d.]+, 1\)$/)
  })

  it('o CSS usa exatamente as mesmas molas do código', () => {
    const css = readFileSync(new URL('../estilos/movimento.css', import.meta.url), 'utf8')
    expect(css).toContain(`--mola-suave: ${LINEAR_SUAVE};`)
    expect(css).toContain(`--mola-viva: ${LINEAR_VIVA};`)
  })
})
