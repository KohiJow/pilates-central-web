// Turmas recorrentes: grade da semana, cadastro e quem são os alunos fixos (respeitando a
// capacidade e o horário de cada aluno).
import { ehHoraValida, horaDe, horaFalada, minutosDe } from './datas'
import { aceito, recusado } from './resultado'
import type { ErrosDeCampo, Resultado } from './resultado'
import { primeiroNome } from './texto'
import type { Aluno, DataISO, DiaDaSemana, Id, MembroEquipe, Turma, Unidade } from './tipos'

/** A semana do estúdio começa na segunda; domingo fica no fim. */
export const DIAS_DA_GRADE: readonly DiaDaSemana[] = [1, 2, 3, 4, 5, 6, 0]

export const NOME_DO_DIA: Record<DiaDaSemana, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}

/** "Segunda, 7h" */
export function nomeDaTurma(turma: Pick<Turma, 'diaDaSemana' | 'inicio'>): string {
  return `${NOME_DO_DIA[turma.diaDaSemana]}, ${horaFalada(turma.inicio)}`
}

export interface RascunhoTurma {
  unidadeId: Id
  diaDaSemana: DiaDaSemana
  inicio: string
  duracaoMin: number
  capacidade: number
  professorId: Id
}

export type CampoTurma = keyof RascunhoTurma

function seSobrepoem(a: Pick<Turma, 'inicio' | 'duracaoMin'>, b: Pick<Turma, 'inicio' | 'duracaoMin'>): boolean {
  const inicioA = minutosDe(a.inicio)
  const inicioB = minutosDe(b.inicio)
  return inicioA < inicioB + b.duracaoMin && inicioB < inicioA + a.duracaoMin
}

/** Lugares que os fixos ocupam: ativos e pausados (o pausado guarda o lugar para quando voltar). */
export function lugaresReservados(turma: Turma, situacaoDe: (alunoId: Id) => Aluno['situacao'] | undefined): number {
  return turma.alunosFixos.filter((id) => {
    const s = situacaoDe(id)
    return s === 'ativo' || s === 'pausado'
  }).length
}

export interface ContextoDaTurma {
  turmas: readonly Turma[]
  equipe: readonly MembroEquipe[]
  unidades: readonly Unidade[]
  /** turma sendo editada (ausente na turma nova) */
  turmaId?: Id
  /** lugares já reservados pelos fixos (a capacidade não pode ficar abaixo disso) */
  reservados?: number
}

export function validarTurma(r: RascunhoTurma, ctx: ContextoDaTurma): ErrosDeCampo<CampoTurma> {
  const erros: ErrosDeCampo<CampoTurma> = {}
  if (!ctx.unidades.some((u) => u.id === r.unidadeId && u.ativa)) erros.unidadeId = 'Escolha a unidade.'
  if (!ehHoraValida(r.inicio)) erros.inicio = 'Escolha o horário de início.'
  else if (minutosDe(r.inicio) < 5 * 60 || minutosDe(r.inicio) > 22 * 60 + 30) {
    erros.inicio = 'O horário deve ficar entre 5h e 22h30.'
  }
  if (!Number.isInteger(r.duracaoMin) || r.duracaoMin < 15 || r.duracaoMin > 180) {
    erros.duracaoMin = 'A duração deve ficar entre 15 e 180 minutos.'
  } else if (!erros.inicio && minutosDe(r.inicio) + r.duracaoMin > 24 * 60 - 1) {
    erros.duracaoMin = 'A aula tem que terminar antes da meia-noite.'
  }
  const reservados = ctx.reservados ?? 0
  if (!Number.isInteger(r.capacidade) || r.capacidade < 1 || r.capacidade > 20) {
    erros.capacidade = 'A capacidade deve ficar entre 1 e 20 alunos.'
  } else if (r.capacidade < reservados) {
    erros.capacidade = `A turma tem ${reservados} alunos fixos. Tire alguém antes de diminuir para ${r.capacidade}.`
  }
  const professor = ctx.equipe.find((m) => m.id === r.professorId && m.ativo)
  if (!professor) erros.professorId = 'Escolha quem dá a aula.'
  else if (professor.papel === 'professor' && !professor.unidades.includes(r.unidadeId)) {
    erros.professorId = `${primeiroNome(professor.nome)} não dá aula nesta unidade.`
  } else if (!erros.inicio && !erros.duracaoMin) {
    const choque = ctx.turmas.find(
      (t) =>
        t.ativa &&
        t.id !== ctx.turmaId &&
        t.professorId === r.professorId &&
        t.diaDaSemana === r.diaDaSemana &&
        seSobrepoem(t, r),
    )
    if (choque) {
      erros.professorId = `${primeiroNome(professor.nome)} já dá a turma de ${nomeDaTurma(choque).toLowerCase()}.`
    }
  }
  return erros
}

