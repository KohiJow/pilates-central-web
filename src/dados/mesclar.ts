import type { DadosBase, Gravacao } from './repositorio'

/** Troca na lista os itens com o mesmo id e acrescenta os novos, sem mudar a ordem dos outros. */
export function mesclarPorId<T>(lista: readonly T[], novos: readonly T[] | undefined, id: (item: T) => string): T[] {
  if (!novos?.length) return [...lista]
  const porId = new Map(novos.map((n) => [id(n), n]))
  const saida = lista.map((item) => {
    const novo = porId.get(id(item))
    if (!novo) return item
    porId.delete(id(item))
    return novo
  })
  for (const novo of porId.values()) saida.push(novo)
  return saida
}

/** Os cadastros depois de uma gravação (mesma regra no repositório de demonstração e na tela). */
export function mesclarBase(base: DadosBase, g: Gravacao): DadosBase {
  if (!g.configuracao && !g.unidades?.length && !g.equipe?.length && !g.alunos?.length && !g.turmas?.length) return base
  return {
    configuracao: g.configuracao ?? base.configuracao,
    unidades: mesclarPorId(base.unidades, g.unidades, (u) => u.id),
    equipe: mesclarPorId(base.equipe, g.equipe, (m) => m.id),
    alunos: mesclarPorId(base.alunos, g.alunos, (a) => a.id),
    turmas: mesclarPorId(base.turmas, g.turmas, (t) => t.id),
  }
}
