import { signal } from '@preact/signals'

const consulta =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null

/** A pessoa pediu menos movimento no sistema (acessibilidade). */
export const movimentoReduzido = signal(consulta?.matches ?? false)
consulta?.addEventListener('change', (e) => {
  movimentoReduzido.value = e.matches
})

/** linear() do CSS: Chrome 113+, Safari 17.2+. No iOS 16 cai no cubic-bezier. */
export const suportaLinear =
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('transition-timing-function', 'linear(0, 1)')

/** View Transitions na mesma página: Chrome 111+, Safari 18+. */
export const suportaTransicaoDeVista =
  typeof document !== 'undefined' && typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === 'function'
