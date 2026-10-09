import { describe, expect, it } from 'vitest'
import { turma } from './apoio-de-teste'
import type { Aluno, Unidade } from './tipos'
import { desativarUnidade, montarUnidade, validarUnidade } from './unidades'

const centro: Unidade = { id: 'u-centro', nome: 'Centro', endereco: 'Rua Exemplo, 100', ativa: true }
const jardim: Unidade = { id: 'u-jardim', nome: 'Jardim', endereco: '', ativa: true }

const aluno = (unidadeId: string, situacao: Aluno['situacao'] = 'ativo'): Aluno => ({
  id: `a-${unidadeId}-${situacao}`,
  nome: 'X Y',
  unidadeId,
  telefone: '',
  email: '',
  vezesPorSemana: 2,
  situacao,
  observacao: '',
  desde: '2026-01-01',
})

describe('unidades', () => {
  it('nome obrigatório e sem repetir (sem ligar para acento e maiúscula)', () => {
    expect(validarUnidade({ nome: 'Barão', endereco: '' }, [centro, jardim])).toEqual({})
    expect(validarUnidade({ nome: ' centro ', endereco: '' }, [centro, jardim]).nome).toBe('Já existe uma unidade com este nome.')
    expect(validarUnidade({ nome: 'Centro', endereco: '' }, [centro, jardim], 'u-centro')).toEqual({})
    expect(validarUnidade({ nome: 'A', endereco: 'x'.repeat(121) }, [])).toEqual({
      nome: 'Dê um nome para a unidade, por exemplo "Centro".',
      endereco: 'Use no máximo 120 letras.',
    })
  })

  it('monta a unidade aberta, mantendo a situação ao editar', () => {
    expect(montarUnidade({ nome: ' Barão ', endereco: ' Rua B ' }, 'u-barao')).toEqual({
      id: 'u-barao',
      nome: 'Barão',
      endereco: 'Rua B',
      ativa: true,
    })
    expect(montarUnidade({ nome: 'Jardim', endereco: '' }, 'u-jardim', { ...jardim, ativa: false }).ativa).toBe(false)
  })

  it('só fecha a unidade sem turmas e sem alunos, e nunca a última aberta', () => {
    expect(desativarUnidade(jardim, [turma({ unidadeId: 'u-jardim' })], [], [centro, jardim])).toMatchObject({
      ok: false,
      mensagem: 'A unidade ainda tem 1 turma. Encerre antes.',
    })
    expect(desativarUnidade(jardim, [], [aluno('u-jardim', 'pausado')], [centro, jardim])).toMatchObject({
      ok: false,
      mensagem: 'A unidade ainda tem 1 aluno. Mude de unidade ou arquive antes.',
    })
    expect(desativarUnidade(jardim, [], [aluno('u-jardim', 'inativo')], [centro, jardim])).toMatchObject({
      ok: true,
      valor: { ativa: false },
    })
    expect(desativarUnidade(centro, [], [], [centro, { ...jardim, ativa: false }])).toMatchObject({ ok: false })
  })
})
