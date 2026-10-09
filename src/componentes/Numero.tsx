import { useNumeroQueConta } from '../movimento/contador'

/** Número em Playfair que conta até o valor quando aparece ou muda. */
export function Numero({ valor, class: classe = 'numeral' }: { valor: number; class?: string }) {
  const mostrado = useNumeroQueConta(valor)
  return (
    <span class={classe}>
      <span aria-hidden="true">{mostrado}</span>
      <span class="so-leitor">{valor}</span>
    </span>
  )
}
