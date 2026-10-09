import type { ComponentChildren } from 'preact'
import { Logo, MarcaDagua } from '../../componentes/Marca'

const BASE = import.meta.env.BASE_URL

/** Moldura das telas antes de entrar: marca d'água, logo, rótulo, título e o conteúdo. */
export function TelaDeEntrada({
  rotulo,
  titulo,
  texto,
  logo = 132,
  children,
}: {
  rotulo: string
  titulo: ComponentChildren
  texto?: ComponentChildren
  logo?: number
  children: ComponentChildren
}) {
  return (
    <main class="entrar">
      <MarcaDagua linhas={6} />
      <div class="entrar-miolo">
        <div class="entrar-logo">
          <Logo tamanho={logo} />
        </div>
        <div class="entrar-textos">
          <p class="micro">{rotulo}</p>
          <h1 class="display">{titulo}</h1>
          {texto && <p class="vazio-texto">{texto}</p>}
        </div>
        {children}
        <p class="entrar-rodape">
          <a class="link" href={`${BASE}privacidade/`}>
            Aviso de privacidade
          </a>
        </p>
      </div>
    </main>
  )
}

export const ENDERECO_DA_PAGINA_PUBLICA = `${BASE}experimental/`
