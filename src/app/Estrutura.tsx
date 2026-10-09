import { avisar } from '../componentes/Avisos'
import { BarraAbas } from '../componentes/BarraAbas'
import { Logo } from '../componentes/Marca'
import { repositorio, situacao } from '../dados/estado'
import { Agenda } from '../telas/Agenda'
import { FolhaDaAula } from '../telas/chamada/FolhaDaAula'
import { Hoje } from '../telas/Hoje'
import { Mais } from '../telas/Mais'
import { Botao } from '../componentes/Botao'
import { EstadoVazio } from '../componentes/EstadoVazio'
import { aba, abasDoPapel, irPara } from './navegacao'
import type { Sessao } from './sessao'

const TELAS = { hoje: Hoje, agenda: Agenda, mais: Mais }

/** Casca do app logado: topo com a marca, a tela da aba e a barra de abas do papel. */
export function Estrutura({ sessao, aoRecarregar }: { sessao: Sessao; aoRecarregar: () => void }) {
  const itens = abasDoPapel(sessao.papel)
  const atual = itens.some((i) => i.id === aba.value) ? aba.value : 'hoje'
  const Tela = TELAS[atual]
  const demo = repositorio.value?.modo === 'demonstracao'

  return (
    <div class="app">
      <header class="topo">
        <div class="topo-marca">
          <Logo tamanho={34} monograma />
          <span class="topo-nome">Pilates Central</span>
        </div>
        {demo && (
          <button
            type="button"
            class="selo-demo tocavel"
            onClick={() =>
              avisar({ texto: 'Demonstração: dados fictícios, guardados só neste aparelho.', icone: 'info', duracao: 5000 })
            }
          >
            <span>Demonstração</span>
          </button>
        )}
      </header>

      <main class="conteudo" id="conteudo">
        {situacao.value === 'erro' ? (
          <EstadoVazio icone="info" rotulo="Não abriu" texto="Não deu para carregar os dados. Confira a internet e tente de novo.">
            <Botao variante="secundario" icone="recomecar" onClick={aoRecarregar}>
              Tentar de novo
            </Botao>
          </EstadoVazio>
        ) : (
          <div class="tela-quadro" key={atual}>
            <Tela />
          </div>
        )}
      </main>

      <BarraAbas itens={itens} atual={atual} aoEscolher={(id) => irPara(id, sessao.papel)} />
      <FolhaDaAula />
    </div>
  )
}
