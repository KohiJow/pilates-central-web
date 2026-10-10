// Primeiro uso: montar o estúdio em passos curtos (estúdio, unidades, equipe, grade da semana,
// alunos) e a grade visual, em que tocar no horário cria a turma. Puro: a tela guarda o rascunho
// e grava pelas ações de sempre (salvarConfiguracao, salvarUnidade, convidarParaEquipe,
// criarTurmasEmLote, importarAlunos), com as mesmas regras do banco.
import { horaDe, horaFalada, minutosDe } from './datas'
import { aceito, recusado, semErros } from './resultado'
import type { Resultado } from './resultado'
import type { Aluno, DataISO, DiaDaSemana, Hora, Id, MembroEquipe, Turma, Unidade } from './tipos'
import { NOME_DO_DIA, nomeDaTurma, novaTurma, validarTurma } from './turmas'
import type { RascunhoTurma } from './turmas'

export type Passo = 'estudio' | 'unidades' | 'equipe' | 'turmas' | 'alunos' | 'fim'

export const PASSOS: readonly { id: Passo; titulo: string }[] = [
  { id: 'estudio', titulo: 'O estúdio' },
  { id: 'unidades', titulo: 'Unidades' },
  { id: 'equipe', titulo: 'Professores' },
  { id: 'turmas', titulo: 'Turmas da semana' },
  { id: 'alunos', titulo: 'Alunos' },
  { id: 'fim', titulo: 'Pronto' },
]

/** Quantos passos contam no progresso ("Passo 2 de 5"): o fim é o resumo. */
export const TOTAL_DE_PASSOS = PASSOS.length - 1

export function ehPasso(texto: string | undefined): texto is Passo {
  return PASSOS.some((p) => p.id === texto)
}

export function indiceDoPasso(p: Passo): number {
  return PASSOS.findIndex((x) => x.id === p)
}

export function passoSeguinte(p: Passo): Passo {
  return PASSOS[Math.min(indiceDoPasso(p) + 1, PASSOS.length - 1)]?.id ?? 'fim'
}

export function passoAnterior(p: Passo): Passo | null {
  const i = indiceDoPasso(p)
  return i > 0 ? (PASSOS[i - 1]?.id ?? null) : null
}

interface DoEstudio {
  unidades: readonly Unidade[]
  equipe: readonly MembroEquipe[]
  turmas: readonly Turma[]
  alunos: readonly Aluno[]
}

/** Estúdio ainda sem grade nem alunos: é quando o guia abre sozinho para a administração. */
export function estudioVazio(b: Pick<DoEstudio, 'turmas' | 'alunos'>): boolean {
  return !b.turmas.some((t) => t.ativa) && !b.alunos.some((a) => a.situacao !== 'inativo')
}

/** Onde o guia retoma: o primeiro passo que ainda não tem nada. */
export function passoInicial(b: DoEstudio): Passo {
  if (!b.unidades.some((u) => u.ativa)) return 'estudio'
  if (!b.turmas.some((t) => t.ativa)) return b.equipe.some((m) => m.ativo && m.papel === 'professor') ? 'turmas' : 'equipe'
  if (!b.alunos.some((a) => a.situacao !== 'inativo')) return 'alunos'
  return 'fim'
}

// ---------- a grade visual ----------

/** Os horários que a grade sempre mostra: de hora em hora, das 6h às 21h. */
export const HORAS_DA_GRADE: readonly Hora[] = Array.from({ length: 16 }, (_, i) => horaDe((6 + i) * 60))

/** Os dias da grade: segunda a sábado e, se o estúdio abre, domingo. */
export function diasDaGrade(comDomingo: boolean): DiaDaSemana[] {
  return comDomingo ? [1, 2, 3, 4, 5, 6, 0] : [1, 2, 3, 4, 5, 6]
}

/** As linhas da grade: as horas cheias mais os horários quebrados que já existem (18h30) ou foram pedidos. */
export function linhasDaGrade(turmas: readonly Pick<Turma, 'inicio'>[], extras: readonly Hora[] = []): Hora[] {
  return [...new Set([...HORAS_DA_GRADE, ...turmas.map((t) => t.inicio), ...extras])].sort((a, b) => minutosDe(a) - minutosDe(b))
}

/** Como cada turma nova da grade nasce (a pessoa muda antes de tocar nos horários). */
export interface PadraoDaGrade {
  unidadeId: Id
  professorId: Id
  duracaoMin: number
  capacidade: number
}

export interface ContextoDaGrade {
  /** turmas que já existem (gravadas) */
  turmas: readonly Turma[]
  equipe: readonly MembroEquipe[]
  unidades: readonly Unidade[]
  hoje: DataISO
}

const naCelula = (unidadeId: Id, dia: DiaDaSemana, inicio: Hora) => (t: Pick<Turma, 'unidadeId' | 'diaDaSemana' | 'inicio'>) =>
  t.unidadeId === unidadeId && t.diaDaSemana === dia && t.inicio === inicio

/** O que há numa célula da grade: uma turma gravada, uma nova (do rascunho) ou nada. */
export function celula(
  novas: readonly RascunhoTurma[],
  ctx: Pick<ContextoDaGrade, 'turmas'>,
  unidadeId: Id,
  dia: DiaDaSemana,
  inicio: Hora,
): { tipo: 'gravada'; turma: Turma } | { tipo: 'nova'; rascunho: RascunhoTurma } | { tipo: 'vazia' } {
  const gravada = ctx.turmas.find((t) => t.ativa && naCelula(unidadeId, dia, inicio)(t))
  if (gravada) return { tipo: 'gravada', turma: gravada }
  const nova = novas.find(naCelula(unidadeId, dia, inicio))
  return nova ? { tipo: 'nova', rascunho: nova } : { tipo: 'vazia' }
}

