import type { Alteracoes } from '../dominio/presenca'
import type { CreditoReposicao, Id, RegistroAula } from '../dominio/tipos'

/**
 * Monta a gravação que desfaz `feito`, mexendo só no que `feito` mudou. Se outra pessoa (ou
 * outra ação) alterou outro aluno da mesma aula nesse meio tempo, isso é preservado.
 */
export function inversoDe(
  feito: Alteracoes,
  antes: { registro: (id: string) => RegistroAula | undefined; credito: (id: Id) => CreditoReposicao | undefined },
  agora: { registro: (id: string) => RegistroAula | undefined },
  instante: string,
): Alteracoes {
  const registros = feito.registros.map((depois) => {
    const anterior = antes.registro(depois.id)
    const atual = agora.registro(depois.id) ?? depois
    const novo: RegistroAula = {
      ...atual,
      marcacoes: { ...atual.marcacoes },
      reposicoes: { ...atual.reposicoes },
      atualizadoEm: instante,
    }
    reverterCampo(novo.marcacoes, anterior?.marcacoes ?? {}, depois.marcacoes)
    reverterCampo(novo.reposicoes, anterior?.reposicoes ?? {}, depois.reposicoes)
    if (JSON.stringify(anterior?.cancelamento) !== JSON.stringify(depois.cancelamento)) {
      if (anterior?.cancelamento) novo.cancelamento = { ...anterior.cancelamento }
      else delete novo.cancelamento
    }
    return novo
  })
  const creditos: CreditoReposicao[] = []
  const creditosRemovidos: Id[] = []
  for (const id of new Set([...feito.creditos.map((c) => c.id), ...feito.creditosRemovidos])) {
    const anterior = antes.credito(id)
    if (anterior) creditos.push(anterior)
    else creditosRemovidos.push(id)
  }
  return { registros, creditos, creditosRemovidos }
}

function reverterCampo<V>(alvo: Record<string, V>, antes: Record<string, V>, depois: Record<string, V>): void {
  for (const chave of new Set([...Object.keys(antes), ...Object.keys(depois)])) {
    if (antes[chave] === depois[chave]) continue
    const valor = antes[chave]
    if (valor === undefined) delete alvo[chave]
    else alvo[chave] = valor
  }
}
