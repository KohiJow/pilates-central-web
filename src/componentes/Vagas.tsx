import { plural } from '../dominio/texto'

interface Props {
  ocupadas: number
  capacidade: number
  cancelada?: boolean
}

/** Lugares em pontos (cheio = ocupado) e o número escrito: o estado nunca depende só de cor. */
export function Vagas({ ocupadas, capacidade, cancelada }: Props) {
  const ocupadasVisiveis = Math.min(ocupadas, capacidade)
  const livres = Math.max(0, capacidade - ocupadas)
  const texto = cancelada ? 'sem aula' : livres === 0 ? 'lotada' : plural(livres, 'vaga')
  const leitura = cancelada
    ? 'Aula cancelada'
    : `${ocupadasVisiveis} de ${capacidade} lugares ocupados, ${livres === 0 ? 'lotada' : plural(livres, 'vaga')}`
  return (
    <span class={`vagas${livres === 0 && !cancelada ? ' vagas--lotada' : ''}`} role="img" aria-label={leitura}>
      <span class="vagas-pontos" aria-hidden="true">
        {Array.from({ length: capacidade }, (_, i) => (
          <span key={i} class={`vagas-ponto${i < ocupadasVisiveis ? ' vagas-ponto--ocupado' : ''}`} />
        ))}
      </span>
      <span class="vagas-texto" aria-hidden="true">
        {texto}
      </span>
    </span>
  )
}
