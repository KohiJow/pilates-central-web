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
