import { describe, expect, it } from 'vitest'
import type { Armazenamento } from './repositorioDemonstracao'
import { CHAVE_DO_BANCO, criarRepositorioDeDemonstracao } from './repositorioDemonstracao'

function memoria(): Armazenamento & { dados: Map<string, string> } {
  const dados = new Map<string, string>()
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
    removeItem: (k) => void dados.delete(k),
  }
}

const agora = () => new Date('2026-10-09T10:00:00-03:00')

describe('repositório de demonstração', () => {
  it('na primeira vez gera os dados e guarda no aparelho', async () => {
    const arm = memoria()
    const repo = criarRepositorioDeDemonstracao({ armazenamento: arm, agora })
    const base = await repo.carregarBase()
    expect(base.alunos).toHaveLength(40)
    expect(arm.dados.has(CHAVE_DO_BANCO)).toBe(true)
    expect(repo.persistente).toBe(true)
  })

  it('grava e outra instância lê o que foi gravado', async () => {
    const arm = memoria()
    const repo = criarRepositorioDeDemonstracao({ armazenamento: arm, agora })
    const [r] = await repo.registros({ de: '2026-10-08', ate: '2026-10-08' })
    if (!r) throw new Error('esperava registro em 8/10')
    await repo.salvar({ registros: [{ ...r, marcacoes: { ...r.marcacoes, extra: 'presente' } }] })
    const outro = criarRepositorioDeDemonstracao({ armazenamento: arm, agora })
    const relidos = await outro.registros({ de: '2026-10-08', ate: '2026-10-08' })
    expect(relidos.find((x) => x.id === r.id)?.marcacoes.extra).toBe('presente')
  })

  it('remove e cria créditos na mesma gravação', async () => {
    const repo = criarRepositorioDeDemonstracao({ armazenamento: memoria(), agora })
    const [c] = await repo.creditos()
    if (!c) throw new Error('esperava crédito')
    await repo.salvar({ creditosRemovidos: [c.id], creditos: [{ ...c, id: 'novo' }] })
    const ids = (await repo.creditos()).map((x) => x.id)
    expect(ids).toContain('novo')
    expect(ids).not.toContain(c.id)
  })

  it('grava cadastros: troca os que já existem, acrescenta os novos e mantém a ordem', async () => {
    const arm = memoria()
    const repo = criarRepositorioDeDemonstracao({ armazenamento: arm, agora })
    const base = await repo.carregarBase()
    const [primeiro, segundo] = base.alunos
    if (!primeiro || !segundo) throw new Error('esperava alunos')
    const novo = { ...primeiro, id: 'a-novo', nome: 'Aluno Novo' }
    const [fin] = await repo.financeiro()
    if (!fin) throw new Error('esperava financeiro')
    await repo.salvar({
      alunos: [{ ...segundo, nome: 'Nome Trocado' }, novo],
      financeiro: [{ ...fin, alunoId: 'a-novo', valorMensal: 1 }],
      configuracao: { ...base.configuracao, nomeEstudio: 'Outro Nome' },
    })
    const outro = criarRepositorioDeDemonstracao({ armazenamento: arm, agora })
    const relida = await outro.carregarBase()
    expect(relida.alunos).toHaveLength(41)
    expect(relida.alunos[1]?.nome).toBe('Nome Trocado')
    expect(relida.alunos.at(-1)?.id).toBe('a-novo')
    expect(relida.configuracao.nomeEstudio).toBe('Outro Nome')
    expect((await outro.financeiro()).find((f) => f.alunoId === 'a-novo')?.valorMensal).toBe(1)
  })

  it('devolve cópias: mexer no retorno não muda o banco', async () => {
    const repo = criarRepositorioDeDemonstracao({ armazenamento: memoria(), agora })
    const base = await repo.carregarBase()
    base.alunos.length = 0
    expect((await repo.carregarBase()).alunos).toHaveLength(40)
  })

  it('filtra registros por intervalo e pagamentos por competência', async () => {
    const repo = criarRepositorioDeDemonstracao({ armazenamento: memoria(), agora })
    const registros = await repo.registros({ de: '2026-10-05', ate: '2026-10-06' })
    expect(registros.length).toBeGreaterThan(0)
    expect(registros.every((r) => r.data >= '2026-10-05' && r.data <= '2026-10-06')).toBe(true)
    const pagamentos = await repo.pagamentos(['2026-10'])
    expect(pagamentos.every((p) => p.competencia === '2026-10')).toBe(true)
  })

  it('banco corrompido ou de outra versão é gerado de novo', async () => {
    const arm = memoria()
    arm.setItem(CHAVE_DO_BANCO, '{"versao":0}')
    const repo = criarRepositorioDeDemonstracao({ armazenamento: arm, agora })
    expect((await repo.carregarBase()).alunos).toHaveLength(40)
    arm.setItem(CHAVE_DO_BANCO, 'isto não é json')
    const outro = criarRepositorioDeDemonstracao({ armazenamento: arm, agora })
    expect((await outro.carregarBase()).unidades).toHaveLength(2)
  })

  it('sem poder gravar (aba anônima), segue funcionando na memória', async () => {
    const quebrado: Armazenamento = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => undefined,
    }
    const repo = criarRepositorioDeDemonstracao({ armazenamento: quebrado, agora })
    const [c] = await repo.creditos()
    expect(repo.persistente).toBe(false)
    if (c) await repo.salvar({ creditosRemovidos: [c.id] })
    expect((await repo.creditos()).some((x) => x.id === c?.id)).toBe(false)
  })

  it('recomeçar volta os dados ao estado inicial', async () => {
    const arm = memoria()
    const repo = criarRepositorioDeDemonstracao({ armazenamento: arm, agora })
    const antes = arm.dados.get(CHAVE_DO_BANCO) ?? (await repo.carregarBase(), arm.dados.get(CHAVE_DO_BANCO))
    const [c] = await repo.creditos()
    if (c) await repo.salvar({ creditosRemovidos: [c.id] })
    await repo.recomecar()
    expect(arm.dados.get(CHAVE_DO_BANCO)).toBe(antes)
  })
})