export function novaTurma(r: RascunhoTurma, id: Id, hoje: DataISO): Turma {
  return {
    id,
    unidadeId: r.unidadeId,
    diaDaSemana: r.diaDaSemana,
    inicio: r.inicio,
    duracaoMin: r.duracaoMin,
    capacidade: r.capacidade,
    professorId: r.professorId,
    alunosFixos: [],
    fixosDesde: {},
    ativa: true,
    desde: hoje,
  }
}

/**
 * Muda horário, duração, capacidade e professor. Dia da semana e unidade ficam: as aulas que já
 * aconteceram são dessa turma naquele dia (para mudar o dia, crie outra turma e encerre esta).
 */
export function editarTurma(turma: Turma, r: RascunhoTurma): Turma {
  return { ...turma, inicio: r.inicio, duracaoMin: r.duracaoMin, capacidade: r.capacidade, professorId: r.professorId }
}

export function encerrarTurma(turma: Turma): Resultado<Turma> {
  if (!turma.ativa) return recusado('nada-a-fazer', 'Esta turma já está encerrada.')
  return aceito({ ...turma, ativa: false })
}

/** Põe o aluno entre os fixos a partir de `hoje`, conferindo lugar, unidade e horário. */
export function colocarNaTurma(
  turma: Turma,
  aluno: Aluno,
  turmas: readonly Turma[],
  situacaoDe: (alunoId: Id) => Aluno['situacao'] | undefined,
  hoje: DataISO,
): Resultado<Turma> {
  const nome = primeiroNome(aluno.nome)
  if (!turma.ativa) return recusado('conflito', 'Esta turma está encerrada.')
  if (aluno.situacao === 'inativo') return recusado('conflito', `${nome} está arquivado. Volte para ativo antes.`)
  if (aluno.unidadeId !== turma.unidadeId) return recusado('conflito', `${nome} é de outra unidade.`)
  if (turma.alunosFixos.includes(aluno.id)) return recusado('nada-a-fazer', `${nome} já está nesta turma.`)
  const ocupados = lugaresReservados(turma, situacaoDe)
  if (ocupados >= turma.capacidade) {
    return recusado('turma-cheia', `A turma está cheia (${ocupados} de ${turma.capacidade}).`)
  }
  const choque = turmas.find(
    (t) => t.ativa && t.id !== turma.id && t.diaDaSemana === turma.diaDaSemana && t.alunosFixos.includes(aluno.id) && seSobrepoem(t, turma),
  )
  if (choque) return recusado('conflito', `${nome} já está na turma de ${nomeDaTurma(choque).toLowerCase()}.`)
  return aceito({
    ...turma,
    alunosFixos: [...turma.alunosFixos, aluno.id],
    fixosDesde: { ...turma.fixosDesde, [aluno.id]: hoje },
  })
}

export function tirarDaTurma(turma: Turma, alunoId: Id): Resultado<Turma> {
  if (!turma.alunosFixos.includes(alunoId)) return recusado('nada-a-fazer', 'Este aluno não está na turma.')
  const fixosDesde = { ...turma.fixosDesde }
  delete fixosDesde[alunoId]
  return aceito({ ...turma, alunosFixos: turma.alunosFixos.filter((id) => id !== alunoId), fixosDesde })
}

export interface DiaDaGrade {
  dia: DiaDaSemana
  turmas: Turma[]
}

/** Turmas ativas da unidade por dia da semana (segunda primeiro), em ordem de horário. */
export function gradeDaSemana(turmas: readonly Turma[], unidadeId: Id): DiaDaGrade[] {
  return DIAS_DA_GRADE.map((dia) => ({
    dia,
    turmas: turmas
      .filter((t) => t.ativa && t.unidadeId === unidadeId && t.diaDaSemana === dia)
      .sort((a, b) => a.inicio.localeCompare(b.inicio)),
  })).filter((d) => d.turmas.length > 0)
}

/**
 * Quem pode entrar na turma: alunos ativos ou pausados da unidade que ainda não estão nela.
 * Primeiro quem tem plano maior que o número de turmas (está faltando turma), depois por nome.
 */
export function candidatosParaTurma(turma: Turma, alunos: readonly Aluno[], turmas: readonly Turma[]): Aluno[] {
  const quantas = (id: Id) => turmas.filter((t) => t.ativa && t.alunosFixos.includes(id)).length
  return alunos
    .filter((a) => a.situacao !== 'inativo' && a.unidadeId === turma.unidadeId && !turma.alunosFixos.includes(a.id))
    .map((a) => ({ a, falta: a.vezesPorSemana - quantas(a.id) }))
    .sort((x, y) => Number(y.falta > 0) - Number(x.falta > 0) || x.a.nome.localeCompare(y.a.nome, 'pt-BR'))
    .map((x) => x.a)
}

/** "7h às 7h50" */
export function horarioDaTurma(turma: Pick<Turma, 'inicio' | 'duracaoMin'>): string {
  return `${horaFalada(turma.inicio)} às ${horaFalada(horaDe(minutosDe(turma.inicio) + turma.duracaoMin))}`
}
