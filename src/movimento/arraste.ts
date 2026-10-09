// Matemática dos gestos, separada do DOM para dar para testar.

interface Amostra {
  t: number
  x: number
  y: number
}

/** Velocidade do dedo (px/ms) considerando só os últimos ~100 ms do gesto. */
export class Velocimetro {
  private amostras: Amostra[] = []

  constructor(private readonly janelaMs = 100) {}

  registrar(t: number, x: number, y: number): void {
    this.amostras.push({ t, x, y })
    const limite = t - this.janelaMs
    while (this.amostras.length > 2 && (this.amostras[0]?.t ?? t) < limite) this.amostras.shift()
  }

  velocidade(): { vx: number; vy: number } {
    const primeira = this.amostras[0]
    const ultima = this.amostras[this.amostras.length - 1]
    if (!primeira || !ultima || ultima.t - primeira.t < 1) return { vx: 0, vy: 0 }
    const dt = ultima.t - primeira.t
    return { vx: (ultima.x - primeira.x) / dt, vy: (ultima.y - primeira.y) / dt }
  }

  zerar(): void {
    this.amostras = []
  }
}

/**
 * Resistência de elástico: quanto mais se puxa além do limite, menos anda.
 * Devolve sempre menos que `excesso` e nunca passa de `limite`.
 */
export function resistencia(excesso: number, limite: number): number {
  if (excesso <= 0) return 0
  return limite * (1 - 1 / ((excesso * 0.55) / limite + 1))
}

/** A folha fecha se foi arrastada mais de 30% da altura ou jogada para baixo com força. */
export function deveFechar(deslocamento: number, altura: number, velocidadeY: number): boolean {
  if (velocidadeY > 0.5) return true
  if (velocidadeY < -0.3) return false
  return deslocamento > altura * 0.3
}

/** Troca de dia: -1 (dia anterior), 1 (próximo) ou 0 (volta para o lugar). */
export function direcaoDaTroca(dx: number, largura: number, velocidadeX: number): -1 | 0 | 1 {
  const rapido = Math.abs(velocidadeX) > 0.45 && Math.abs(dx) > 24
  if (rapido || Math.abs(dx) > largura * 0.22) return dx < 0 ? 1 : -1
  return 0
}

/** Decide cedo se o gesto é horizontal (trocar de dia) ou vertical (rolar a lista). */
export function eixoDoGesto(dx: number, dy: number, limiar = 10): 'x' | 'y' | null {
  if (Math.abs(dx) < limiar && Math.abs(dy) < limiar) return null
  return Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y'
}
