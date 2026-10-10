import { describe, expect, it } from 'vitest'
import { turma } from './apoio-de-teste'
import {
  alternarNaGrade,
  celula,
  copiarDia,
  diasDaGrade,
  estudioVazio,
  linhasDaGrade,
  passoAnterior,
  passoInicial,
  passoSeguinte,
  resumoDaMontagem,
  resumoDoDia,
} from './montagem'
import type { ContextoDaGrade, PadraoDaGrade } from './montagem'
import type { Aluno, MembroEquipe, Unidade } from './tipos'
import type { RascunhoTurma } from './turmas'

const centro: Unidade = { id: 'u-centro', nome: 'Centro', endereco: '', ativa: true }
const titular: MembroEquipe = { id: 'e-tit', nome: 'Helena Prado', papel: 'titular', email: 'helena@example.com', telefone: '', unidades: [], ativo: true }
const camila: MembroEquipe = { id: 'e-camila', nome: 'Camila Nunes', papel: 'professor', email: 'camila@example.com', telefone: '', unidades: ['u-centro'], ativo: true, convite: { enviadoEm: '2026-10-09T10:00:00.000Z', porId: 'e-tit' } }
const aluno: Aluno = { id: 'a1', nome: 'Ana Souza', unidadeId: 'u-centro', telefone: '5511900000001', email: '', vezesPorSemana: 2, situacao: 'ativo', observacao: '', desde: '2026-10-01' }

const ctx: ContextoDaGrade = { turmas: [], equipe: [titular, camila], unidades: [centro], hoje: '2026-10-09' }
const padrao: PadraoDaGrade = { unidadeId: 'u-centro', professorId: 'e-camila', duracaoMin: 50, capacidade: 5 }

describe('os passos do primeiro uso', () => {
  it('o guia abre sozinho com o estúdio sem turma e sem aluno, e retoma do primeiro passo vazio', () => {
    const vazio = { unidades: [], equipe: [titular], turmas: [], alunos: [] }
    expect(estudioVazio(vazio)).toBe(true)
    expect(passoInicial(vazio)).toBe('estudio')
    expect(passoInicial({ ...vazio, unidades: [centro] })).toBe('equipe')
    expect(passoInicial({ ...vazio, unidades: [centro], equipe: [titular, camila] })).toBe('turmas')
    const comGrade = { unidades: [centro], equipe: [titular, camila], turmas: [turma({ alunosFixos: [] })], alunos: [] }
    expect(estudioVazio(comGrade)).toBe(false)
    expect(passoInicial(comGrade)).toBe('alunos')
    expect(passoInicial({ ...comGrade, alunos: [aluno] })).toBe('fim')
    // aluno arquivado e turma encerrada não contam
    expect(estudioVazio({ turmas: [turma({ ativa: false })], alunos: [{ ...aluno, situacao: 'inativo' }] })).toBe(true)
  })

  it('anda para a frente e para trás na ordem', () => {
    expect(passoSeguinte('estudio')).toBe('unidades')
    expect(passoSeguinte('alunos')).toBe('fim')
    expect(passoSeguinte('fim')).toBe('fim')
    expect(passoAnterior('estudio')).toBeNull()
    expect(passoAnterior('turmas')).toBe('equipe')
  })
})

