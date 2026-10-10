import type { JSX } from 'preact'
import { QuadroDeTela } from '../../app/Estrutura'
import { rota, secaoDaAba } from '../../app/navegacao'
import { CentralDeReposicao } from '../reposicao/CentralDeReposicao'
import { DetalheDaTurma } from '../turmas/DetalheDaTurma'
import { FormularioDaTurma } from '../turmas/FormularioDaTurma'
import { GradeDeTurmas } from '../turmas/GradeDeTurmas'
import { CabecaDeAlunos } from './CabecaDeAlunos'
import type { SecaoDeAlunos } from './CabecaDeAlunos'
import { FichaDoAluno } from './FichaDoAluno'
import { FormularioDoAluno } from './FormularioDoAluno'
import { ImportarAlunos, ImportarTurmas } from './Importacao'
import { ListaDeAlunos } from './ListaDeAlunos'

const SECAO: Record<string, SecaoDeAlunos> = { '': 'lista', turmas: 'turmas', reposicoes: 'reposicoes' }
const CONTEUDO: Record<SecaoDeAlunos, () => JSX.Element> ={ lista: ListaDeAlunos, turmas: GradeDeTurmas, reposicoes: CentralDeReposicao }
const ID_DO_TITULO: Record<SecaoDeAlunos, string> = { lista: 'titulo-alunos', turmas: 'titulo-turmas', reposicoes: 'titulo-reposicoes' }

/**
 * Aba Alunos: lista, turmas e reposições no primeiro nível; ficha, turma e formulários abertos
 * por cima (#/alunos/a-10, #/alunos/turmas/t-x/editar, #/alunos/novo).
 * Entre as três seções só o conteúdo troca, num quadro próprio que entra do lado escolhido: o
 * cabeçalho fica, e a marca da seção desliza até a nova.
 */
export function Alunos() {
  const r = rota.value
  const secao = secaoDaAba(r)
  if (secao !== null) {
    const atual = SECAO[secao] ?? 'lista'
    const Conteudo = CONTEUDO[atual]
    return (
      <section class="tela" aria-labelledby={ID_DO_TITULO[atual]}>
        <CabecaDeAlunos atual={atual} idTitulo={ID_DO_TITULO[atual]} />
        <QuadroDeTela key={atual} classe="secao-quadro">
          <Conteudo />
        </QuadroDeTela>
      </section>
    )
  }
  const [primeiro, segundo, terceiro] = r.caminho
  if (primeiro === 'turmas') {
    if (segundo === 'nova') return <FormularioDaTurma />
    if (segundo === 'importar') return <ImportarTurmas />
    if (terceiro === 'editar') return <FormularioDaTurma turmaId={segundo ?? ''} />
    return <DetalheDaTurma turmaId={segundo ?? ''} />
  }
  if (primeiro === 'novo') return <FormularioDoAluno />
  if (primeiro === 'importar') return <ImportarAlunos />
  if (segundo === 'editar') return <FormularioDoAluno alunoId={primeiro} />
  return <FichaDoAluno alunoId={primeiro ?? ''} />
}
