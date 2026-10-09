import { useId } from 'preact/hooks'
import { Icone } from './Icone'

interface Props {
  rotulo: string
  valor: number
  aoMudar: (valor: number) => void
  min: number
  max: number
  passo?: number
  /** "5 alunos", "50 min": como o número é lido */
  formatar?: (valor: number) => string
  erro?: string
  ajuda?: string
}

/**
 * Número com botões de menos e mais, grandes, para mudar com o polegar sem abrir o teclado.
 * O número no meio é um spinbutton (setas do teclado mudam o valor, o leitor de tela lê por extenso).
 */
export function Contador({ rotulo, valor, aoMudar, min, max, passo = 1, formatar = String, erro, ajuda }: Props) {
  const id = `contador-${useId()}`
  const mudar = (n: number) => aoMudar(Math.min(max, Math.max(min, n)))
  return (
    <div class="campo">
      <span class="campo-rotulo" id={`${id}-rotulo`}>
        {rotulo}
      </span>
      <div class="contador">
        <button
          type="button"
          class="contador-botao tocavel"
          aria-label={`Menos: ${rotulo.toLowerCase()}`}
          disabled={valor <= min}
          onClick={() => mudar(valor - passo)}
        >
          <Icone nome="menos" tamanho={22} traco={2} />
        </button>
        <span
          class="contador-valor"
          role="spinbutton"
          tabIndex={0}
          aria-labelledby={`${id}-rotulo`}
          aria-valuenow={valor}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={formatar(valor)}
          aria-invalid={erro ? 'true' : undefined}
          aria-describedby={erro || ajuda ? `${id}-ajuda` : undefined}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
              e.preventDefault()
              mudar(valor + passo)
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
              e.preventDefault()
              mudar(valor - passo)
            }
          }}
        >
          {formatar(valor)}
        </span>
        <button
          type="button"
          class="contador-botao tocavel"
          aria-label={`Mais: ${rotulo.toLowerCase()}`}
          disabled={valor >= max}
          onClick={() => mudar(valor + passo)}
        >
          <Icone nome="adicionar" tamanho={22} traco={2} />
        </button>
      </div>
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
