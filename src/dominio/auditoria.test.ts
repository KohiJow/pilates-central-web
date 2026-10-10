import { describe, expect, it } from 'vitest'
import { DETALHE_MAXIMO, descreverAuditoria, detalheDoPagamento, ordenarAuditoria, quandoFoi, registroDeAuditoria } from './auditoria'
import type { Nomes } from './auditoria'

const nomes: Nomes = {
  equipe: (id) => ({ 'e-helena': 'Helena Prado', 'e-marcos': 'Marcos Teles' })[id],
  aluno: (id) => ({ 'a-10': 'Ana Almeida' })[id],
}

describe('registro de alterações', () => {
  it('descreve cada ação em português, com os nomes de agora', () => {
    const em = '2026-10-09T17:03:00.000Z'
    const r = (acao: Parameters<typeof registroDeAuditoria>[1], alvo: string, detalhe = '') => registroDeAuditoria('au-1', acao, 'e-helena', alvo, em, detalhe)
    // emReais usa espaço fixo depois do R$
    expect(descreverAuditoria(r('pagamento-lancado', 'a-10', detalheDoPagamento(28000, '2026-10')), nomes)).toMatch(
      /^Helena Prado lançou R\$\s280,00, outubro de 2026 de Ana Almeida$/,
    )
    expect(descreverAuditoria(r('pagamento-apagado', 'a-10', 'R$ 10,00, outubro de 2026'), nomes)).toMatch(/apagou o lançamento de R\$ 10,00/)
    expect(descreverAuditoria(r('acesso-do-aluno-liberado', 'a-10'), nomes)).toBe('Helena Prado liberou o app para Ana Almeida')
    expect(descreverAuditoria(r('papel-mudado', 'e-marcos', 'Administração'), nomes)).toBe('Helena Prado mudou Marcos Teles para Administração')
    expect(descreverAuditoria(r('conta-passada', 'e-marcos'), nomes)).toMatch(/passou a conta do estúdio para Marcos Teles/)
  })

  it('aluno excluído aparece só pelo código, e quem saiu da equipe também', () => {
    const r = registroDeAuditoria('au-2', 'aluno-excluido', 'e-sumiu', 'a-99', '2026-10-09T17:03:00.000Z')
    expect(descreverAuditoria(r, nomes)).toBe('alguém da equipe (e-sumiu) excluiu o cadastro a-99 a pedido do aluno')
    const p = registroDeAuditoria('au-3', 'pagamento-lancado', 'e-helena', 'a-99', '2026-10-09T17:03:00.000Z', 'R$ 1,00, outubro de 2026')
    expect(descreverAuditoria(p, nomes)).toBe('Helena Prado lançou R$ 1,00, outubro de 2026 de aluno removido (a-99)')
  })

  it('o complemento tem teto e a data sai no relógio do estúdio', () => {
    expect(registroDeAuditoria('x', 'pagamento-lancado', 'e', 'a', '2026-10-09T17:03:00.000Z', 'x'.repeat(500)).detalhe).toHaveLength(DETALHE_MAXIMO)
    expect(quandoFoi('2026-10-09T17:03:00.000Z')).toBe('9/10 às 14h03')
  })

  it('ordena do mais recente para o mais antigo', () => {
    const a = registroDeAuditoria('a', 'aluno-excluido', 'e', 'a-1', '2026-10-08T10:00:00.000Z')
    const b = registroDeAuditoria('b', 'aluno-excluido', 'e', 'a-2', '2026-10-09T10:00:00.000Z')
    expect(ordenarAuditoria([a, b]).map((r) => r.id)).toEqual(['b', 'a'])
  })
})
