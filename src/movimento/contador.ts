import { useEffect, useRef, useState } from 'preact/hooks'
import { movimentoReduzido } from './preferencias'
import { DURACAO } from './tempos'

const desacelerar = (t: number) => 1 - Math.pow(1 - t, 3)

/** Número que conta do valor anterior até o novo (na primeira vez, a partir de zero). */
export function useNumeroQueConta(alvo: number, duracao: number = DURACAO.longa): number {
  const [mostrado, setMostrado] = useState(movimentoReduzido.peek() ? alvo : 0)
  const atual = useRef(mostrado)

  useEffect(() => {
    const de = atual.current
    if (de === alvo) return
    if (movimentoReduzido.peek()) {
      atual.current = alvo
      setMostrado(alvo)
      return
    }
    let quadro = 0
    const inicio = performance.now()
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao)
      const valor = Math.round(de + (alvo - de) * desacelerar(t))
      atual.current = valor
      setMostrado(valor)
      if (t < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [alvo, duracao])

  return mostrado
}
