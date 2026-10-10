import { avisar } from '../componentes/Avisos'
import { BarraAbas } from '../componentes/BarraAbas'
import { Logo } from '../componentes/Marca'
import { base, repositorio, situacao } from '../dados/estado'
import { CONFIGURACAO_PADRAO } from '../dominio/configuracao'
import { Agenda } from '../telas/Agenda'
import { Alunos } from '../telas/alunos/Alunos'
import { FolhaDaAula } from '../telas/chamada/FolhaDaAula'
import { Financeiro } from '../telas/financeiro/Financeiro'
import { Hoje } from '../telas/Hoje'
import { Mais } from '../telas/Mais'
import { Botao } from '../componentes/Botao'
import { EstadoVazio } from '../componentes/EstadoVazio'
import { useLayoutEffect, useRef } from 'preact/hooks'
import type { ComponentChildren, JSX } from 'preact'
import { animarDepoisDePintar } from '../movimento/animar'
import { CURVA, DURACAO } from '../movimento/tempos'
import { abasDoPapel, chaveDaTela, irPara, rota } from './navegacao'
import type { Aba } from './navegacao'
import { papel } from './perfil'

const TELAS: Record<Aba, () => JSX.Element> = { hoje: Hoje, agenda: Agenda, alunos: Alunos, financeiro: Financeiro, mais: Mais }

/** Casca do app logado: topo com a marca, a tela da aba e a barra de abas do papel. */
export function Estrutura({ aoRecarregar }: { aoRecarregar: () => void }) {
  const itens = abasDoPapel(papel.value)
  // aba que o papel não tem (professor com link do financeiro, por exemplo) cai no Hoje
  const permitida = itens.some((i) => i.id === rota.value.aba)
  const atual = permitida ? rota.value.aba : 'hoje'
  const Tela = TELAS[atual]
  const demo = repositorio.value?.modo === 'demonstracao'
  const nomeEstudio = base.value?.configuracao.nomeEstudio ?? CONFIGURACAO_PADRAO.nomeEstudio

  return (
    <div class="app">
      <header class="topo">
        <div class="topo-marca">
          <Logo tamanho={34} monograma nome={nomeEstudio} />
          <span class="topo-nome">{nomeEstudio}</span>
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
          <QuadroDeTela key={permitida ? chaveDaTela.value : 'hoje'}>
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
 * `classe` troca a classe do quadro (o conteúdo de uma seção, abaixo de um cabeçalho que fica).
 */
export function QuadroDeTela({ children, classe = 'tela-quadro' }: { children: ComponentChildren; classe?: string }) {
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
    <div ref={quadro} class={classe}>
      {children}
    </div>
  )
}
