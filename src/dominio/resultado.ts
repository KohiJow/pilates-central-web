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
  | 'nada-a-fazer'

export type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; codigo: CodigoRecusa; mensagem: string }

export function aceito<T>(valor: T): Resultado<T> {
  return { ok: true, valor }
}

export function recusado<T>(codigo: CodigoRecusa, mensagem: string): Resultado<T> {
  return { ok: false, codigo, mensagem }
}