describe('registro de alterações na demonstração', () => {
  it('guarda as linhas junto com a gravação e devolve as mais recentes primeiro', async () => {
    const arm = memoria()
    const repo = criarRepositorioDeDemonstracao({ armazenamento: arm, agora })
    await repo.carregarBase()
    expect(await repo.auditoria(10)).toEqual([])
    const linha = (id: string, em: string) => ({ id, acao: 'pagamento-lancado' as const, porId: 'e-helena', alvoId: 'a-10', detalhe: 'R$ 1,00', em })
    await repo.salvar({ auditoria: [linha('au-1', '2026-10-08T10:00:00.000Z')] })
    await repo.salvar({ auditoria: [linha('au-2', '2026-10-09T10:00:00.000Z')] })
    const outro = criarRepositorioDeDemonstracao({ armazenamento: arm, agora })
    expect((await outro.auditoria(10)).map((r) => r.id)).toEqual(['au-2', 'au-1'])
    expect((await outro.auditoria(1)).map((r) => r.id)).toEqual(['au-2'])
  })

  it('excluir o aluno apaga a observação dos pagamentos dele; o código fica', async () => {
    const repo = criarRepositorioDeDemonstracao({ armazenamento: memoria(), agora })
    await repo.carregarBase()
    const [p] = await repo.pagamentos(['2026-10'])
    if (!p) throw new Error('esperava pagamento')
    await repo.salvar({ pagamentos: [{ ...p, observacao: 'pagou com o cartão da mãe' }] })
    await repo.salvar({ alunosRemovidos: [p.alunoId] })
    const depois = (await repo.pagamentos(['2026-10'])).find((x) => x.id === p.id)
    expect(depois?.alunoId).toBe(p.alunoId)
    expect(depois?.observacao).toBe('')
    expect((await repo.carregarBase()).alunos.some((a) => a.id === p.alunoId)).toBe(false)
  })
})
