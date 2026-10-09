// Gerador pseudoaleatório com semente (mulberry32): a demonstração sai sempre igual para o
// mesmo "agora", o que deixa os testes de ponta a ponta previsíveis.
export interface Aleatorio {
  /** número em [0, 1) */
  proximo(): number
  inteiro(min: number, max: number): number
  escolher<T>(itens: readonly T[]): T
  escolherPonderado<T>(itens: readonly { item: T; peso: number }[]): T
  chance(probabilidade: number): boolean
}

export function criarAleatorio(semente: number): Aleatorio {
  let estado = semente >>> 0
  const proximo = () => {
    estado = (estado + 0x6d2b79f5) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    proximo,
    inteiro: (min, max) => min + Math.floor(proximo() * (max - min + 1)),
    escolher: (itens) => {
      const item = itens[Math.floor(proximo() * itens.length)]
      if (item === undefined) throw new Error('lista vazia')
      return item
    },
    escolherPonderado: (itens) => {
      const total = itens.reduce((s, i) => s + i.peso, 0)
      let alvo = proximo() * total
      for (const { item, peso } of itens) {
        alvo -= peso
        if (alvo < 0) return item
      }
      const ultimo = itens[itens.length - 1]
      if (!ultimo) throw new Error('lista vazia')
      return ultimo.item
    },
    chance: (p) => proximo() < p,
  }
}
