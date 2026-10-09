import type { JSX } from 'preact'
import { useId } from 'preact/hooks'
import { Icone } from './Icone'
import type { NomeDoIcone } from './Icone'

type Props = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value'> & {
  rotulo: string
  ajuda?: string
  erro?: string
  icone?: NomeDoIcone
  valor: string
  aoMudar: (valor: string) => void
}

export function Campo({ rotulo, ajuda, erro, icone, valor, aoMudar, id, type, ...resto }: Props) {
  const gerado = useId()
  const idCampo = typeof id === 'string' ? id : `campo-${gerado}`
  const idAjuda = `${idCampo}-ajuda`
  return (
    <div class="campo">
      <label class="campo-rotulo" for={idCampo}>
        {rotulo}
      </label>
      <div class="campo-caixa">
        {icone && (
          <span class="campo-icone">
            <Icone nome={icone} tamanho={20} />
          </span>
        )}
        <input
          id={idCampo}
          class="campo-entrada"
          type={type ?? 'text'}
          value={valor}
          onInput={(e) => aoMudar(e.currentTarget.value)}
          aria-invalid={erro ? 'true' : undefined}
          aria-describedby={ajuda || erro ? idAjuda : undefined}
          {...resto}
        />
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
