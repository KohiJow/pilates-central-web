import type { JSX } from 'preact'

export function Esqueleto({ largura = '100%', altura = 16, raio }: { largura?: string | number; altura?: number; raio?: number }) {
  const estilo: JSX.CSSProperties = { width: largura, height: altura }
  if (raio !== undefined) estilo.borderRadius = raio
  return <div class="esqueleto" style={estilo} aria-hidden="true" />
}

/** Lista de cards "fantasma" enquanto os dados chegam. */
export function EsqueletoDeLista({ itens = 4, altura = 96 }: { itens?: number; altura?: number }) {
  return (
    <div class="esqueleto-lista" role="status" aria-label="Carregando">
      {Array.from({ length: itens }, (_, i) => (
        <Esqueleto key={i} altura={altura} raio={16} />
      ))}
    </div>
  )
}