describe('a grade visual', () => {
  it('linhas de hora em hora das 6h às 21h, mais os horários quebrados que existem', () => {
    const linhas = linhasDaGrade([{ inicio: '18:30' }, { inicio: '07:00' }], ['12:15'])
    expect(linhas[0]).toBe('06:00')
    expect(linhas[linhas.length - 1]).toBe('21:00')
    expect(linhas).toContain('18:30')
    expect(linhas).toContain('12:15')
    expect(linhas.indexOf('18:30')).toBe(linhas.indexOf('18:00') + 1)
    expect(new Set(linhas).size).toBe(linhas.length)
    expect(diasDaGrade(false)).toEqual([1, 2, 3, 4, 5, 6])
    expect(diasDaGrade(true)).toEqual([1, 2, 3, 4, 5, 6, 0])
  })

  it('tocar cria a turma com o padrão; tocar de novo tira; a gravada não sai por aqui', () => {
    const r1 = alternarNaGrade([], 1, '07:00', padrao, ctx)
    expect(r1.ok && r1.valor.criou).toBe(true)
    const novas = r1.ok ? r1.valor.novas : []
    expect(novas).toEqual([{ unidadeId: 'u-centro', professorId: 'e-camila', duracaoMin: 50, capacidade: 5, diaDaSemana: 1, inicio: '07:00' }])
    expect(celula(novas, ctx, 'u-centro', 1, '07:00').tipo).toBe('nova')
    const r2 = alternarNaGrade(novas, 1, '07:00', padrao, ctx)
    expect(r2.ok && r2.valor).toEqual({ novas: [], criou: false })

    const gravada = turma({ id: 't-seg-07', diaDaSemana: 1, inicio: '07:00', professorId: 'e-camila', alunosFixos: [] })
    const comGravada = { ...ctx, turmas: [gravada] }
    expect(celula([], comGravada, 'u-centro', 1, '07:00')).toEqual({ tipo: 'gravada', turma: gravada })
    const r3 = alternarNaGrade([], 1, '07:00', padrao, comGravada)
    expect(r3.ok).toBe(false)
    expect(!r3.ok && r3.mensagem).toBe('A turma de segunda, 7h já existe. Para mudar, abra em Turmas.')
  })

  it('o mesmo professor não fica em duas turmas que se cruzam, nem fora da unidade dele', () => {
    const r1 = alternarNaGrade([], 1, '18:00', padrao, ctx)
    const novas = r1.ok ? r1.valor.novas : []
    const choque = alternarNaGrade(novas, 1, '18:30', padrao, ctx)
    expect(!choque.ok && choque.mensagem).toBe('Camila já dá a turma de segunda, 18h.')
    // outra pessoa no mesmo horário quebrado passa
    expect(alternarNaGrade(novas, 1, '18:30', { ...padrao, professorId: 'e-tit' }, ctx).ok).toBe(true)
    const jardim: Unidade = { id: 'u-jardim', nome: 'Jardim', endereco: '', ativa: true }
    const fora = alternarNaGrade([], 2, '07:00', { ...padrao, unidadeId: 'u-jardim' }, { ...ctx, unidades: [centro, jardim] })
    expect(!fora.ok && fora.mensagem).toBe('Camila não dá aula nesta unidade.')
  })

  it('copia um dia para outros: gravadas e novas, pulando o que já está ocupado', () => {
    const gravada = turma({ id: 't-seg-08', diaDaSemana: 1, inicio: '08:00', professorId: 'e-tit', capacidade: 4, duracaoMin: 55, alunosFixos: [] })
    const quarta = turma({ id: 't-qua-07', diaDaSemana: 3, inicio: '07:00', professorId: 'e-camila', alunosFixos: [] })
    const c = { ...ctx, turmas: [gravada, quarta] }
    const novas: RascunhoTurma[] = [{ ...padrao, diaDaSemana: 1, inicio: '07:00' }]
    const r = copiarDia(novas, 'u-centro', 1, [3, 5], c)
    // quarta 7h já existe: pula; o resto entra com o professor, a duração e os lugares de segunda
    expect(r.copiadas).toBe(3)
    expect(r.puladas).toBe(1)
    expect(r.novas.filter((x) => x.diaDaSemana === 5).map((x) => [x.inicio, x.professorId, x.duracaoMin, x.capacidade])).toEqual([
      ['07:00', 'e-camila', 50, 5],
      ['08:00', 'e-tit', 55, 4],
    ])
    expect(r.novas.filter((x) => x.diaDaSemana === 3).map((x) => x.inicio)).toEqual(['08:00'])
  })

  it('o dia numa linha e o resumo do fim', () => {
    expect(resumoDoDia(1, ['18:00', '07:00', '08:00'])).toBe('Segunda: 7h, 8h e 18h')
    expect(resumoDoDia(6, [])).toBe('Sábado: sem turma')
    expect(resumoDaMontagem({ unidades: [centro], equipe: [titular, camila], turmas: [turma(), turma({ ativa: false })], alunos: [aluno] })).toEqual({
      unidades: 1,
      professores: 1,
      convitesPendentes: 1,
      turmas: 1,
      alunos: 1,
    })
  })
})
