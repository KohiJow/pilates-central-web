import type { Aluno, Centavos, Competencia, FormaPagamento, Id, Pagamento } from './tipos'

export const NOME_DA_FORMA: Record<FormaPagamento, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cartao_debito: 'Cartão de débito',
  cartao_credito: 'Cartão de crédito',
  transferencia: 'Transferência',
}

const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function emReais(valor: Centavos): string {
  // o Intl usa espaço não separável entre "R$" e o número; mantém assim para não quebrar linha
  return reais.format(valor / 100)
}

export function pagamentosDaCompetencia(pagamentos: readonly Pagamento[], competencia: Competencia): Pagamento[] {
  return pagamentos.filter((p) => p.competencia === competencia)
}

export interface ResumoFinanceiro {
  competencia: Competencia
  alunosAtivos: number
  /** soma das mensalidades dos alunos ativos */
  esperado: Centavos
  recebido: Centavos
  porForma: Partial<Record<FormaPagamento, Centavos>>
  /** alunos ativos sem pagamento na competência */
  pendentes: Aluno[]
}

export function resumoFinanceiro(
  alunos: readonly Aluno[],
  pagamentos: readonly Pagamento[],
  competencia: Competencia,
  unidadeId?: Id,
): ResumoFinanceiro {
  const daUnidade = (u: Id) => unidadeId === undefined || u === unidadeId
  const ativos = alunos.filter((a) => a.situacao === 'ativo' && daUnidade(a.unidadeId))
  const doMes = pagamentosDaCompetencia(pagamentos, competencia).filter((p) => daUnidade(p.unidadeId))
  const pagaram = new Set(doMes.map((p) => p.alunoId))
  const porForma: Partial<Record<FormaPagamento, Centavos>> = {}
  let recebido = 0
  for (const p of doMes) {
    recebido += p.valor
    porForma[p.forma] = (porForma[p.forma] ?? 0) + p.valor
  }
  return {
    competencia,
    alunosAtivos: ativos.length,
    esperado: ativos.reduce((s, a) => s + a.valorMensal, 0),
    recebido,
    porForma,
    pendentes: ativos.filter((a) => !pagaram.has(a.id)),
  }
}
