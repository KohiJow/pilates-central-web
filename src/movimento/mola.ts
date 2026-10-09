// Mola amortecida transformada em curva linear() do CSS. A curva é a posição normalizada (0 a 1)
// de uma massa presa a uma mola, amostrada em intervalos iguais até assentar. Como a duração da
// animação é fixa (180 a 320 ms), a mola é "comprimida" nesse tempo: muda a forma, não o prazo.

export interface Mola {
  rigidez: number
  amortecimento: number
}

/** Sem repique: para folhas, listas e o que precisa parecer firme. */
export const MOLA_SUAVE: Mola = { rigidez: 170, amortecimento: 28 }
/** Repique leve: para retorno de toque, pílulas e números. */
export const MOLA_VIVA: Mola = { rigidez: 260, amortecimento: 21 }

export function simularMola({ rigidez, amortecimento }: Mola, passos = 40): number[] {
  const dt = 1 / 1000
  let x = 0
  let v = 0
  const trajeto: number[] = [0]
  // integra até assentar (ou 3 s, por segurança)
  for (let t = 0; t < 3; t += dt) {
    const a = -rigidez * (x - 1) - amortecimento * v
    v += a * dt
    x += v * dt
    trajeto.push(x)
    if (Math.abs(x - 1) < 0.0005 && Math.abs(v) < 0.002) break
  }
  const valores: number[] = []
  for (let i = 0; i <= passos; i++) {
    const indice = Math.round((i / passos) * (trajeto.length - 1))
    valores.push(trajeto[indice] ?? 1)
  }
  valores[0] = 0
  valores[valores.length - 1] = 1
  return valores
}

export function molaEmLinear(mola: Mola, passos = 40): string {
  const valores = simularMola(mola, passos).map((v) => Number(v.toFixed(4)).toString())
  return `linear(${valores.join(', ')})`
}

export const LINEAR_SUAVE = molaEmLinear(MOLA_SUAVE)
export const LINEAR_VIVA = molaEmLinear(MOLA_VIVA)
