// O teclado do celular não muda o tamanho da página (no iPhone nunca; no Android, por padrão,
// também não): ele encolhe só a janela visual (visualViewport). Uma folha presa ao pé da tela
// fica com o campo e o botão de confirmar atrás do teclado. Aqui está a conta de quanto ele cobre.

export interface JanelaVisual {
  height: number
  offsetTop: number
  scale: number
}

/** Quantos pixels do pé da janela o teclado cobre (0 sem teclado). */
export function coberturaDoTeclado(alturaDaJanela: number, visual: JanelaVisual): number {
  // zoom de pinça também encolhe a janela visual, sem teclado nenhum
  if (Math.abs(visual.scale - 1) > 0.01) return 0
  const coberto = Math.round(alturaDaJanela - visual.height - visual.offsetTop)
  // diferença pequena é a barra do navegador se ajustando, não teclado
  return coberto >= 80 ? coberto : 0
}

const CAMPO_DE_DIGITAR = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]), textarea, select'

/** Um campo que abre o teclado está com o foco dentro de `raiz`? */
export function digitandoEm(raiz: Element): HTMLElement | null {
  const campo = document.activeElement
  return campo instanceof HTMLElement && raiz.contains(campo) && campo.matches(CAMPO_DE_DIGITAR) ? campo : null
}
