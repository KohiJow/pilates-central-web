import type { ComponentChildren, JSX } from 'preact'
import { Icone } from './Icone'
import type { NomeDoIcone } from './Icone'

type Variante = 'primario' | 'secundario' | 'terciario' | 'perigo'

type Props = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  icone?: NomeDoIcone
  largo?: boolean
  children: ComponentChildren
}

export function Botao({ variante = 'secundario', icone, largo, children, class: classe, type, ...resto }: Props) {
  const classes = ['botao', `botao--${variante}`, 'tocavel', largo ? 'botao--largo' : '', classe ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <button type={type ?? 'button'} class={classes} {...resto}>
      {icone && <Icone nome={icone} tamanho={20} />}
      <span>{children}</span>
    </button>
  )
}
