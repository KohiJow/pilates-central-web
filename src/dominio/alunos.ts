// Cadastro de alunos: validação do formulário, plano, situação (ativo, pausado, arquivado),
// busca e a conferência do plano com as turmas fixas.
import { turmasDoAluno } from './agenda'
import { dataCurta, ehDataValida } from './datas'
import { lerValor } from './pagamentos'
import { aceito, recusado } from './resultado'
import type { ErrosDeCampo, Resultado } from './resultado'
import { ehEmailValido, normalizar, normalizarTelefone, primeiroNome } from './texto'
import type { Aluno, DataISO, FinanceiroDoAluno, FormaPagamento, Id, SituacaoAluno, Turma, Unidade } from './tipos'

export const NOME_DA_SITUACAO: Record<SituacaoAluno, string> = {
  ativo: 'Ativo',
  pausado: 'Pausado',
  inativo: 'Arquivado',
}

export interface RascunhoAluno {
  nome: string
  telefone: string
  email: string
  unidadeId: Id
  vezesPorSemana: number
  observacao: string
  desde: DataISO
}

export interface RascunhoPlano {
  valorMensal: string
  formaPreferida: FormaPagamento
  diaVencimento: number
}

export type CampoAluno = keyof RascunhoAluno | keyof RascunhoPlano

export interface ContextoDoCadastro {
  unidades: readonly Unidade[]
  turmas: readonly Turma[]
  hoje: DataISO
  /** id do aluno sendo editado (ausente no cadastro novo) */
  alunoId?: Id
}

export function validarAluno(r: RascunhoAluno, ctx: ContextoDoCadastro): ErrosDeCampo<CampoAluno> {
  const erros: ErrosDeCampo<CampoAluno> = {}
  const nome = r.nome.trim()
  if (nome.length < 3) erros.nome = 'Escreva o nome do aluno.'
  else if (!/\s/.test(nome)) erros.nome = 'Escreva nome e sobrenome, para não confundir com outro aluno.'
  if (!normalizarTelefone(r.telefone)) erros.telefone = 'Use DDD e número, por exemplo (19) 90000-0000.'
  if (r.email.trim() && !ehEmailValido(r.email)) erros.email = 'Confira o e-mail (ou deixe em branco).'
  const unidade = ctx.unidades.find((u) => u.id === r.unidadeId)
  if (!unidade || !unidade.ativa) erros.unidadeId = 'Escolha a unidade.'
  else if (ctx.alunoId) {
    const deOutraUnidade = turmasDoAluno(ctx.alunoId, ctx.turmas).filter((t) => t.unidadeId !== r.unidadeId)
    if (deOutraUnidade.length > 0) {
      erros.unidadeId = 'Tire o aluno das turmas da outra unidade antes de trocar.'
    }
  }
  if (!Number.isInteger(r.vezesPorSemana) || r.vezesPorSemana < 1 || r.vezesPorSemana > 6) {
    erros.vezesPorSemana = 'Escolha quantas vezes por semana.'
  }
  if (r.observacao.length > 500) erros.observacao = 'Use no máximo 500 letras.'
  if (!ehDataValida(r.desde)) erros.desde = 'Escolha a data de início.'
  else if (r.desde > ctx.hoje) erros.desde = 'A data de início não pode ser depois de hoje.'
  return erros
}

export function validarPlano(p: RascunhoPlano): ErrosDeCampo<CampoAluno> {
  const erros: ErrosDeCampo<CampoAluno> = {}
  const valor = lerValor(p.valorMensal)
  if (valor === null || valor <= 0) erros.valorMensal = 'Digite a mensalidade, por exemplo 280.'
  else if (valor > 1_000_000) erros.valorMensal = 'Valor alto demais. Confira os zeros.'
  if (!Number.isInteger(p.diaVencimento) || p.diaVencimento < 1 || p.diaVencimento > 28) {
    erros.diaVencimento = 'Escolha um dia de 1 a 28.'
  }
  return erros
}

/** Outro aluno com o mesmo telefone: não impede (família divide número), mas avisa. */
export function telefoneRepetido(telefone: string, alunos: readonly Aluno[], alunoId?: Id): Aluno | undefined {
  const numero = normalizarTelefone(telefone)
  if (!numero) return undefined
  return alunos.find((a) => a.id !== alunoId && a.situacao !== 'inativo' && a.telefone === numero)
}

/** Monta o aluno a partir do formulário (sem validar: chame `validarAluno` antes). */
export function montarAluno(r: RascunhoAluno, id: Id, anterior?: Aluno): Aluno {
  return {
    id,
    nome: r.nome.trim().replace(/\s+/g, ' '),
    unidadeId: r.unidadeId,
    telefone: normalizarTelefone(r.telefone) ?? '',
    email: r.email.trim().toLowerCase(),
    vezesPorSemana: r.vezesPorSemana,
    situacao: anterior?.situacao ?? 'ativo',
    observacao: r.observacao.trim(),
    desde: r.desde,
  }
}

export function montarFinanceiro(p: RascunhoPlano, aluno: Pick<Aluno, 'id' | 'unidadeId'>): FinanceiroDoAluno {
  return {
    alunoId: aluno.id,
    unidadeId: aluno.unidadeId,
    valorMensal: lerValor(p.valorMensal) ?? 0,
    formaPreferida: p.formaPreferida,
    diaVencimento: p.diaVencimento,
  }
}

