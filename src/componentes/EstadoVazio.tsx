import type { ComponentChildren } from 'preact'
import { Icone } from './Icone'
import type { NomeDoIcone } from './Icone'

interface Props {
  icone: NomeDoIcone
  rotulo: string
  texto: string
  children?: ComponentChildren
}

/** Estado vazio: ilustração de traço num selo pêssego, rótulo, uma linha e (talvez) uma ação. */
export function EstadoVazio({ icone, rotulo, texto, children }: Props) {
  return (
    <div class="vazio">
      <div class="selo">
        <Icone nome={icone} tamanho={44} traco={1.5} />
      </div>
      <p class="micro">{rotulo}</p>
      <p class="vazio-texto">{texto}</p>
      {children}
    </div>
  )
}
