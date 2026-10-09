import { describe, expect, it } from 'vitest'
import { aulasDoDia, turmasDoAluno } from '../../dominio/agenda'
import { diasDoIntervalo, minutosDe, periodoDe } from '../../dominio/datas'
import { resumoFinanceiro } from '../../dominio/pagamentos'
import { coberturaDaSemente, gerarSemente } from './semente'

// sexta-feira, 10h em Campinas
const AGORA = new Date('2026-10-09T10:00:00-03:00')
const banco = gerarSemente(AGORA)
const { base } = banco
const registroDe = (id: string) => banco.registros[id]

describe('dados fictícios da demonstração', () => {
  it('tem o tamanho de um estúdio pequeno', () => {
    expect(base.unidades).toHaveLength(2)
    expect(base.equipe.filter((e) => e.papel === 'dona')).toHaveLength(1)
    expect(base.equipe.filter((e) => e.papel === 'professor')).toHaveLength(3)
    expect(base.alunos).toHaveLength(40)
  })

  it('só usa contatos fictícios', () => {
    for (const pessoa of [...base.alunos, ...base.equipe]) {
      expect(pessoa.email).toMatch(/@example\.com$/)
      expect(pessoa.telefone).toMatch(/^55119000000\d{2}$/)
    }
    expect(base.configuracao.whatsapp).toMatch(/^55119000000\d{2}$/)
  })

  it('turmas de manhã, tarde e noite, com 4 a 6 lugares, sem passar da capacidade', () => {
    const periodos = new Set(base.turmas.map((t) => periodoDe(t.inicio)))
    expect([...periodos].sort()).toEqual(['manha', 'noite', 'tarde'])
    for (const t of base.turmas) {
      expect(t.capacidade).toBeGreaterThanOrEqual(4)
      expect(t.capacidade).toBeLessThanOrEqual(6)
      expect(t.alunosFixos.length).toBeLessThanOrEqual(t.capacidade)
    }
    // pelo menos uma turma lotada e uma com folga: a agenda precisa mostrar os dois casos
    expect(base.turmas.some((t) => t.alunosFixos.length === t.capacidade)).toBe(true)
    expect(base.turmas.some((t) => t.alunosFixos.length < t.capacidade - 1)).toBe(true)
  })

  it('cada aluno ativo está em tantas turmas quanto o plano dele', () => {
    for (const a of base.alunos) {
      const turmas = turmasDoAluno(a.id, base.turmas)
      if (a.situacao === 'ativo') expect(turmas).toHaveLength(a.vezesPorSemana)
      else expect(turmas).toHaveLength(0)
      expect(turmas.every((t) => t.unidadeId === a.unidadeId)).toBe(true)
    }
  })

  it('nenhuma aula do período passa da capacidade, contando reposições', () => {
    const { de, ate } = coberturaDaSemente('2026-10-09')
    for (const dia of diasDoIntervalo(de, ate)) {
      for (const aula of aulasDoDia(dia, base.turmas, registroDe)) {
        expect(aula.ocupadas).toBeLessThanOrEqual(aula.capacidade)
      }
    }
  })

  it('créditos coerentes: validade de 30 dias e uso apontando para a aula da reposição', () => {
    const creditos = Object.values(banco.creditos)
    expect(creditos.length).toBeGreaterThan(5)
    for (const c of creditos) {
      expect(c.id).toBe(`cr_${c.alunoId}_${c.origem.turmaId}_${c.origem.data}`)
      if (!c.usadoEm) continue
      const destino = banco.registros[`${c.usadoEm.turmaId}_${c.usadoEm.data}`]
      expect(destino?.reposicoes[c.alunoId]).toBe(c.id)
    }
    expect(creditos.some((c) => c.usadoEm)).toBe(true)
    expect(creditos.some((c) => !c.usadoEm)).toBe(true)
  })

  it('tem faltas, avisos e reposições hoje para a tela Hoje mostrar', () => {
    const hoje = aulasDoDia('2026-10-09', base.turmas, registroDe)
    const participantes = hoje.flatMap((a) => a.participantes)
    expect(participantes.filter((p) => p.origem === 'reposicao').length).toBeGreaterThanOrEqual(1)
    expect(participantes.filter((p) => p.marcacao === 'avisou').length).toBeGreaterThanOrEqual(1)
    // aulas que já terminaram hoje estão com chamada feita; as que vêm depois, não
    for (const aula of hoje) {
      const terminou = minutosDe(aula.fim) <= 10 * 60
      const marcados = aula.participantes.filter((p) => p.marcacao === 'presente' || p.marcacao === 'faltou')
      if (!terminou) expect(marcados).toHaveLength(0)
    }
    const semanaPassada = diasDoIntervalo('2026-10-01', '2026-10-08').flatMap((d) => aulasDoDia(d, base.turmas, registroDe))
    const marcacoes = semanaPassada.flatMap((a) => a.participantes.map((p) => p.marcacao))
    expect(marcacoes.filter((m) => m === 'faltou').length).toBeGreaterThan(0)
    expect(marcacoes.filter((m) => m === 'avisou').length).toBeGreaterThan(0)
    // a semana passada tem a chamada completa
    expect(marcacoes.filter((m) => m === undefined)).toHaveLength(0)
  })

  it('o feriado de 12 de outubro aparece cancelado', () => {
    const feriado = aulasDoDia('2026-10-12', base.turmas, registroDe)
    expect(feriado.length).toBeGreaterThan(0)
    expect(feriado.every((a) => a.cancelamento?.motivo === 'feriado')).toBe(true)
  })

  it('tem mensalidades pendentes no mês e o mês anterior quase todo pago', () => {
    const pagamentos = Object.values(banco.pagamentos)
    const atual = resumoFinanceiro(base.alunos, pagamentos, '2026-10')
    const anterior = resumoFinanceiro(base.alunos, pagamentos, '2026-09')
    expect(atual.pendentes.length).toBeGreaterThan(3)
    expect(anterior.pendentes.length).toBeLessThan(atual.pendentes.length)
    expect(atual.recebido).toBeGreaterThan(0)
  })

  it('é determinística para o mesmo instante', () => {
    expect(JSON.stringify(gerarSemente(AGORA))).toBe(JSON.stringify(banco))
  })

  it('funciona em qualquer hora do dia, inclusive madrugada e domingo', () => {
    for (const instante of ['2026-10-11T03:00:00-03:00', '2026-10-09T23:30:00-03:00', '2026-01-01T12:00:00-03:00']) {
      const outro = gerarSemente(new Date(instante))
      expect(outro.base.alunos).toHaveLength(40)
    }
  })
})
