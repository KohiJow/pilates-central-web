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

const temApiDeTransicao =
  typeof document !== 'undefined' && typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === 'function'

/**
 * View Transitions (Chrome 111+, Safari 18+) como melhoria progressiva, mas só no motor em que
 * a medimos fluida. No WebKit dos testes (sem GPU) a captura da tela travou a thread principal
 * por 1,5 a 8 s; enquanto isso não for medido num iPhone de verdade, Safari e Firefox trocam
 * sem transição. `navigator.userAgentData` só existe nos navegadores Chromium.
 * Para testar num aparelho: ?transicao=vista força a View Transition; ?transicao=css desliga.
 */
export function deveUsarTransicaoDeVista(busca: string): boolean {
  if (!temApiDeTransicao) return false
  const forcada = new URLSearchParams(busca).get('transicao')
  if (forcada === 'vista') return true
  if (forcada === 'css') return false
  return typeof navigator !== 'undefined' && 'userAgentData' in navigator
}

export const transicaoDeVista = { ligada: false }
