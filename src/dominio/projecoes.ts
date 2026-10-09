// Cópias enxutas que a equipe grava para quem não pode ler tudo: a vaga de cada aula (o aluno vê
// quantos lugares há, sem nomes), o portal de cada aluno (as turmas fixas dele) e a página
// pública (horários com vaga para aula experimental). Tudo calculado das mesmas regras da
// agenda: a cópia nunca diz algo diferente do que a equipe vê.
import { aulasDoDia, faseDaAula } from './agenda'
import { antecedenciaEmMinutos } from './presenca'
import { horaDe, minutosDe, somarDias } from './datas'
import type { Momento } from './datas'
import { primeiroNome } from './texto'
import type {
  Aluno,
  Aula,
  Configuracao,
  DataISO,
  HorarioPublico,
  Id,
  Instante,
  PaginaPublica,
  PortalDoAluno,
  RegistroAula,
  Turma,
  TurmaDoPortal,
  Unidade,
  VagaDaAula,
} from './tipos'

/** Quantos dias à frente o aluno e a página pública enxergam. */
export const DIAS_DA_JANELA = 14

/** Quem quer conhecer o estúdio pede com pelo menos este tempo antes da aula. */
export const ANTECEDENCIA_EXPERIMENTAL_HORAS = 2

export interface EstadoParaProjetar {
  configuracao: Configuracao
  unidades: readonly Unidade[]
  alunos: readonly Aluno[]
  turmas: readonly Turma[]
  registro: (idAula: string) => RegistroAula | undefined
}

export function vagaDaAula(aula: Aula, instante: Instante): VagaDaAula {
  return {
    turmaId: aula.turmaId,
    unidadeId: aula.unidadeId,
    data: aula.data,
    inicio: aula.inicio,
    fim: aula.fim,
    capacidade: aula.capacidade,
    ocupadas: aula.ocupadas,
    cancelada: aula.cancelamento !== undefined,
    atualizadoEm: instante,
  }
}

/** Aulas de hoje até `dias` à frente (inclusive), já com as exceções gravadas. */
export function aulasDaJanela(e: EstadoParaProjetar, hoje: DataISO, dias = DIAS_DA_JANELA): Aula[] {
  const ativos = new Set(e.alunos.filter((a) => a.situacao === 'ativo').map((a) => a.id))
  const saida: Aula[] = []
  for (let d = hoje; d <= somarDias(hoje, dias); d = somarDias(d, 1)) {
    saida.push(...aulasDoDia(d, e.turmas, e.registro, {}, { ehAtivo: (id) => ativos.has(id) }))
  }
  return saida
}

/** Vagas de todas as aulas da janela, por id da aula. */
export function vagasDaJanela(e: EstadoParaProjetar, hoje: DataISO, instante: Instante, dias = DIAS_DA_JANELA): Map<string, VagaDaAula> {
  return new Map(aulasDaJanela(e, hoje, dias).map((a) => [a.id, vagaDaAula(a, instante)]))
}

/** Turmas fixas de um aluno, do jeito que ele vê (sem os colegas). */
export function portalDoAluno(aluno: Aluno, turmas: readonly Turma[], instante: Instante): PortalDoAluno {
  const dele: TurmaDoPortal[] = turmas
    .filter((t) => t.ativa && t.alunosFixos.includes(aluno.id))
    .map((t) => {
      const entrou = t.fixosDesde?.[aluno.id]
      return {
        turmaId: t.id,
        diaDaSemana: t.diaDaSemana,
        inicio: t.inicio,
        fim: horaDe(minutosDe(t.inicio) + t.duracaoMin),
        desde: entrou && entrou > t.desde ? entrou : t.desde,
      }
    })
    .sort((a, b) => a.diaDaSemana - b.diaDaSemana || a.inicio.localeCompare(b.inicio))
  return { alunoId: aluno.id, nome: primeiroNome(aluno.nome), unidadeId: aluno.unidadeId, turmas: dele, atualizadoEm: instante }
}

/** Portal de cada aluno com acesso liberado (os outros não têm portal). */
export function portaisDosAlunos(e: EstadoParaProjetar, instante: Instante): Map<Id, PortalDoAluno> {
  return new Map(
    e.alunos.filter((a) => a.acesso && a.situacao !== 'inativo').map((a) => [a.id, portalDoAluno(a, e.turmas, instante)]),
  )
}

/**
 * Horários que podem receber uma aula experimental: aula de pé, com vaga, numa unidade aberta,
 * começando daqui a pelo menos duas horas.
 */
export function horariosParaExperimental(aulas: readonly Aula[], unidades: readonly Unidade[], agora: Momento): HorarioPublico[] {
  const abertas = new Set(unidades.filter((u) => u.ativa).map((u) => u.id))
  return aulas
    .filter(
      (a) =>
        !a.cancelamento &&
        a.vagas > 0 &&
        abertas.has(a.unidadeId) &&
        faseDaAula(a, agora) === 'futura' &&
        antecedenciaEmMinutos(a, agora) >= ANTECEDENCIA_EXPERIMENTAL_HORAS * 60,
    )
    .map((a) => ({ data: a.data, inicio: a.inicio, fim: a.fim, unidadeId: a.unidadeId, vagas: a.vagas }))
    .sort((a, b) => a.data.localeCompare(b.data) || a.inicio.localeCompare(b.inicio) || a.unidadeId.localeCompare(b.unidadeId))
}

export function paginaPublica(e: EstadoParaProjetar, agora: Momento, instante: Instante): PaginaPublica {
  const ligada = e.configuracao.paginaExperimental
  return {
    nomeEstudio: e.configuracao.nomeEstudio,
    whatsapp: e.configuracao.whatsapp,
    unidades: e.unidades.filter((u) => u.ativa).map((u) => ({ id: u.id, nome: u.nome, endereco: u.endereco })),
    experimental: ligada,
    horarios: ligada ? horariosParaExperimental(aulasDaJanela(e, agora.data), e.unidades, agora) : [],
    atualizadoEm: instante,
  }
}

// ---------- o que mudou entre duas versões ----------

/** Igualdade de duas projeções ignorando quando foram feitas. */
export function mesmaProjecao<T extends { atualizadoEm: Instante }>(a: T | undefined, b: T | undefined): boolean {
  if (!a || !b) return a === b
  return JSON.stringify({ ...a, atualizadoEm: '' }) === JSON.stringify({ ...b, atualizadoEm: '' })
}

export interface MudancaDeVaga {
  id: string
  vaga: VagaDaAula
  /** quanto somar em `ocupadas` (relativo: duas pessoas mexendo na mesma aula não se apagam) */
  delta: number
}

/**
 * Vagas que mudaram de um estado para outro (mesma janela, mesmo relógio). A aula que deixou de
 * existir (turma encerrada) fica como cancelada, para ninguém se encaixar nela.
 */
export function mudancasDeVagas(antes: ReadonlyMap<string, VagaDaAula>, depois: ReadonlyMap<string, VagaDaAula>): MudancaDeVaga[] {
  const saida: MudancaDeVaga[] = []
  for (const [id, vaga] of depois) {
    const anterior = antes.get(id)
    if (mesmaProjecao(anterior, vaga)) continue
    saida.push({ id, vaga, delta: vaga.ocupadas - (anterior?.ocupadas ?? 0) })
  }
  for (const [id, vaga] of antes) {
    if (!depois.has(id) && !vaga.cancelada) saida.push({ id, vaga: { ...vaga, cancelada: true }, delta: 0 })
  }
  return saida
}
