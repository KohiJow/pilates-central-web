import { describe, expect, it } from 'vitest'
import { montarAula } from './agenda'
import { turma } from './apoio-de-teste'
import {
  candidatosParaTurma,
  colocarNaTurma,
  editarTurma,
  encerrarTurma,
  gradeDaSemana,
  horarioDaTurma,
  lugaresReservados,
  nomeDaTurma,
  novaTurma,
  tirarDaTurma,
  validarTurma,
} from './turmas'
import type { RascunhoTurma } from './turmas'
import type { Aluno, MembroEquipe, Unidade } from './tipos'

const unidades: Unidade[] = [
  { id: 'u-centro', nome: 'Centro', endereco: '', ativa: true },
  { id: 'u-jardim', nome: 'Jardim', endereco: '', ativa: true },
]
const equipe: MembroEquipe[] = [
  { id: 'p-1', nome: 'Camila Nunes', papel: 'professor', email: '', telefone: '', unidades: ['u-centro'], ativo: true },
  { id: 'p-2', nome: 'Tiago Martins', papel: 'professor', email: '', telefone: '', unidades: ['u-jardim'], ativo: true },
  { id: 'adm', nome: 'Helena Prado', papel: 'titular', email: '', telefone: '', unidades: [], ativo: true },
]

function aluno(id: string, parcial: Partial<Aluno> = {}): Aluno {
  return {
    id,
    nome: `Aluno ${id}`,
    unidadeId: 'u-centro',
    telefone: '',
    email: '',
    vezesPorSemana: 2,
    situacao: 'ativo',
    observacao: '',
    desde: '2026-01-10',
    ...parcial,
  }
}

const rascunho = (parcial: Partial<RascunhoTurma> = {}): RascunhoTurma => ({
  unidadeId: 'u-centro',
  diaDaSemana: 1,
  inicio: '07:00',
  duracaoMin: 50,
  capacidade: 5,
  professorId: 'p-1',
  ...parcial,
})

describe('cadastro de turma', () => {
  it('turma nova válida começa vazia, a partir de hoje', () => {
    expect(validarTurma(rascunho(), { turmas: [], equipe, unidades })).toEqual({})
    expect(novaTurma(rascunho(), 't-nova', '2026-10-09')).toMatchObject({ alunosFixos: [], ativa: true, desde: '2026-10-09' })
  })

  it('horário, duração, capacidade e professor com mensagens claras', () => {
    expect(validarTurma(rascunho({ inicio: '04:00', duracaoMin: 5, capacidade: 30, professorId: 'zz' }), { turmas: [], equipe, unidades })).toEqual({
      inicio: 'O horário deve ficar entre 5h e 22h30.',
      duracaoMin: 'A duração deve ficar entre 15 e 180 minutos.',
      capacidade: 'A capacidade deve ficar entre 1 e 20 alunos.',
      professorId: 'Escolha quem dá a aula.',
    })
    expect(validarTurma(rascunho({ inicio: '22:30', duracaoMin: 120 }), { turmas: [], equipe, unidades }).duracaoMin).toBe(
      'A aula tem que terminar antes da meia-noite.',
    )
  })

  it('professor de outra unidade não serve; a administração dá aula em qualquer uma', () => {
    expect(validarTurma(rascunho({ professorId: 'p-2' }), { turmas: [], equipe, unidades }).professorId).toBe(
      'Tiago não dá aula nesta unidade.',
    )
    expect(validarTurma(rascunho({ professorId: 'adm' }), { turmas: [], equipe, unidades })).toEqual({})
  })

  it('o mesmo professor não dá duas turmas que se cruzam no mesmo dia', () => {
    const existente = turma({ id: 't-seg-0730', diaDaSemana: 1, inicio: '07:30', professorId: 'p-1' })
    expect(validarTurma(rascunho(), { turmas: [existente], equipe, unidades }).professorId).toBe(
      'Camila já dá a turma de segunda, 7h30.',
    )
    // editando a própria turma não conflita com ela mesma
    expect(validarTurma(rascunho({ inicio: '07:30' }), { turmas: [existente], equipe, unidades, turmaId: 't-seg-0730' })).toEqual({})
    // às 8h20 já terminou
    expect(validarTurma(rascunho({ inicio: '08:20' }), { turmas: [existente], equipe, unidades })).toEqual({})
  })

  it('não diminui a capacidade abaixo dos alunos fixos', () => {
    expect(validarTurma(rascunho({ capacidade: 3 }), { turmas: [], equipe, unidades, reservados: 4 }).capacidade).toBe(
      'A turma tem 4 alunos fixos. Tire alguém antes de diminuir para 3.',
    )
  })

  it('editar muda horário, capacidade e professor, mas não o dia nem a unidade', () => {
    const t = turma({ diaDaSemana: 5 })
    const editada = editarTurma(t, rascunho({ diaDaSemana: 2, unidadeId: 'u-jardim', inicio: '08:00', capacidade: 6 }))
    expect(editada).toMatchObject({ diaDaSemana: 5, unidadeId: 'u-centro', inicio: '08:00', capacidade: 6 })
  })

  it('encerrar uma vez só', () => {
    const r = encerrarTurma(turma())
    expect(r).toMatchObject({ ok: true, valor: { ativa: false } })
    if (r.ok) expect(encerrarTurma(r.valor)).toMatchObject({ ok: false, codigo: 'nada-a-fazer' })
  })
})

