import type { ComponentChildren } from 'preact'

type Tom = 'contorno' | 'acento' | 'alerta' | 'sucesso'

/** Rótulo em pílula de contorno, caixa alta (como nas artes do estúdio). */
export function Pilula({ tom = 'contorno', children }: { tom?: Tom; children: ComponentChildren }) {
  return <span class={`pilula${tom === 'contorno' ? '' : ` pilula--${tom}`}`}>{children}</span>
}

interface PropsChip {
  ativo: boolean
  aoTocar: () => void
  children: ComponentChildren
  /** "radio" para escolha única num grupo (role=radiogroup no pai) */
  papel?: 'alternar' | 'radio'
}

export function Chip({ ativo, aoTocar, children, papel = 'alternar' }: PropsChip) {
  return papel === 'radio' ? (
    <button type="button" role="radio" aria-checked={ativo} class="chip tocavel" onClick={aoTocar}>
      {children}
    </button>
  ) : (
    <button type="button" aria-pressed={ativo} class="chip tocavel" onClick={aoTocar}>
      {children}
    </button>
  )
}
