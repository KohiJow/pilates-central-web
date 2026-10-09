import { describe, expect, it } from 'vitest'
import { registro } from '../../dominio/apoio-de-teste'
import type { MembroEquipe, RegistroAula } from '../../dominio/tipos'
import { APAGAR, camposAlterados, documentoDoMembro, membroDoDocumento, mesclarRegistro, mudancaDeLista, registroDoDocumento } from './conversao'

const membro: MembroEquipe = {
  id: 'e-1',
  nome: 'Pessoa Um',
  papel: 'administrador',
  email: 'um@example.com',
  telefone: '',
  unidades: [],
  ativo: true,
}

describe('equipe no banco', () => {
  it('titular vem da posse; o uid não chega ao domínio', () => {
    expect(membroDoDocumento({ ...membro, uid: 'abc' }, 'e-1')).toEqual({ ...membro, papel: 'titular' })
    expect(membroDoDocumento({ ...membro, uid: 'abc' }, 'e-2')).toEqual(membro)
  })

  it('titular é gravado como administrador e nada vai como undefined', () => {
    expect(documentoDoMembro({ ...membro, papel: 'titular', convite: undefined })).toEqual(membro)
  })
})

describe('registro no banco', () => {
  it('registro gravado só com a marcação do aluno ganha os mapas vazios', () => {
    const r = registroDoDocumento({ id: 't_2026-10-09', turmaId: 't', unidadeId: 'u', data: '2026-10-09', marcacoes: { a1: 'avisou' }, atualizadoEm: 'x' })
    expect(r.reposicoes).toEqual({})
    expect(r.marcacoes).toEqual({ a1: 'avisou' })
  })

  it('leva só o que a ação mudou para a versão mais nova (duas chamadas ao mesmo tempo)', () => {
    const antes = registro({ turmaId: 't', data: '2026-10-09', marcacoes: { a1: 'presente' } })
    const depois: RegistroAula = { ...antes, marcacoes: { a1: 'presente', a2: 'faltou' }, atualizadoEm: 'depois' }
    // enquanto isso, outra pessoa marcou a3 e encaixou a9
    const fresco = { ...antes, marcacoes: { a1: 'presente' as const, a3: 'presente' as const }, reposicoes: { a9: 'cr-9' } }
    const r = mesclarRegistro(fresco, antes, depois)
    expect(r.marcacoes).toEqual({ a1: 'presente', a2: 'faltou', a3: 'presente' })
    expect(r.reposicoes).toEqual({ a9: 'cr-9' })
    expect(r.atualizadoEm).toBe('depois')
  })

  it('desmarcar apaga só a chave do aluno; cancelar e reabrir vão inteiros', () => {
    const antes = registro({ turmaId: 't', data: '2026-10-09', marcacoes: { a1: 'presente', a2: 'avisou' } })
    const depois: RegistroAula = { ...antes, marcacoes: { a1: 'presente' } }
    const fresco = { ...antes, marcacoes: { a1: 'faltou' as const, a2: 'avisou' as const } }
    expect(mesclarRegistro(fresco, antes, depois).marcacoes).toEqual({ a1: 'faltou' })
    const cancelado = { ...antes, cancelamento: { motivo: 'feriado' as const, observacao: '' } }
    expect(mesclarRegistro(antes, antes, cancelado).cancelamento).toEqual({ motivo: 'feriado', observacao: '' })
    expect(mesclarRegistro(cancelado, cancelado, antes)).not.toHaveProperty('cancelamento')
  })

  it('registro novo, sem versão no banco', () => {
    const depois = registro({ turmaId: 't', data: '2026-10-09', marcacoes: { a1: 'avisou' } })
    expect(mesclarRegistro(undefined, undefined, depois)).toEqual(depois)
  })
})

describe('campos alterados', () => {
  it('só o que mudou, e o que sumiu vira apagar', () => {
    expect(camposAlterados({ a: 1, b: [1, 2], c: 'x' }, { a: 1, b: [1, 2, 3] })).toEqual({ b: [1, 2, 3], c: APAGAR })
    expect(camposAlterados(undefined, { a: 1, b: undefined })).toEqual({ a: 1 })
  })

  it('lista: quem entrou e quem saiu', () => {
    expect(mudancaDeLista(['a1', 'a2'], ['a2', 'a3'])).toEqual({ adicionados: ['a3'], removidos: ['a1'] })
  })
})
