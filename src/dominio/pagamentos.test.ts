import { describe, expect, it } from 'vitest'
import { emReais, resumoFinanceiro } from './pagamentos'
import type { Aluno, Pagamento } from './tipos'

function aluno(id: string, parcial: Partial<Aluno> = {}): Aluno {
  return {
    id,
    nome: id,
    unidadeId: 'u-centro',
    telefone: '',
    email: '',
    vezesPorSemana: 2,
    situacao: 'ativo',
    valorMensal: 28_000,
    formaPagamento: 'pix',
    observacao: '',
    desde: '2026-01-10',
    ...parcial,
  }
}

function pagamento(alunoId: string, parcial: Partial<Pagamento> = {}): Pagamento {
  return {
    id: `pg-${alunoId}`,
    alunoId,
    unidadeId: 'u-centro',
    competencia: '2026-10',
    valor: 28_000,
    forma: 'pix',
    pagoEm: '2026-10-05',
    observacao: '',
    ...parcial,
  }
}

describe('financeiro', () => {
  const alunos = [
    aluno('a'),
    aluno('b', { valorMensal: 36_000, vezesPorSemana: 3 }),
    aluno('c', { unidadeId: 'u-jardim' }),
    aluno('d', { situacao: 'pausado' }),
  ]
  const pagamentos = [
    pagamento('a'),
    pagamento('c', { unidadeId: 'u-jardim', forma: 'dinheiro' }),
    pagamento('b', { competencia: '2026-09' }),
  ]

  it('soma o esperado dos ativos, o recebido no mês e lista pendentes', () => {
    const r = resumoFinanceiro(alunos, pagamentos, '2026-10')
    expect(r.alunosAtivos).toBe(3)
    expect(r.esperado).toBe(92_000)
    expect(r.recebido).toBe(56_000)
    expect(r.porForma).toEqual({ pix: 28_000, dinheiro: 28_000 })
    expect(r.pendentes.map((a) => a.id)).toEqual(['b'])
  })

  it('filtra por unidade', () => {
    const r = resumoFinanceiro(alunos, pagamentos, '2026-10', 'u-jardim')
    expect(r).toMatchObject({ alunosAtivos: 1, esperado: 28_000, recebido: 28_000, pendentes: [] })
  })

  it('formata reais', () => {
    expect(emReais(28_000).replace(/\s/g, ' ')).toBe('R$ 280,00')
    expect(emReais(123_456).replace(/\s/g, ' ')).toBe('R$ 1.234,56')
  })
})