describe('alunos fixos', () => {
  const situacao = (id: string) => (id === 'pausada' ? 'pausado' : id === 'arquivada' ? 'inativo' : 'ativo')

  it('coloca o aluno a partir de hoje: aulas que já passaram não mudam', () => {
    const t = turma({ alunosFixos: ['a1'] })
    const r = colocarNaTurma(t, aluno('a2'), [t], situacao, '2026-10-09')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valor.alunosFixos).toEqual(['a1', 'a2'])
    expect(montarAula(r.valor, '2026-10-02').participantes.map((p) => p.alunoId)).toEqual(['a1'])
    expect(montarAula(r.valor, '2026-10-09').participantes.map((p) => p.alunoId)).toEqual(['a1', 'a2'])
  })

  it('respeita a capacidade; o pausado guarda o lugar, o arquivado não', () => {
    const cheia = turma({ capacidade: 2, alunosFixos: ['a1', 'pausada'] })
    expect(colocarNaTurma(cheia, aluno('a3'), [cheia], situacao, '2026-10-09')).toMatchObject({
      ok: false,
      codigo: 'turma-cheia',
      mensagem: 'A turma está cheia (2 de 2).',
    })
    const comArquivada = turma({ capacidade: 2, alunosFixos: ['a1', 'arquivada'] })
    expect(lugaresReservados(comArquivada, situacao)).toBe(1)
    expect(colocarNaTurma(comArquivada, aluno('a3'), [comArquivada], situacao, '2026-10-09').ok).toBe(true)
  })

  it('recusa aluno de outra unidade, arquivado, repetido ou com outra turma no mesmo horário', () => {
    const t = turma({ id: 't-sex-07', alunosFixos: ['a1'] })
    const outra = turma({ id: 't-sex-0730', inicio: '07:30', alunosFixos: ['a5'] })
    expect(colocarNaTurma(t, aluno('a2', { unidadeId: 'u-jardim', nome: 'Bia Lima' }), [t], situacao, '2026-10-09')).toMatchObject({
      ok: false,
      mensagem: 'Bia é de outra unidade.',
    })
    expect(colocarNaTurma(t, aluno('a2', { situacao: 'inativo' }), [t], situacao, '2026-10-09')).toMatchObject({ ok: false })
    expect(colocarNaTurma(t, aluno('a1'), [t], situacao, '2026-10-09')).toMatchObject({ ok: false, codigo: 'nada-a-fazer' })
    expect(colocarNaTurma(t, aluno('a5', { nome: 'Caio Reis' }), [t, outra], situacao, '2026-10-09')).toMatchObject({
      ok: false,
      mensagem: 'Caio já está na turma de sexta, 7h30.',
    })
  })

  it('tirar da turma', () => {
    const t = turma({ alunosFixos: ['a1', 'a2'], fixosDesde: { a2: '2026-10-01' } })
    expect(tirarDaTurma(t, 'a2')).toMatchObject({ ok: true, valor: { alunosFixos: ['a1'], fixosDesde: {} } })
    expect(tirarDaTurma(t, 'zz')).toMatchObject({ ok: false })
  })

  it('candidatos: primeiro quem está com turma faltando no plano', () => {
    const t = turma({ id: 't1', alunosFixos: ['a1'] })
    const outra = turma({ id: 't2', diaDaSemana: 3, alunosFixos: ['b', 'c'] })
    const alunos = [
      aluno('a1'),
      aluno('b', { nome: 'Bia', vezesPorSemana: 1 }),
      aluno('c', { nome: 'Caio', vezesPorSemana: 2 }),
      aluno('d', { nome: 'Dani', unidadeId: 'u-jardim' }),
      aluno('e', { nome: 'Edu', situacao: 'inativo' }),
    ]
    expect(candidatosParaTurma(t, alunos, [t, outra]).map((a) => a.id)).toEqual(['c', 'b'])
  })
})

describe('grade da semana', () => {
  it('segunda primeiro, domingo no fim, só ativas da unidade, por horário', () => {
    const turmas = [
      turma({ id: 'dom', diaDaSemana: 0 }),
      turma({ id: 'seg-18', diaDaSemana: 1, inicio: '18:00' }),
      turma({ id: 'seg-07', diaDaSemana: 1, inicio: '07:00' }),
      turma({ id: 'ter-x', diaDaSemana: 2, ativa: false }),
      turma({ id: 'qua-j', diaDaSemana: 3, unidadeId: 'u-jardim' }),
    ]
    expect(gradeDaSemana(turmas, 'u-centro').map((d) => [d.dia, d.turmas.map((t) => t.id)])).toEqual([
      [1, ['seg-07', 'seg-18']],
      [0, ['dom']],
    ])
  })

  it('nomes e horários para a tela', () => {
    expect(nomeDaTurma({ diaDaSemana: 1, inicio: '18:30' })).toBe('Segunda, 18h30')
    expect(horarioDaTurma({ inicio: '07:00', duracaoMin: 50 })).toBe('7h às 7h50')
  })
})
