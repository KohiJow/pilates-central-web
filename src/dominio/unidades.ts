import { aceito, recusado } from './resultado'
import type { ErrosDeCampo, Resultado } from './resultado'
import { normalizar } from './texto'
import type { Aluno, Id, Turma, Unidade } from './tipos'

export interface RascunhoUnidade {
  nome: string
  endereco: string
}

export type CampoUnidade = keyof RascunhoUnidade

export function validarUnidade(r: RascunhoUnidade, unidades: readonly Unidade[], idAtual?: Id): ErrosDeCampo<CampoUnidade> {
  const erros: ErrosDeCampo<CampoUnidade> = {}
  const nome = r.nome.trim()
  if (nome.length < 2) erros.nome = 'Dê um nome para a unidade, por exemplo "Centro".'
  else if (nome.length > 40) erros.nome = 'Use um nome mais curto (até 40 letras).'
  else if (unidades.some((u) => u.id !== idAtual && normalizar(u.nome) === normalizar(nome))) {
    erros.nome = 'Já existe uma unidade com este nome.'
  }
  if (r.endereco.trim().length > 120) erros.endereco = 'Use no máximo 120 letras.'
  return erros
}

export function montarUnidade(r: RascunhoUnidade, id: Id, anterior?: Unidade): Unidade {
  return { id, nome: r.nome.trim(), endereco: r.endereco.trim(), ativa: anterior?.ativa ?? true }
}

/** Fechar uma unidade só depois de encerrar as turmas e mudar ou arquivar os alunos dela. */
export function desativarUnidade(
  unidade: Unidade,
  turmas: readonly Turma[],
  alunos: readonly Aluno[],
  unidades: readonly Unidade[],
): Resultado<Unidade> {
  if (!unidade.ativa) return recusado('nada-a-fazer', 'Esta unidade já está fechada.')
  if (unidades.filter((u) => u.ativa).length <= 1) return recusado('conflito', 'O estúdio precisa de pelo menos uma unidade aberta.')
  const turmasAtivas = turmas.filter((t) => t.ativa && t.unidadeId === unidade.id).length
  if (turmasAtivas > 0) return recusado('conflito', `A unidade ainda tem ${turmasAtivas === 1 ? '1 turma' : `${turmasAtivas} turmas`}. Encerre antes.`)
  const alunosAtivos = alunos.filter((a) => a.unidadeId === unidade.id && a.situacao !== 'inativo').length
  if (alunosAtivos > 0) {
    return recusado('conflito', `A unidade ainda tem ${alunosAtivos === 1 ? '1 aluno' : `${alunosAtivos} alunos`}. Mude de unidade ou arquive antes.`)
  }
  return aceito({ ...unidade, ativa: false })
}
