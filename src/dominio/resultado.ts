// Regras de negócio devolvem um resultado em vez de lançar exceção: a interface sempre
// precisa explicar o "não" para a pessoa, então o motivo é parte do valor de retorno.

export type CodigoRecusa =
  | 'aula-cancelada'
  | 'aula-no-futuro'
  | 'aula-encerrada'
  | 'aluno-fora-da-aula'
  | 'aluno-ja-na-aula'
  | 'reposicao-nao-avisa'
  | 'credito-ja-usado'
  | 'credito-indisponivel'
  | 'credito-de-outra-unidade'
  | 'credito-vencido'
  | 'mesma-aula'
  | 'sem-vaga'
  | 'turma-cheia'
  | 'conflito'
  | 'dados-invalidos'
  | 'sem-permissao'
  | 'nada-a-fazer'

export type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; codigo: CodigoRecusa; mensagem: string }

/** Erros de formulário por campo, em português simples. Objeto vazio = tudo certo. */
export type ErrosDeCampo<C extends string = string> = Partial<Record<C, string>>

export function semErros(erros: ErrosDeCampo): boolean {
  return Object.keys(erros).length === 0
}

export function aceito<T>(valor: T): Resultado<T> {
  return { ok: true, valor }
}

export function recusado<T>(codigo: CodigoRecusa, mensagem: string): Resultado<T> {
  return { ok: false, codigo, mensagem }
}
