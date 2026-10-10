import { trocarSecao } from '../../app/navegacao'
import { Secoes } from '../../componentes/Secoes'

export type SecaoDeAlunos = 'lista' | 'turmas' | 'reposicoes'

const SECOES = [
  { id: 'lista', rotulo: 'Alunos' },
  { id: 'turmas', rotulo: 'Turmas' },
  { id: 'reposicoes', rotulo: 'Reposições' },
] as const

const CAMINHO: Record<SecaoDeAlunos, string[]> = { lista: [], turmas: ['turmas'], reposicoes: ['reposicoes'] }
const ORDEM = ['', 'turmas', 'reposicoes']

const TITULO: Record<SecaoDeAlunos, string> = {
  lista: 'Alunos',
  turmas: 'Turmas da semana',
  reposicoes: 'Reposições',
}

/**
 * Topo da aba Alunos: título da seção e a troca entre alunos, turmas e reposições. Fica no lugar
 * quando a seção troca (só o conteúdo abaixo entra deslizando), então a marca da seção escolhida
 * desliza de uma para a outra.
 */
export function CabecaDeAlunos({ atual, idTitulo }: { atual: SecaoDeAlunos; idTitulo: string }) {
  return (
    <header class="cabecalho-de-tela">
      <p class="micro">Gestão</p>
      <h1 id={idTitulo} class="titulo">
        {TITULO[atual]}
      </h1>
      <Secoes secoes={SECOES} atual={atual} rotulo="Seções" aoEscolher={(id) => trocarSecao(CAMINHO[id], ORDEM)} />
    </header>
  )
}
