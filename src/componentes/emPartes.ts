import { useEffect, useState } from 'preact/hooks'

/**
 * Quantos itens de uma lista grande mostrar agora: os primeiros entram com a tela, e o resto
 * vem em partes nos quadros seguintes, depois de pintar. Montar quarenta linhas de uma vez
 * custava uma tarefa longa de 80 a 130 ms na CPU lenta; em partes, cada quadro monta pouco e a
 * animação de entrada não perde quadros. O que já foi mostrado não some quando a lista muda.
 */
export function useEmPartes(total: number, primeira = 16, passo = 16): number {
  const [limite, setLimite] = useState(primeira)
  useEffect(() => {
    if (limite >= total) return
    // dois quadros: o primeiro pinta o que já está na tela, o segundo monta a parte seguinte
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setLimite((atual) => atual + passo))
    })
    return () => cancelAnimationFrame(id)
  }, [limite, total, passo])
  return Math.min(total, limite)
}