/** As turmas do rascunho como turmas de verdade, só para conferir choque de horário. */
function comoTurmas(novas: readonly RascunhoTurma[], hoje: DataISO): Turma[] {
  return novas.map((r, i) => novaTurma(r, `rascunho-${i}`, hoje))
}

/** Confere uma turma nova contra as gravadas e as do rascunho (o mesmo validarTurma do formulário). */
function conferir(r: RascunhoTurma, novas: readonly RascunhoTurma[], ctx: ContextoDaGrade): string | null {
  const erros = validarTurma(r, { turmas: [...ctx.turmas, ...comoTurmas(novas, ctx.hoje)], equipe: ctx.equipe, unidades: ctx.unidades })
  return semErros(erros) ? null : (Object.values(erros)[0] ?? 'Confira a turma.')
}

/**
 * Tocar num horário: célula vazia ganha uma turma nova com o padrão escolhido; tocar de novo
 * numa turma nova tira. Turma já gravada não sai por aqui (tem alunos e histórico): a pessoa
 * mexe nela em Turmas.
 */
export function alternarNaGrade(
  novas: readonly RascunhoTurma[],
  dia: DiaDaSemana,
  inicio: Hora,
  padrao: PadraoDaGrade,
  ctx: ContextoDaGrade,
): Resultado<{ novas: RascunhoTurma[]; criou: boolean }> {
  const atual = celula(novas, ctx, padrao.unidadeId, dia, inicio)
  if (atual.tipo === 'gravada') {
    return recusado('conflito', `A turma de ${nomeDaTurma(atual.turma).toLowerCase()} já existe. Para mudar, abra em Turmas.`)
  }
  if (atual.tipo === 'nova') return aceito({ novas: novas.filter((r) => r !== atual.rascunho), criou: false })
  const r: RascunhoTurma = { ...padrao, diaDaSemana: dia, inicio }
  const erro = conferir(r, novas, ctx)
  if (erro) return recusado('conflito', erro)
  return aceito({ novas: [...novas, r], criou: true })
}

/**
 * Copia o dia `de` (as turmas gravadas e as novas daquela unidade) para outros dias: cada
 * horário vira uma turma nova no mesmo horário, com o mesmo professor, duração e lugares. O que
 * já está ocupado no destino ou dá choque de horário fica de fora (e é contado).
 */
export function copiarDia(
  novas: readonly RascunhoTurma[],
  unidadeId: Id,
  de: DiaDaSemana,
  para: readonly DiaDaSemana[],
  ctx: ContextoDaGrade,
): { novas: RascunhoTurma[]; copiadas: number; puladas: number } {
  const doDia: RascunhoTurma[] = [
    ...ctx.turmas
      .filter((t) => t.ativa && t.unidadeId === unidadeId && t.diaDaSemana === de)
      .map((t) => ({ unidadeId, diaDaSemana: de, inicio: t.inicio, duracaoMin: t.duracaoMin, capacidade: t.capacidade, professorId: t.professorId })),
    ...novas.filter((r) => r.unidadeId === unidadeId && r.diaDaSemana === de),
  ].sort((a, b) => minutosDe(a.inicio) - minutosDe(b.inicio))
  let lista = [...novas]
  let copiadas = 0
  let puladas = 0
  for (const dia of para) {
    if (dia === de) continue
    for (const origem of doDia) {
      const r = { ...origem, diaDaSemana: dia }
      if (celula(lista, ctx, unidadeId, dia, r.inicio).tipo !== 'vazia' || conferir(r, lista, ctx)) {
        puladas++
        continue
      }
      lista = [...lista, r]
      copiadas++
    }
  }
  return { novas: lista, copiadas, puladas }
}

/** "seg 7h, 8h e 18h": o dia numa linha, para o resumo e o leitor de tela. */
export function resumoDoDia(dia: DiaDaSemana, horas: readonly Hora[]): string {
  const ordenadas = [...horas].sort((a, b) => minutosDe(a) - minutosDe(b)).map(horaFalada)
  if (ordenadas.length === 0) return `${NOME_DO_DIA[dia]}: sem turma`
  const lista = ordenadas.length === 1 ? ordenadas[0] : `${ordenadas.slice(0, -1).join(', ')} e ${ordenadas[ordenadas.length - 1]}`
  return `${NOME_DO_DIA[dia]}: ${lista}`
}

// ---------- o fim: o que ficou pronto ----------

export interface ResumoDaMontagem {
  unidades: number
  professores: number
  /** convites que a administração ainda precisa mandar (pessoa cadastrada que não entrou) */
  convitesPendentes: number
  turmas: number
  alunos: number
}

export function resumoDaMontagem(b: DoEstudio): ResumoDaMontagem {
  const equipe = b.equipe.filter((m) => m.ativo)
  return {
    unidades: b.unidades.filter((u) => u.ativa).length,
    professores: equipe.filter((m) => m.papel === 'professor').length,
    convitesPendentes: equipe.filter((m) => m.convite).length,
    turmas: b.turmas.filter((t) => t.ativa).length,
    alunos: b.alunos.filter((a) => a.situacao !== 'inativo').length,
  }
}
