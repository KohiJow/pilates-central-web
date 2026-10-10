// O guia de primeiro uso abre sozinho para a administração quando o estúdio de verdade ainda está
// vazio (sem turma e sem aluno), a não ser que a pessoa já tenha saído dele neste aparelho. Na
// demonstração ele nunca abre sozinho (fica em Mais, Montar o estúdio, como prévia).
import { base } from '../dados/estado'
import { estudioVazio, passoInicial } from '../dominio/montagem'
import { ehAdministracao } from '../dominio/permissoes'
import type { Papel } from '../dominio/tipos'
import { guiaDispensado } from '../telas/montar/estadoDaMontagem'
import { irPara } from './navegacao'

export function abrirGuiaSePreciso(papel: Papel): void {
  const b = base.peek()
  if (!b || !ehAdministracao(papel) || !estudioVazio(b) || guiaDispensado()) return
  irPara('mais', papel, ['montar', passoInicial(b)])
}
