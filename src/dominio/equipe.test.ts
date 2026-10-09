import { describe, expect, it } from 'vitest'
import { turma } from './apoio-de-teste'
import {
  convidar,
  desativarMembro,
  editarMembro,
  mudarPapel,
  ordenarEquipe,
  quemPodeDarAula,
  reativarMembro,
  transferirTitularidade,
  validarMembro,
} from './equipe'
import type { RascunhoMembro } from './equipe'
import type { MembroEquipe, Unidade } from './tipos'

function membro(id: string, papel: MembroEquipe['papel'], parcial: Partial<MembroEquipe> = {}): MembroEquipe {
  return {
    id,
    nome: `Pessoa ${id}`,
    papel,
    email: `${id}@example.com`,
    telefone: '',
    unidades: ['u-centro'],
    ativo: true,
    ...parcial,
  }
}

const unidades: Unidade[] = [
  { id: 'u-centro', nome: 'Centro', endereco: '', ativa: true },
  { id: 'u-velha', nome: 'Velha', endereco: '', ativa: false },
]
const titular = membro('tit', 'titular')
const admin = membro('adm', 'administrador')
const admin2 = membro('adm2', 'administrador')
const prof = membro('prof', 'professor')
const equipe = [titular, admin, admin2, prof]
const AGORA = '2026-10-09T13:00:00.000Z'

const rascunho = (parcial: Partial<RascunhoMembro> = {}): RascunhoMembro => ({
  nome: 'Nova Pessoa',
  email: 'nova@example.com',
  telefone: '(11) 90000-0099',
  papel: 'professor',
  unidades: ['u-centro'],
  ...parcial,
})

describe('convidar para a equipe', () => {
  it('a administração convida professor; o convite fica pendente e guarda quem convidou', () => {
    const r = convidar(admin, rascunho(), equipe, unidades, 'novo', AGORA)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valor).toMatchObject({ papel: 'professor', telefone: '5511900000099', convite: { porId: 'adm' } })
  })

  it('administrador não convida administrador; titular convida', () => {
    expect(convidar(admin, rascunho({ papel: 'administrador' }), equipe, unidades, 'x', AGORA)).toMatchObject({
      ok: false,
      codigo: 'sem-permissao',
    })
    expect(convidar(titular, rascunho({ papel: 'administrador', unidades: [] }), equipe, unidades, 'x', AGORA).ok).toBe(true)
  })

  it('professor não convida ninguém', () => {
    expect(convidar(prof, rascunho(), equipe, unidades, 'x', AGORA)).toMatchObject({ ok: false, codigo: 'sem-permissao' })
  })

  it('valida nome, e-mail repetido, telefone e unidade em português', () => {
    const erros = validarMembro(
      rascunho({ nome: 'A', email: 'ADM@example.com', telefone: '123', unidades: ['u-velha'] }),
      equipe,
      unidades,
    )
    expect(erros).toEqual({
      nome: 'Escreva o nome da pessoa.',
      email: 'Pessoa adm já usa este e-mail.',
      telefone: 'Use DDD e número, por exemplo (19) 90000-0000.',
      unidades: 'Escolha pelo menos uma unidade.',
    })
  })
})

