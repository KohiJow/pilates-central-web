import { useId } from 'preact/hooks'

interface Props {
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  ajuda?: string
  erro?: string
  maxLength?: number
  linhas?: number
}

export function AreaDeTexto({ rotulo, valor, aoMudar, ajuda, erro, maxLength, linhas = 3 }: Props) {
  const id = `texto-${useId()}`
  return (
    <div class="campo">
      <label class="campo-rotulo" for={id}>
        {rotulo}
      </label>
      <textarea
        id={id}
        class="campo-entrada campo-texto"
        rows={linhas}
        value={valor}
        maxLength={maxLength}
        onInput={(e) => aoMudar(e.currentTarget.value)}
        aria-invalid={erro ? 'true' : undefined}
        aria-describedby={erro || ajuda ? `${id}-ajuda` : undefined}
      />
      {erro ? (
        <p id={`${id}-ajuda`} class="campo-erro">
          {erro}
        </p>
      ) : (
        ajuda && (
          <p id={`${id}-ajuda`} class="campo-ajuda">
            {ajuda}
          </p>
        )
      )}
    </div>
  )
}
