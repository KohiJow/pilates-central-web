import { describe, expect, it } from 'vitest'
import {
  conferirPlano,
  filtrarAlunos,
  montarAluno,
  montarFinanceiro,
  mudarSituacao,
  telefoneRepetido,
  validarAluno,
  validarPlano,
} from './alunos'
import type { RascunhoAluno } from './alunos'
import { turma } from './apoio-de-teste'
import type { Aluno, Unidade } from './tipos'

const unidades: Unidade[] = [
  { id: 'u-centro', nome: 'Centro', endereco: '', ativa: true },
  { id: 'u-jardim', nome: 'Jardim', endereco: '', ativa: true },
  { id: 'u-fechada', nome: 'Fechada', endereco: '', ativa: false },
]

function aluno(id: string, parcial: Partial<Aluno> = {}): Aluno {
  return {
    id,
    nome: `Aluno ${id}`,
    unidadeId: 'u-centro',
    telefone: `55119000000${id.slice(-2)}`,
    email: '',
    vezesPorSemana: 2,
    situacao: 'ativo',
    observacao: '',
    desde: '2026-01-10',
    ...parcial,
  }
}

const rascunho = (parcial: Partial<RascunhoAluno> = {}): RascunhoAluno => ({
  nome: 'Ana Souza',
  telefone: '(11) 90000-0099',
  email: '',
  unidadeId: 'u-centro',
  vezesPorSemana: 2,
  observacao: '',
  desde: '2026-10-09',
  ...parcial,
})

const ctx = { unidades, turmas: [], hoje: '2026-10-09' }

describe('cadastro de aluno', () => {
  it('rascunho certo não tem erro e vira aluno ativo com telefone só em dígitos', () => {
    expect(validarAluno(rascunho(), ctx)).toEqual({})
    expect(montarAluno(rascunho({ nome: '  Ana   Souza ', email: 'ANA@example.com ' }), 'a-1')).toEqual({
      id: 'a-1',
      nome: 'Ana Souza',
      unidadeId: 'u-centro',
      telefone: '5511900000099',
      email: 'ana@example.com',
      vezesPorSemana: 2,
      situacao: 'ativo',
      observacao: '',
      desde: '2026-10-09',
    })
  })

  it('explica cada erro em português simples', () => {
    expect(
      validarAluno(
        rascunho({ nome: 'Ana', telefone: '9999', email: 'ana@', unidadeId: 'u-fechada', vezesPorSemana: 0, desde: '2026-10-10' }),
        ctx,
      ),
    ).toEqual({
      nome: 'Escreva nome e sobrenome, para não confundir com outro aluno.',
      telefone: 'Use DDD e número, por exemplo (19) 90000-0000.',
      email: 'Confira o e-mail (ou deixe em branco).',
      unidadeId: 'Escolha a unidade.',
      vezesPorSemana: 'Escolha quantas vezes por semana.',
      desde: 'A data de início não pode ser depois de hoje.',
    })
  })

  it('não troca de unidade quem ainda está em turma da outra unidade', () => {
    const turmas = [turma({ alunosFixos: ['a-1'] })]
    expect(validarAluno(rascunho({ unidadeId: 'u-jardim' }), { ...ctx, turmas, alunoId: 'a-1' }).unidadeId).toBe(
      'Tire o aluno das turmas da outra unidade antes de trocar.',
    )
  })

  it('plano: mensalidade e vencimento', () => {
    expect(validarPlano({ valorMensal: '280', formaPreferida: 'pix', diaVencimento: 10 })).toEqual({})
    expect(validarPlano({ valorMensal: '', formaPreferida: 'pix', diaVencimento: 31 })).toEqual({
      valorMensal: 'Digite a mensalidade, por exemplo 280.',
      diaVencimento: 'Escolha um dia de 1 a 28.',
    })
    expect(montarFinanceiro({ valorMensal: '280,50', formaPreferida: 'gympass', diaVencimento: 5 }, aluno('a-1'))).toEqual({
      alunoId: 'a-1',
      unidadeId: 'u-centro',
      valorMensal: 28_050,
      formaPreferida: 'gympass',
      diaVencimento: 5,
    })
  })

  it('avisa (sem impedir) quando outro aluno usa o mesmo telefone', () => {
    const alunos = [aluno('a-12'), aluno('a-13', { situacao: 'inativo' })]
    expect(telefoneRepetido('(11) 90000-0012', alunos)?.id).toBe('a-12')
    expect(telefoneRepetido('(11) 90000-0012', alunos, 'a-12')).toBeUndefined()
    expect(telefoneRepetido('(11) 90000-0013', alunos)).toBeUndefined()
  })
})

