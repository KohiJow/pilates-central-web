import { emReais } from '../dominio/pagamentos'
import { useNumeroQueConta } from '../movimento/contador'

/** Valor em reais que conta até o número certo quando aparece ou muda (leitor de tela lê o final). */
export function Dinheiro({ centavos, class: classe = 'numeral' }: { centavos: number; class?: string }) {
  const mostrado = useNumeroQueConta(centavos)
  return (
    <span class={classe}>
      <span aria-hidden="true">{emReais(mostrado)}</span>
      <span class="so-leitor">{emReais(centavos)}</span>
    </span>
  )
}
