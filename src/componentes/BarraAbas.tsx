import { Icone } from './Icone'
import type { NomeDoIcone } from './Icone'

export interface ItemDeAba<T extends string> {
  id: T
  rotulo: string
  icone: NomeDoIcone
}

interface Props<T extends string> {
  itens: readonly ItemDeAba<T>[]
  atual: T
  aoEscolher: (id: T) => void
}

/** Barra de abas com rótulo sempre visível (ícone sozinho não basta para quem tem 40+). */
export function BarraAbas<T extends string>({ itens, atual, aoEscolher }: Props<T>) {
  return (
    <nav class="abas" aria-label="Principal">
      {itens.map((item) => (
        <button
          key={item.id}
          type="button"
          class="aba tocavel"
          aria-current={item.id === atual ? 'page' : undefined}
          onClick={() => aoEscolher(item.id)}
        >
          <Icone nome={item.icone} tamanho={26} />
          <span>{item.rotulo}</span>
          <span class="aba-ponto" aria-hidden="true" />
        </button>
      ))}
    </nav>
  )
}