export function rascunhoDe(aluno: Aluno): RascunhoAluno {
  return {
    nome: aluno.nome,
    telefone: aluno.telefone,
    email: aluno.email,
    unidadeId: aluno.unidadeId,
    vezesPorSemana: aluno.vezesPorSemana,
    observacao: aluno.observacao,
    desde: aluno.desde,
  }
}

export interface MudancaDeSituacao {
  aluno: Aluno
  /** turmas que mudaram (arquivar tira o aluno das turmas e libera os lugares) */
  turmas: Turma[]
}

/**
 * Pausar guarda o lugar nas turmas (férias, viagem): o aluno some das aulas e a vaga fica livre
 * para reposição. Arquivar tira o aluno das turmas. Voltar a ativo não recoloca nas turmas.
 * `reposicoesMarcadas` são as datas em que o aluno está encaixado daqui para a frente.
 */
export function mudarSituacao(
  aluno: Aluno,
  nova: SituacaoAluno,
  turmas: readonly Turma[],
  reposicoesMarcadas: readonly DataISO[] = [],
): Resultado<MudancaDeSituacao> {
  const nome = primeiroNome(aluno.nome)
  if (aluno.situacao === nova) return recusado('nada-a-fazer', `${nome} já está ${NOME_DA_SITUACAO[nova].toLowerCase()}.`)
  if (nova !== 'ativo' && reposicoesMarcadas.length > 0) {
    const primeira = [...reposicoesMarcadas].sort()[0] ?? ''
    return recusado('conflito', `${nome} tem reposição marcada em ${dataCurta(primeira)}. Desfaça antes.`)
  }
  const atualizado: Aluno = { ...aluno, situacao: nova }
  if (nova !== 'inativo') return aceito({ aluno: atualizado, turmas: [] })
  const mudadas = turmasDoAluno(aluno.id, turmas).map((t) => tirarDaLista(t, aluno.id))
  return aceito({ aluno: atualizado, turmas: mudadas })
}

function tirarDaLista(turma: Turma, alunoId: Id): Turma {
  const fixosDesde = { ...turma.fixosDesde }
  delete fixosDesde[alunoId]
  return { ...turma, alunosFixos: turma.alunosFixos.filter((id) => id !== alunoId), fixosDesde }
}

export interface FiltroDeAlunos {
  busca: string
  unidadeId?: Id
  /** sem situação: ativos e pausados (os arquivados só aparecem quando pedidos) */
  situacao?: SituacaoAluno
}

export function filtrarAlunos(alunos: readonly Aluno[], filtro: FiltroDeAlunos): Aluno[] {
  const termo = normalizar(filtro.busca)
  const digitos = filtro.busca.replace(/\D/g, '')
  return alunos
    .filter((a) => (filtro.situacao ? a.situacao === filtro.situacao : a.situacao !== 'inativo'))
    .filter((a) => !filtro.unidadeId || a.unidadeId === filtro.unidadeId)
    .filter((a) => {
      if (!termo) return true
      if (normalizar(a.nome).includes(termo)) return true
      // busca pelo telefone com 4 dígitos ou mais ("0012" acha o final do número)
      return digitos.length >= 4 && a.telefone.includes(digitos)
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/**
 * Mensalidade mais comum entre os alunos ativos com o mesmo plano (fora Gympass e TotalPass,
 * que entram pelo repasse): o cadastro novo já vem com o valor que o estúdio costuma cobrar.
 */
export function mensalidadeSugerida(
  vezesPorSemana: number,
  alunos: readonly Aluno[],
  financeiro: ReadonlyMap<Id, FinanceiroDoAluno>,
): number | null {
  const contagem = new Map<number, number>()
  for (const a of alunos) {
    if (a.situacao !== 'ativo' || a.vezesPorSemana !== vezesPorSemana) continue
    const f = financeiro.get(a.id)
    if (!f || f.formaPreferida === 'gympass' || f.formaPreferida === 'totalpass') continue
    contagem.set(f.valorMensal, (contagem.get(f.valorMensal) ?? 0) + 1)
  }
  let melhor: number | null = null
  let vezes = 0
  for (const [valor, n] of contagem) {
    if (n > vezes || (n === vezes && melhor !== null && valor < melhor)) {
      melhor = valor
      vezes = n
    }
  }
  return melhor
}

export interface ConferenciaDoPlano {
  vezes: number
  turmas: number
  /** texto para a tela quando não bate; undefined quando está certo */
  aviso?: string
}

/** O plano diz 2x ou 3x: confere com o número de turmas fixas do aluno. */
export function conferirPlano(aluno: Aluno, turmas: readonly Turma[]): ConferenciaDoPlano {
  const n = turmasDoAluno(aluno.id, turmas).length
  const conferencia: ConferenciaDoPlano = { vezes: aluno.vezesPorSemana, turmas: n }
  if (aluno.situacao === 'inativo' || n === aluno.vezesPorSemana) return conferencia
  const emQuantas = n === 0 ? 'não está em nenhuma turma' : `está em ${n === 1 ? '1 turma' : `${n} turmas`}`
  conferencia.aviso = `Plano de ${aluno.vezesPorSemana}x por semana, mas ${emQuantas}.`
  return conferencia
}
