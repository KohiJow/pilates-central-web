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
import { useLayoutEffect, useRef } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { animarDepoisDePintar } from '../movimento/animar'
import { CURVA, DURACAO } from '../movimento/tempos'
import { aba, abasDoPapel, irPara } from './navegacao'
import { papel } from './perfil'

const TELAS = { hoje: Hoje, agenda: Agenda, mais: Mais }

/** Casca do app logado: topo com a marca, a tela da aba e a barra de abas do papel. */
export function Estrutura({ aoRecarregar }: { aoRecarregar: () => void }) {
  const itens = abasDoPapel(papel.value)
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
          <QuadroDeTela key={atual}>
            <Tela />
          </QuadroDeTela>
        )}
      </main>

      <BarraAbas itens={itens} atual={atual} aoEscolher={(id) => irPara(id, papel.value)} />
      <FolhaDaAula />
    </div>
  )
}

/**
 * A tela nova entra deslizando 24px do lado da aba escolhida. A animação só começa depois que a
 * tela foi pintada uma vez: em aparelho lento, o tempo de montar a tela não come o movimento.
 */
function QuadroDeTela({ children }: { children: ComponentChildren }) {
  const quadro = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = quadro.current
    if (!el) return
    const lado = document.documentElement.dataset.direcao === 'tras' ? -1 : 1
    const entrada = animarDepoisDePintar(
      el,
      [
        // começa visível, ainda que esmaecida: em aparelho lento, enquanto a tela é pintada,
        // aparece o conteúdo novo e não um vão em branco
        { transform: `translateX(${lado * 24}px)`, opacity: 0.35 },
        { transform: 'translateX(0px)', opacity: 1 },
      ],
      { duration: DURACAO.media, easing: CURVA.suave },
    )
    return entrada.cancelar
  }, [])
  return (
    <div ref={quadro} class="tela-quadro">
      {children}
    </div>
  )
}
