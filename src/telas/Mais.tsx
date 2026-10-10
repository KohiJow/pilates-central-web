import { rota } from '../app/navegacao'
import { Ajustes } from './mais/Ajustes'
import { DetalheDoMembro } from './mais/DetalheDoMembro'
import { Equipe } from './mais/Equipe'
import { FormularioDeMembro } from './mais/FormularioDeMembro'
import { FormularioDoEstudio } from './mais/FormularioDoEstudio'
import { RegistroDeAlteracoes } from './mais/RegistroDeAlteracoes'
import { RegrasDeReposicao } from './mais/RegrasDeReposicao'
import { Unidades } from './mais/Unidades'

/** Aba Mais: ajustes pessoais e, para a administração, estúdio, regras, unidades e equipe. */
export function Mais() {
  const [primeiro, segundo, terceiro] = rota.value.caminho
  if (primeiro === 'estudio') return <FormularioDoEstudio />
  if (primeiro === 'regras') return <RegrasDeReposicao />
  if (primeiro === 'unidades') return <Unidades />
  if (primeiro === 'alteracoes') return <RegistroDeAlteracoes />
  if (primeiro === 'equipe') {
    if (!segundo) return <Equipe />
    if (segundo === 'convidar') return <FormularioDeMembro />
    if (terceiro === 'editar') return <FormularioDeMembro membroId={segundo} />
    return <DetalheDoMembro membroId={segundo} />
  }
  return <Ajustes />
}
