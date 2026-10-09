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
  // garante que quem espera o fim continua mesmo se a animação ficar parada
  // (aba em segundo plano, por exemplo): o estado final já está no estilo
  const prazo = new Promise<void>((r) => setTimeout(r, opcoes.duration + Number(opcoes.delay ?? 0) + 150))
  return Promise.race([
    animacao.finished.then(
      () => limparSeNeutro(elemento, final),
      () => undefined,
    ),
    prazo,
  ])
}

const NEUTRO = /^translate[XY]?\(0(px)?\)$/

/**
 * Terminou no lugar de origem (deslocamento zero, opacidade 1): tira o estilo em linha, para o
 * navegador não manter uma camada de composição à toa depois da animação.
 */
function limparSeNeutro(elemento: HTMLElement, final: Keyframe): void {
  if (elemento.getAnimations().some((a) => a.playState === 'running')) return
  if (final.transform !== undefined && NEUTRO.test(String(final.transform)) && elemento.style.transform === String(final.transform)) {
    elemento.style.transform = ''
  }
  if (final.opacity !== undefined && Number(final.opacity) === 1 && elemento.style.opacity === '1') {
    elemento.style.opacity = ''
  }
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

const proximoQuadro = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/**
 * Como `animar`, mas só começa depois que o estado inicial foi pintado (dois quadros).
 * Em aparelho lento, montar e pintar a tela nova pode levar mais que um quadro; se a animação
 * começasse junto, esse tempo comeria o começo dela e o movimento "pularia" (ou nem apareceria).
 * `cancelar()` desiste da animação; `cancelar(true)` também pula para o estado final (quando o
 * dedo pega a peça antes de ela terminar de entrar).
 */
export function animarDepoisDePintar(
  elemento: HTMLElement,
  quadros: Keyframe[],
  opcoes: KeyframeAnimationOptions & { duration: number },
): { cancelar: (irParaOFim?: boolean) => void; fim: Promise<void> } {
  let cancelado = false
  const inicial = quadros[0] ?? {}
  if (!movimentoReduzido.peek()) {
    if (inicial.transform !== undefined) elemento.style.transform = String(inicial.transform)
    if (inicial.opacity !== undefined) elemento.style.opacity = String(inicial.opacity)
  }
  const fim = proximoQuadro()
    .then(proximoQuadro)
    .then(() => (cancelado ? undefined : animar(elemento, quadros, opcoes)))
  return {
    cancelar: (irParaOFim = false) => {
      cancelado = true
      if (!irParaOFim) return
      const final = quadros[quadros.length - 1] ?? {}
      for (const anim of elemento.getAnimations()) anim.cancel()
      if (final.transform !== undefined) elemento.style.transform = String(final.transform)
      if (final.opacity !== undefined) elemento.style.opacity = String(final.opacity)
    },
    fim,
  }
}
