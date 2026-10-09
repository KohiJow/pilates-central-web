import { Avisos } from '../componentes/Avisos'
import { carregar } from '../dados/estado'
import type { Repositorio } from '../dados/repositorio'
import { Entrar } from '../telas/Entrar'
import { Estrutura } from './Estrutura'
import { hoje } from './relogio'
import { sessao } from './sessao'

export function App({ repositorio }: { repositorio: Repositorio }) {
  const s = sessao.value
  return (
    <>
      {s ? <Estrutura aoRecarregar={() => void carregar(repositorio, hoje.peek())} /> : <Entrar />}
      <Avisos semAbas={!s} />
    </>
  )
}
