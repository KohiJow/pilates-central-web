import { CONFIGURACAO_PADRAO, palavraDaMarca } from '../dominio/configuracao'
import logoUrl from '../assets/marca/logo.svg'
import monogramaUrl from '../assets/marca/monograma.svg'

/** Logo vetorizado usado como máscara: a cor vem do tema (terracota no claro, pêssego no escuro). */
export function Logo({ tamanho, monograma = false, nome = CONFIGURACAO_PADRAO.nomeEstudio }: { tamanho: number; monograma?: boolean; nome?: string }) {
  const url = `url("${monograma ? monogramaUrl : logoUrl}")`
  return (
    <span
      class="logo"
      role="img"
      aria-label={nome}
      style={{ width: tamanho, height: tamanho, maskImage: url, WebkitMaskImage: url }}
    />
  )
}

/**
 * Marca d'água das artes do estúdio, como textura de fundo: a primeira palavra do nome do
 * estúdio, em caixa alta, repetida em linhas.
 */
export function MarcaDagua({ linhas = 3, nome = CONFIGURACAO_PADRAO.nomeEstudio }: { linhas?: number; nome?: string }) {
  const palavra = palavraDaMarca(nome)
  return (
    <div class="marca-dagua" aria-hidden="true">
      {Array.from({ length: linhas }, (_, i) => (
        <span key={i}>{palavra}</span>
      ))}
    </div>
  )
}
