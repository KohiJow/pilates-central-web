import { describe, expect, it } from 'vitest'
import { ehAdministracao, NOME_DO_PAPEL, pode } from './permissoes'

describe('permissões por papel', () => {
  it('professor cuida da agenda, da chamada e da reposição; não do dinheiro nem do cadastro', () => {
    for (const acao of ['ver-agenda', 'marcar-presenca', 'encaixar-reposicao', 'ver-alunos', 'ver-turmas'] as const) {
      expect(pode('professor', acao)).toBe(true)
    }
    for (const acao of [
      'ver-financeiro',
      'registrar-pagamento',
      'editar-alunos',
      'editar-turmas',
      'cancelar-aula',
      'dar-credito-fora-do-prazo',
      'editar-configuracao',
      'convidar-professor',
      'ver-todas-as-unidades',
    ] as const) {
      expect(pode('professor', acao)).toBe(false)
    }
  })

  it('administrador tem o mesmo dia a dia do titular, financeiro incluído', () => {
    for (const acao of ['ver-financeiro', 'registrar-pagamento', 'editar-configuracao', 'cancelar-aula', 'convidar-professor'] as const) {
      expect(pode('administrador', acao)).toBe(true)
      expect(pode('titular', acao)).toBe(true)
    }
  })

  it('só o titular mexe na administração e passa a conta adiante', () => {
    expect(pode('administrador', 'gerenciar-administradores')).toBe(false)
    expect(pode('administrador', 'transferir-titularidade')).toBe(false)
    expect(pode('titular', 'gerenciar-administradores')).toBe(true)
    expect(pode('titular', 'transferir-titularidade')).toBe(true)
  })

  it('sem papel (sessão ainda carregando) não pode nada', () => {
    expect(pode(undefined, 'ver-agenda')).toBe(false)
    expect(ehAdministracao(undefined)).toBe(false)
  })

  it('rótulos sem gênero para a administração', () => {
    expect(NOME_DO_PAPEL.titular).toBe('Responsável')
    expect(NOME_DO_PAPEL.administrador).toBe('Administração')
  })
})
