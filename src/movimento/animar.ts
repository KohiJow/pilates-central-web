import { movimentoReduzido } from './preferencias'

/**
 * Anima só transform e opacity com a Web Animations API. O estado final é gravado no estilo
 * do elemento antes de animar, então interromper ou cancelar nunca deixa a tela num quadro
 * do meio. Com movimento reduzido, pula direto para o fim (ou faz um fade curto).
 */
export function animar(
  elemento: HTMLElement,
  quadros: Keyframe[],
  opcoes: KeyframeAnimationOptions & { duration: number },
): Promise<void> {
  const final = quadros[quadros.length - 1] ?? {}
  for (const anim of elemento.getAnimations()) anim.cancel()
  if (final.transform !== undefined) elemento.style.transform = String(final.transform)
  if (final.opacity !== undefined) elemento.style.opacity = String(final.opacity)
  if (movimentoReduzido.peek() || typeof elemento.animate !== 'function') return Promise.resolve()
  const animacao = elemento.animate(quadros, { fill: 'backwards', ...opcoes })
  return animacao.finished.then(
    () => undefined,
    () => undefined,
  )
}

/** transform atual do elemento (inclusive no meio de uma animação), para continuar dali. */
export function transformAtual(elemento: HTMLElement): string {
  const t = getComputedStyle(elemento).transform
  return t && t !== 'none' ? t : 'translate(0, 0)'
}

/** Desloca a duração conforme a velocidade do gesto: arrasto rápido termina rápido. */
export function duracaoPelaVelocidade(distancia: number, velocidade: number, minimo = 180, maximo = 320): number {
  const v = Math.abs(velocidade)
  if (v < 0.05) return maximo
  return Math.round(Math.min(maximo, Math.max(minimo, Math.abs(distancia) / v)))
}
