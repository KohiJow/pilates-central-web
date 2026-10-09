// O app do aluno: as próximas aulas (avisar que não vem), a reposição (escolher onde repor) e
// Mais (tema, instalar, privacidade, sair). Abas simples, sem endereço por tela: são três.
import { signal } from '@preact/signals'
import { QuadroDeTela } from '../../app/Estrutura'
import { avisar } from '../../componentes/Avisos'
import { BarraAbas } from '../../componentes/BarraAbas'
import type { ItemDeAba } from '../../componentes/BarraAbas'
import { Botao } from '../../componentes/Botao'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { Logo } from '../../componentes/Marca'
import { carregarAluno, dadosDoAluno, mensagemDeErroDoAluno, repositorioDoAluno, situacaoDoAluno } from '../../dados/aluno'
import { AulasDoAluno } from './AulasDoAluno'
import { MaisDoAluno } from './MaisDoAluno'
import { ReposicaoDoAluno } from './ReposicaoDoAluno'

export type AbaDoAluno = 'aulas' | 'repor' | 'mais'

const ABAS: ItemDeAba<AbaDoAluno>[] = [
  { id: 'aulas', rotulo: 'Minhas aulas', icone: 'agenda' },
  { id: 'repor', rotulo: 'Reposição', icone: 'reposicao' },
  { id: 'mais', rotulo: 'Mais', icone: 'mais' },
]

export const abaDoAluno = signal<AbaDoAluno>('aulas')

export function irParaAbaDoAluno(nova: AbaDoAluno): void {
  const atual = abaDoAluno.peek()
  if (nova === atual) return
  const ordem = ABAS.map((a) => a.id)
  document.documentElement.dataset.direcao = ordem.indexOf(nova) >= ordem.indexOf(atual) ? 'frente' : 'tras'
  abaDoAluno.value = nova
  requestAnimationFrame(() => window.scrollTo(0, 0))
}

const TELAS = { aulas: AulasDoAluno, repor: ReposicaoDoAluno, mais: MaisDoAluno }

export function AppDoAluno() {
  const aba = abaDoAluno.value
  const Tela = TELAS[aba]
  const demo = repositorioDoAluno.value?.modo === 'demonstracao'
  const repo = repositorioDoAluno.value

  return (
    <div class="app">
      <header class="topo">
        <div class="topo-marca">
          <Logo tamanho={34} monograma />
          <span class="topo-nome">{dadosDoAluno.value?.configuracao.nomeEstudio ?? 'Pilates Central'}</span>
        </div>
        {demo && (
          <button
            type="button"
            class="selo-demo tocavel"
            onClick={() => avisar({ texto: 'Demonstração: dados fictícios, guardados só neste aparelho.', icone: 'info', duracao: 5000 })}
          >
            <span>Demonstração</span>
          </button>
        )}
      </header>

      <main class="conteudo" id="conteudo">
        {situacaoDoAluno.value === 'erro' ? (
          <EstadoVazio icone="info" rotulo="Não abriu" texto={mensagemDeErroDoAluno.value}>
            {repo && (
              <Botao variante="secundario" icone="recomecar" onClick={() => void carregarAluno(repo)}>
                Tentar de novo
              </Botao>
            )}
          </EstadoVazio>
        ) : (
          <QuadroDeTela key={aba}>
            <Tela />
          </QuadroDeTela>
        )}
      </main>

      <BarraAbas itens={ABAS} atual={aba} aoEscolher={irParaAbaDoAluno} />
    </div>
  )
}
