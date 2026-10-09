import { rota } from '../../app/navegacao'
import { CentralDeReposicao } from '../reposicao/CentralDeReposicao'
import { DetalheDaTurma } from '../turmas/DetalheDaTurma'
import { FormularioDaTurma } from '../turmas/FormularioDaTurma'
import { GradeDeTurmas } from '../turmas/GradeDeTurmas'
import { FichaDoAluno } from './FichaDoAluno'
import { FormularioDoAluno } from './FormularioDoAluno'
import { ListaDeAlunos } from './ListaDeAlunos'

/**
 * Aba Alunos: lista, turmas e reposições no primeiro nível; ficha, turma e formulários abertos
 * por cima (#/alunos/a-10, #/alunos/turmas/t-x/editar, #/alunos/novo).
 */
export function Alunos() {
  const [primeiro, segundo, terceiro] = rota.value.caminho
  if (!primeiro) return <ListaDeAlunos />
  if (primeiro === 'turmas') {
    if (!segundo) return <GradeDeTurmas />
    if (segundo === 'nova') return <FormularioDaTurma />
    if (terceiro === 'editar') return <FormularioDaTurma turmaId={segundo} />
    return <DetalheDaTurma turmaId={segundo} />
  }
  if (primeiro === 'reposicoes') return <CentralDeReposicao />
  if (primeiro === 'novo') return <FormularioDoAluno />
  if (segundo === 'editar') return <FormularioDoAluno alunoId={primeiro} />
  return <FichaDoAluno alunoId={primeiro} />
}