describe('papéis: tentativas de escalada', () => {
  it('administrador não promove ninguém a administrador', () => {
    expect(mudarPapel(admin, prof, 'administrador')).toMatchObject({ ok: false, codigo: 'sem-permissao' })
  })

  it('administrador não rebaixa nem desativa outro administrador', () => {
    expect(mudarPapel(admin, admin2, 'professor')).toMatchObject({ ok: false, codigo: 'sem-permissao' })
    expect(desativarMembro(admin, admin2, [])).toMatchObject({ ok: false, codigo: 'sem-permissao' })
  })

  it('ninguém tira o titular: nem rebaixar, nem desativar, nem editar o cadastro dele', () => {
    expect(mudarPapel(admin, titular, 'professor')).toMatchObject({ ok: false, codigo: 'sem-permissao' })
    expect(mudarPapel(titular, titular, 'administrador')).toMatchObject({ ok: false, codigo: 'sem-permissao' })
    expect(desativarMembro(admin, titular, [])).toMatchObject({ ok: false, codigo: 'sem-permissao' })
    expect(editarMembro(admin, titular, { ...rascunho(), email: 'outro@example.com' }, equipe, unidades)).toMatchObject({
      ok: false,
      codigo: 'sem-permissao',
    })
  })

  it('administrador não vira titular sozinho nem passa a conta adiante', () => {
    expect(transferirTitularidade(admin, admin)).toMatchObject({ ok: false, codigo: 'sem-permissao' })
    expect(transferirTitularidade(admin, admin2)).toMatchObject({ ok: false, codigo: 'sem-permissao' })
  })

  it('professor não muda papel de ninguém, nem o próprio', () => {
    expect(mudarPapel(prof, prof, 'administrador')).toMatchObject({ ok: false, codigo: 'sem-permissao' })
  })

  it('o titular promove e rebaixa', () => {
    expect(mudarPapel(titular, prof, 'administrador')).toMatchObject({ ok: true, valor: { papel: 'administrador' } })
    expect(mudarPapel(titular, admin, 'professor')).toMatchObject({ ok: true, valor: { papel: 'professor' } })
  })

  it('o professor edita o próprio contato, mas não as próprias unidades', () => {
    const r = editarMembro(prof, prof, { ...rascunho(), nome: 'Prof Novo', unidades: ['u-centro', 'u-jardim'] }, equipe, unidades)
    expect(r).toMatchObject({ ok: true, valor: { nome: 'Prof Novo', unidades: ['u-centro'] } })
    expect(editarMembro(prof, admin, rascunho(), equipe, unidades)).toMatchObject({ ok: false, codigo: 'sem-permissao' })
  })
})

describe('desativar e reativar', () => {
  it('não desativa quem ainda dá turma', () => {
    const r = desativarMembro(admin, prof, [turma({ professorId: 'prof' }), turma({ id: 't2', professorId: 'prof' })])
    expect(r).toMatchObject({ ok: false, codigo: 'conflito', mensagem: 'Pessoa dá 2 turmas. Passe para outra pessoa antes.' })
  })

  it('a administração desativa professor sem turma e reativa depois', () => {
    const r = desativarMembro(admin, prof, [turma({ professorId: 'outro' })])
    expect(r).toMatchObject({ ok: true, valor: { ativo: false } })
    if (!r.ok) return
    expect(reativarMembro(admin, r.valor)).toMatchObject({ ok: true, valor: { ativo: true } })
  })

  it('ninguém se desativa', () => {
    expect(desativarMembro(titular, titular, [])).toMatchObject({ ok: false, codigo: 'sem-permissao' })
  })
})

describe('passar a conta adiante', () => {
  it('só para administrador ativo que já entrou no app', () => {
    expect(transferirTitularidade(titular, prof)).toMatchObject({ ok: false, codigo: 'conflito' })
    expect(transferirTitularidade(titular, { ...admin, ativo: false })).toMatchObject({ ok: false, codigo: 'conflito' })
    expect(transferirTitularidade(titular, { ...admin, convite: { enviadoEm: AGORA, porId: 'tit' } })).toMatchObject({
      ok: false,
      codigo: 'conflito',
    })
  })

  it('troca os dois papéis de uma vez: quem era titular continua na administração', () => {
    const r = transferirTitularidade(titular, admin)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valor.map((m) => [m.id, m.papel])).toEqual([
      ['tit', 'administrador'],
      ['adm', 'titular'],
    ])
  })
})

describe('listas da equipe', () => {
  it('ordena por papel e deixa desativados no fim', () => {
    const lista = ordenarEquipe([prof, { ...admin2, ativo: false }, admin, titular])
    expect(lista.map((m) => m.id)).toEqual(['tit', 'adm', 'prof', 'adm2'])
  })

  it('quem pode dar aula numa unidade: professores dela e a administração', () => {
    const outra = membro('outra', 'professor', { unidades: ['u-jardim'] })
    expect(quemPodeDarAula([...equipe, outra], 'u-centro').map((m) => m.id)).toEqual(['tit', 'adm', 'adm2', 'prof'])
  })
})
