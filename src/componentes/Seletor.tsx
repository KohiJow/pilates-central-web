import type { JSX } from 'preact'
import { useId } from 'preact/hooks'

type Props = Omit<JSX.SelectHTMLAttributes<HTMLSelectElement>, 'value'> & {
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  opcoes: readonly { valor: string; rotulo: string }[]
  erro?: string
  ajuda?: string
}

/** Lista de escolha nativa: no iPhone abre a roda de opções, no Android a lista do sistema. */
export function Seletor({ rotulo, valor, aoMudar, opcoes, erro, ajuda, id, ...resto }: Props) {
  const gerado = useId()
  const idCampo = typeof id === 'string' ? id : `seletor-${gerado}`
  const idAjuda = `${idCampo}-ajuda`
  return (
    <div class="campo">
      <label class="campo-rotulo" for={idCampo}>
        {rotulo}
      </label>
      <div class="campo-caixa seletor">
        <select
          id={idCampo}
          class="campo-entrada"
          value={valor}
          onChange={(e) => aoMudar(e.currentTarget.value)}
          aria-invalid={erro ? 'true' : undefined}
          aria-describedby={erro || ajuda ? idAjuda : undefined}
          {...resto}
        >
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>
      {erro ? (
        <p id={idAjuda} class="campo-erro">
          {erro}
        </p>
      ) : (
        ajuda && (
          <p id={idAjuda} class="campo-ajuda">
            {ajuda}
          </p>
        )
      )}
    </div>
  )
}
