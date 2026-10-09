import type { ComponentChildren, JSX } from 'preact'

type Variante = 'claro' | 'marca' | 'acento' | 'recuado'

interface Props {
  variante?: Variante
  class?: string
  aoTocar?: () => void
  rotulo?: string
  style?: JSX.CSSProperties
  children: ComponentChildren
}

/** Card: superfície elevada com sombra tingida; "marca" é o card terracota sólido. */
export function Card({ variante = 'claro', class: classe, aoTocar, rotulo, style, children }: Props) {
  const classes = `card${variante === 'claro' ? '' : ` card--${variante}`}${classe ? ` ${classe}` : ''}`
  if (aoTocar) {
    return (
      <button type="button" class={`${classes} tocavel`} onClick={aoTocar} aria-label={rotulo} style={style}>
        {children}
      </button>
    )
  }
  return (
    <div class={classes} style={style}>
      {children}
    </div>
  )
}
