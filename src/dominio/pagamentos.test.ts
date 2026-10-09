import { describe, expect, it } from 'vitest'
import {
  deslocarCompetencia,
  emReais,
  historicoRecebido,
  lerValor,
  mensagemDeLembrete,
  nomeDaCompetencia,
  novoPagamento,
  planilhaDoMes,
  resumoDoMes,
  ultimasCompetencias,
  validarPagamento,
  valorSugerido,
} from './pagamentos'
import type { Aluno, FinanceiroDoAluno, Pagamento } from './tipos'

function aluno(id: string, parcial: Partial<Aluno> = {}): Aluno {
  return {
    id,
    nome: `Aluno ${id.toUpperCase()}`,
    unidadeId: 'u-centro',
    telefone: '',
    email: '',
    vezesPorSemana: 2,
    situacao: 'ativo',
    observacao: '',
    desde: '2026-01-10',
    ...parcial,
  }
}

function fin(alunoId: string, parcial: Partial<FinanceiroDoAluno> = {}): FinanceiroDoAluno {
  return { alunoId, unidadeId: 'u-centro', valorMensal: 28_000, formaPreferida: 'pix', diaVencimento: 10, ...parcial }
}

function pagamento(alunoId: string, parcial: Partial<Pagamento> = {}): Pagamento {
  return {
    id: `pg-${alunoId}-${parcial.competencia ?? '2026-10'}-${parcial.valor ?? 28_000}`,
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

const HOJE = '2026-10-12'

describe('resumo do mês', () => {
  const alunos = [
    aluno('a'),
    aluno('b', { vezesPorSemana: 3 }),
    aluno('c', { unidadeId: 'u-jardim' }),
    aluno('d', { situacao: 'pausado' }),
    aluno('e'),
    aluno('novo', { desde: '2026-11-03' }),
  ]
  const financeiro = new Map(
    [
      fin('a'),
      fin('b', { valorMensal: 36_000, diaVencimento: 15 }),
      fin('c', { unidadeId: 'u-jardim' }),
      fin('d'),
      fin('e', { diaVencimento: 5 }),
      fin('novo'),
    ].map((f) => [f.alunoId, f]),
  )
  const pagamentos = [
    pagamento('a'),
    pagamento('c', { unidadeId: 'u-jardim', forma: 'dinheiro' }),
    pagamento('b', { competencia: '2026-09' }),
    // pagou parte
    pagamento('e', { valor: 10_000, forma: 'gympass' }),
    // pausado agora, mas pagou o mês
    pagamento('d', { forma: 'totalpass' }),
  ]

  it('previsto dos ativos, recebido do mês, em aberto por aluno e por forma', () => {
    const r = resumoDoMes(alunos, financeiro, pagamentos, '2026-10', HOJE)
    expect(r.alunosAtivos).toBe(4)
    expect(r.previsto).toBe(28_000 + 36_000 + 28_000 + 28_000)
    expect(r.recebido).toBe(28_000 + 28_000 + 10_000 + 28_000)
    expect(r.emAberto).toBe(36_000 + 18_000)
    expect(r.porForma.map((f) => [f.forma, f.valor, f.quantidade])).toEqual([
      ['pix', 28_000, 1],
      ['dinheiro', 28_000, 1],
      ['totalpass', 28_000, 1],
      ['gympass', 10_000, 1],
    ])
  })

  it('em aberto: atrasados primeiro, com o quanto falta e o vencimento', () => {
    const r = resumoDoMes(alunos, financeiro, pagamentos, '2026-10', HOJE)
    expect(r.abertos.map((s) => [s.alunoId, s.falta, s.vencimento, s.atrasado])).toEqual([
      ['e', 18_000, '2026-10-05', true],
      ['b', 36_000, '2026-10-15', false],
    ])
  })

  it('filtra por unidade', () => {
    const r = resumoDoMes(alunos, financeiro, pagamentos, '2026-10', HOJE, 'u-jardim')
    expect(r).toMatchObject({ alunosAtivos: 1, previsto: 28_000, recebido: 28_000, emAberto: 0, abertos: [] })
  })

  it('quem entrou depois do mês não deve aquele mês', () => {
    const r = resumoDoMes(alunos, financeiro, pagamentos, '2026-10', HOJE)
    expect(r.abertos.some((s) => s.alunoId === 'novo')).toBe(false)
  })

  it('histórico do que entrou nos últimos meses', () => {
    expect(historicoRecebido(pagamentos, ultimasCompetencias('2026-10', 3))).toEqual([
      { competencia: '2026-08', recebido: 0 },
      { competencia: '2026-09', recebido: 28_000 },
      { competencia: '2026-10', recebido: 94_000 },
    ])
  })
})

describe('valores e meses', () => {
  it('lê o valor como a pessoa digita', () => {
    expect(lerValor('280')).toBe(28_000)
    expect(lerValor('280,5')).toBe(28_050)
    expect(lerValor('R$ 1.280,50')).toBe(128_050)
    expect(lerValor('280.50')).toBe(28_050)
    expect(lerValor('1.280')).toBe(128_000)
    expect(lerValor('dez')).toBeNull()
    expect(lerValor('')).toBeNull()
    expect(lerValor('2,555')).toBeNull()
  })

  it('formata reais', () => {
    expect(emReais(28_000).replace(/\s/g, ' ')).toBe('R$ 280,00')
    expect(emReais(123_456).replace(/\s/g, ' ')).toBe('R$ 1.234,56')
  })

  it('anda pelos meses, inclusive virando o ano', () => {
    expect(deslocarCompetencia('2026-01', -1)).toBe('2025-12')
    expect(deslocarCompetencia('2026-12', 1)).toBe('2027-01')
    expect(ultimasCompetencias('2026-02', 6)).toEqual(['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'])
    expect(nomeDaCompetencia('2026-10')).toBe('outubro de 2026')
  })

  it('sugere o que falta do mês ou a mensalidade inteira', () => {
    expect(valorSugerido(fin('a'), 0)).toBe(28_000)
    expect(valorSugerido(fin('a'), 10_000)).toBe(18_000)
    expect(valorSugerido(fin('a'), 28_000)).toBe(28_000)
    expect(valorSugerido(undefined, 0)).toBe(0)
  })
})

describe('lançar pagamento', () => {
  const base = { valor: '280', forma: 'pix' as const, pagoEm: '2026-10-09', competencia: '2026-10', observacao: '' }

  it('valida cada campo em português', () => {
    expect(validarPagamento(base, '2026-10-09')).toEqual({})
    expect(validarPagamento({ ...base, valor: 'abc', forma: null, pagoEm: '2026-10-10', competencia: '2026-13' }, '2026-10-09')).toEqual({
      valor: 'Digite o valor, por exemplo 280 ou 280,50.',
      forma: 'Escolha a forma de pagamento.',
      pagoEm: 'A data não pode ser depois de hoje.',
      competencia: 'Escolha o mês da mensalidade.',
    })
    expect(validarPagamento({ ...base, valor: '0' }, '2026-10-09').valor).toBe('O valor tem que ser maior que zero.')
    expect(validarPagamento({ ...base, valor: '28000,00' }, '2026-10-09').valor).toBe('Valor alto demais. Confira os zeros.')
  })

  it('monta o pagamento com a unidade do aluno e quem lançou', () => {
    expect(novoPagamento({ ...base, valor: '150,00', forma: 'totalpass' }, aluno('a'), 'pg1', 'adm')).toEqual({
      id: 'pg1',
      alunoId: 'a',
      unidadeId: 'u-centro',
      competencia: '2026-10',
      valor: 15_000,
      forma: 'totalpass',
      pagoEm: '2026-10-09',
      observacao: '',
      registradoPorId: 'adm',
    })
  })
})

describe('lembrete e planilha', () => {
  it('lembrete educado com mês, valor e vencimento', () => {
    expect(
      mensagemDeLembrete({
        nomeAluno: 'Ana Souza',
        nomeEstudio: 'Pilates Central',
        competencia: '2026-10',
        valor: 28_000,
        vencimento: '2026-10-10',
        atrasado: true,
      }),
    ).toBe(
      'Oi, Ana! Tudo bem? Aqui é do Pilates Central. Passando para lembrar da mensalidade de outubro (R$ 280,00), que venceu em 10/10. Se já pagou, pode desconsiderar. Obrigado!',
    )
  })

  it('planilha abre no Excel em português e não deixa nome virar fórmula', () => {
    const alunos = [aluno('a', { nome: '=SOMA(A1)' }), aluno('b', { nome: 'Bia "da manhã"; turma 2' })]
    const financeiro = new Map([fin('a'), fin('b')].map((f) => [f.alunoId, f]))
    const r = resumoDoMes(alunos, financeiro, [pagamento('a', { observacao: 'pagou na recepção' })], '2026-10', HOJE)
    const nomes = new Map(alunos.map((x) => [x.id, x.nome]))
    const csv = planilhaDoMes(r, (id) => nomes.get(id) ?? '', () => 'Centro')
    expect(csv.startsWith('\uFEFFAluno;Unidade;Mês;Situação;Valor;Forma;Data;Observação\r\n')).toBe(true)
    expect(csv).toContain("'=SOMA(A1);Centro;10/2026;pago;280,00;Pix;05/10/2026;pagou na recepção\r\n")
    expect(csv).toContain('"Bia ""da manhã""; turma 2";Centro;10/2026;atrasado;280,00;;10/10/2026;\r\n')
  })
})
