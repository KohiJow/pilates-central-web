import { describe, expect, it } from 'vitest'
import { montarAula } from './agenda'
import { credito, registro, turma } from './apoio-de-teste'
import { dadosDoAluno, exclusaoDoAluno, nomeDoArquivoDeDados } from './privacidade'
import type { Aluno, Pagamento } from './tipos'

const aluno: Aluno = {
  id: 'a1',
  nome: 'Lúcia Gonçalves',
  unidadeId: 'u-centro',
  telefone: '5511900000012',
  email: 'lucia@example.com',
  vezesPorSemana: 2,
  situacao: 'ativo',
  observacao: 'Prefere a janela.',
  desde: '2025-03-10',
}

const pagamento: Pagamento = {
  id: 'pg-1',
  alunoId: 'a1',
  unidadeId: 'u-centro',
  competencia: '2026-10',
  valor: 28000,
  forma: 'pix',
  pagoEm: '2026-10-05',
  observacao: '',
}

describe('exportar os dados do aluno', () => {
  const t = turma({ alunosFixos: ['a1', 'a2'] })
  const r = registro({ turmaId: t.id, data: '2026-10-02', marcacoes: { a1: 'presente', a2: 'faltou' } })
  const aula = montarAula(t, '2026-10-02', r)
  const fontes = {
    aluno,
    unidades: [{ id: 'u-centro', nome: 'Centro', endereco: '', ativa: true }],
    turmas: [t],
    pagamentos: [pagamento, { ...pagamento, id: 'pg-2', alunoId: 'a2' }],
    creditos: [credito({ alunoId: 'a1' }), credito({ id: 'outro', alunoId: 'a2' })],
    participacoes: aula.participantes.map((participante) => ({ aula, participante })),
    geradoEm: '2026-10-09T13:00:00.000Z',
    nomeEstudio: 'Pilates Central',
  }

  it('junta cadastro, turmas, presenças, créditos e pagamentos só dele', () => {
    const dados = dadosDoAluno({ ...fontes, financeiro: { alunoId: 'a1', unidadeId: 'u-centro', valorMensal: 28000, formaPreferida: 'pix', diaVencimento: 10 } })
    expect(dados.cadastro).toMatchObject({ nome: 'Lúcia Gonçalves', unidade: 'Centro', plano: '2x por semana', acessoAoApp: 'não' })
    expect(dados.turmasFixas).toEqual([{ dia: 'sexta', horario: '07:00', unidade: 'Centro' }])
    expect(dados.presencas).toEqual([{ data: '2026-10-02', dia: 'sexta', horario: '07:00', tipo: 'turma fixa', marcacao: 'presente' }])
    expect(dados.pagamentos).toHaveLength(1)
    expect(dados.creditosDeReposicao).toHaveLength(1)
    expect(dados.mensalidade).toEqual({ valorEmCentavos: 28000, formaPreferida: 'Pix', diaDeVencimento: 10 })
    expect(JSON.stringify(dados)).not.toContain('a2')
  })

  it('sem o financeiro (quem exporta não vê valores), a mensalidade fica de fora', () => {
    expect(dadosDoAluno(fontes)).not.toHaveProperty('mensalidade')
  })

  it('nome do arquivo sem acento nem espaço', () => {
    expect(nomeDoArquivoDeDados(aluno, '2026-10-09')).toBe('dados-lucia-goncalves-2026-10-09.json')
  })
})

describe('excluir o aluno', () => {
  it('sai das turmas, das aulas de hoje em diante e perde os créditos; o passado fica', () => {
    const t1 = turma({ id: 't1', alunosFixos: ['a1', 'a2'], fixosDesde: { a1: '2026-01-01', a2: '2026-02-01' } })
    const t2 = turma({ id: 't2', alunosFixos: ['a2'] })
    const passado = registro({ turmaId: 't1', data: '2026-10-02', marcacoes: { a1: 'presente' } })
    const futuro = registro({ turmaId: 't1', data: '2026-10-16', marcacoes: { a1: 'avisou', a2: 'avisou' } })
    const repondo = registro({ turmaId: 't2', data: '2026-10-12', reposicoes: { a1: 'cr-1' } })
    const e = exclusaoDoAluno('a1', [t1, t2], [passado, futuro, repondo], [credito({ id: 'cr-1', alunoId: 'a1' }), credito({ id: 'cr-2', alunoId: 'a2' })], '2026-10-09', 'agora')
    expect(e.turmas).toEqual([{ ...t1, alunosFixos: ['a2'], fixosDesde: { a2: '2026-02-01' } }])
    expect(e.registros.map((r) => r.id)).toEqual(['t1_2026-10-16', 't2_2026-10-12'])
    expect(e.registros[0]?.marcacoes).toEqual({ a2: 'avisou' })
    expect(e.registros[1]?.reposicoes).toEqual({})
    expect(e.creditosRemovidos).toEqual(['cr-1'])
  })
})
