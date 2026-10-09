import type { ComponentChildren } from 'preact'
import { useId } from 'preact/hooks'

interface Props {
  ligado: boolean
  aoMudar: (ligado: boolean) => void
  rotulo: string
  ajuda?: ComponentChildren
  desativado?: boolean
}

/**
 * Liga e desliga (role="switch"). A linha inteira é o alvo de toque; só a bolinha anda, por
 * transform. A cor do trilho troca na hora, sem transição (cor animada pesa no celular).
 */
export function Interruptor({ ligado, aoMudar, rotulo, ajuda, desativado }: Props) {
  const id = useId()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-describedby={ajuda ? `ajuda-${id}` : undefined}
      class="interruptor tocavel"
      disabled={desativado}
      onClick={() => aoMudar(!ligado)}
    >
      <span class="interruptor-texto">
        <span class="lista-item-titulo">{rotulo}</span>
        {ajuda && (
          <span id={`ajuda-${id}`} class="lista-item-sub">
            {ajuda}
          </span>
        )}
      </span>
      <span class="interruptor-trilho" aria-hidden="true">
        <span class="interruptor-bolinha" />
      </span>
    </button>
  )
}
