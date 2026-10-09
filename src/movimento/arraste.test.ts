import { describe, expect, it } from 'vitest'
import { deveFechar, direcaoDaTroca, eixoDoGesto, resistencia, Velocimetro } from './arraste'
import { curvaQueContinua, duracaoPelaVelocidade } from './animar'

describe('gestos', () => {
  it('mede a velocidade só no fim do gesto', () => {
    const v = new Velocimetro(100)
    v.registrar(0, 0, 0)
    v.registrar(500, 0, 10) // parado no começo
    v.registrar(550, 0, 40)
    v.registrar(600, 0, 90)
    // (90 - 10) / (600 - 500): a amostra parada do começo ficou de fora
    expect(v.velocidade().vy).toBeCloseTo(0.8, 2)
    v.zerar()
    expect(v.velocidade()).toEqual({ vx: 0, vy: 0 })
  })

  it('resistência de elástico cresce cada vez menos e nunca passa do limite', () => {
    const a = resistencia(50, 80)
    const b = resistencia(200, 80)
    expect(a).toBeLessThan(50)
    expect(b).toBeGreaterThan(a)
    expect(resistencia(10_000, 80)).toBeLessThan(80)
    expect(resistencia(-5, 80)).toBe(0)
  })

  it('folha: fecha por distância ou por arremesso, e não fecha se o dedo volta para cima', () => {
    expect(deveFechar(200, 600, 0)).toBe(true)
    expect(deveFechar(100, 600, 0)).toBe(false)
    expect(deveFechar(40, 600, 0.8)).toBe(true)
    expect(deveFechar(250, 600, -0.5)).toBe(false)
  })

  it('troca de dia por distância ou por arremesso', () => {
    expect(direcaoDaTroca(-120, 390, 0)).toBe(1)
    expect(direcaoDaTroca(120, 390, 0)).toBe(-1)
    expect(direcaoDaTroca(-40, 390, -0.8)).toBe(1)
    expect(direcaoDaTroca(-40, 390, -0.1)).toBe(0)
    expect(direcaoDaTroca(-10, 390, -2)).toBe(0)
  })

  it('decide o eixo do gesto', () => {
    expect(eixoDoGesto(3, 4)).toBeNull()
    expect(eixoDoGesto(30, 5)).toBe('x')
    expect(eixoDoGesto(12, 11)).toBe('y')
  })

  it('duração acompanha a velocidade, dentro de 180 a 320 ms', () => {
    expect(duracaoPelaVelocidade(300, 2)).toBe(180)
    expect(duracaoPelaVelocidade(300, 0)).toBe(320)
    expect(duracaoPelaVelocidade(250, 1)).toBe(250)
  })

  it('depois de soltar, a curva sai na velocidade do dedo e nunca passa do destino', () => {
    const inclinacao = (curva: string) => {
      const [x1, y1, , y2] = (curva.match(/[\d.]+/g) ?? []).map(Number)
      return { saida: (y1 ?? 0) / (x1 ?? 1), chegada: y2 }
    }
    // 250 px a 1 px/ms em 250 ms: a curva começa na mesma velocidade (inclinação 1)
    expect(inclinacao(curvaQueContinua(1, 250, 250)).saida).toBeCloseTo(1, 2)
    // arremesso forte encurtado para 180 ms: sai mais rápido que a média, como o dedo
    expect(inclinacao(curvaQueContinua(3, 300, 180)).saida).toBeCloseTo(1.8, 2)
    // nada de passar do ponto (y2 = 1) e nem inclinação absurda
    expect(inclinacao(curvaQueContinua(50, 10, 320))).toEqual({ saida: 4, chegada: 1 })
    expect(inclinacao(curvaQueContinua(0, 100, 240)).saida).toBe(0)
  })
})
