import logoUrl from '../assets/marca/logo.svg'
import monogramaUrl from '../assets/marca/monograma.svg'

/** Logo vetorizado usado como máscara: a cor vem do tema (terracota no claro, pêssego no escuro). */
export function Logo({ tamanho, monograma = false }: { tamanho: number; monograma?: boolean }) {
  const url = `url("${monograma ? monogramaUrl : logoUrl}")`
  return (
    <span
      class="logo"
      role="img"
      aria-label="Pilates Central"
      style={{ width: tamanho, height: tamanho, maskImage: url, WebkitMaskImage: url }}
    />
  )
}

/** Marca d'água "PILATES" das artes do estúdio, como textura de fundo. */
export function MarcaDagua({ linhas = 3 }: { linhas?: number }) {
  return (
    <div class="marca-dagua" aria-hidden="true">
      {Array.from({ length: linhas }, (_, i) => (
        <span key={i}>PILATES</span>
      ))}
    </div>
  )
}
