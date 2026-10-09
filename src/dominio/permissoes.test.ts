import { describe, expect, it } from 'vitest'
import { pode } from './permissoes'

describe('permissões por papel', () => {
  it('professor cuida da agenda e da chamada, mas não do dinheiro nem do cadastro', () => {
    expect(pode('professor', 'ver-agenda')).toBe(true)
    expect(pode('professor', 'marcar-presenca')).toBe(true)
    expect(pode('professor', 'encaixar-reposicao')).toBe(true)
    expect(pode('professor', 'ver-financeiro')).toBe(false)
    expect(pode('professor', 'editar-alunos')).toBe(false)
    expect(pode('professor', 'cancelar-aula')).toBe(false)
    expect(pode('professor', 'dar-credito-fora-do-prazo')).toBe(false)
  })

  it('a dona pode tudo', () => {
    for (const acao of ['ver-financeiro', 'registrar-pagamento', 'editar-configuracao', 'cancelar-aula'] as const) {
      expect(pode('dona', acao)).toBe(true)
    }
  })
})