describe('situação do aluno', () => {
  const turmas = [turma({ id: 't1', alunosFixos: ['a-1', 'a-2'], fixosDesde: { 'a-1': '2026-02-01' } }), turma({ id: 't2' })]

  it('pausar guarda o lugar nas turmas', () => {
    const r = mudarSituacao(aluno('a-1'), 'pausado', turmas)
    expect(r).toMatchObject({ ok: true, valor: { aluno: { situacao: 'pausado' }, turmas: [] } })
  })

  it('arquivar tira das turmas e libera o lugar', () => {
    const r = mudarSituacao(aluno('a-1'), 'inativo', turmas)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valor.turmas).toHaveLength(1)
    expect(r.valor.turmas[0]?.alunosFixos).toEqual(['a-2'])
    expect(r.valor.turmas[0]?.fixosDesde).toEqual({})
  })

  it('não pausa nem arquiva quem tem reposição marcada', () => {
    expect(mudarSituacao(aluno('a-1', { nome: 'Ana Souza' }), 'pausado', turmas, ['2026-10-14', '2026-10-12'])).toMatchObject({
      ok: false,
      mensagem: 'Ana tem reposição marcada em 12/10. Desfaça antes.',
    })
  })

  it('mudar para a mesma situação não faz nada', () => {
    expect(mudarSituacao(aluno('a-1'), 'ativo', turmas)).toMatchObject({ ok: false, codigo: 'nada-a-fazer' })
  })
})

describe('busca e filtros', () => {
  const alunos = [
    aluno('a-10', { nome: 'Conceição Lima' }),
    aluno('a-11', { nome: 'Bruno Alves', unidadeId: 'u-jardim' }),
    aluno('a-12', { nome: 'Ana Dias', situacao: 'pausado' }),
    aluno('a-13', { nome: 'Antônio Reis', situacao: 'inativo' }),
  ]

  it('sem filtro: ativos e pausados em ordem alfabética, arquivados de fora', () => {
    expect(filtrarAlunos(alunos, { busca: '' }).map((a) => a.id)).toEqual(['a-12', 'a-11', 'a-10'])
  })

  it('busca sem acento e por final do telefone', () => {
    expect(filtrarAlunos(alunos, { busca: 'conceicao' }).map((a) => a.id)).toEqual(['a-10'])
    expect(filtrarAlunos(alunos, { busca: '0011' }).map((a) => a.id)).toEqual(['a-11'])
  })

  it('filtra por unidade e por situação', () => {
    expect(filtrarAlunos(alunos, { busca: '', unidadeId: 'u-jardim' }).map((a) => a.id)).toEqual(['a-11'])
    expect(filtrarAlunos(alunos, { busca: '', situacao: 'inativo' }).map((a) => a.id)).toEqual(['a-13'])
    expect(filtrarAlunos(alunos, { busca: '', situacao: 'pausado' }).map((a) => a.id)).toEqual(['a-12'])
  })
})

describe('plano e turmas', () => {
  it('avisa quando o plano não bate com as turmas', () => {
    const turmas = [turma({ id: 't1', alunosFixos: ['a-1'] }), turma({ id: 't2', alunosFixos: ['a-2'] })]
    expect(conferirPlano(aluno('a-1', { vezesPorSemana: 3 }), turmas).aviso).toBe('Plano de 3x por semana, mas está em 1 turma.')
    expect(conferirPlano(aluno('a-3'), turmas).aviso).toBe('Plano de 2x por semana, mas não está em nenhuma turma.')
    expect(conferirPlano(aluno('a-2', { vezesPorSemana: 1 }), turmas).aviso).toBeUndefined()
  })

  it('turma encerrada não conta', () => {
    const turmas = [turma({ id: 't1', alunosFixos: ['a-1'], ativa: false })]
    expect(conferirPlano(aluno('a-1', { vezesPorSemana: 1 }), turmas).turmas).toBe(0)
  })
})
