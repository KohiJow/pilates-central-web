import { batch, computed, signal } from '@preact/signals'
import { agoraDoApp, momento } from '../app/relogio'
import { aulasDoDia, montarAula } from '../dominio/agenda'
import type { FiltroDoDia } from '../dominio/agenda'
import { momentoDe, somarDias } from '../dominio/datas'
import { concederCredito, marcar, marcarTodosPresentes } from '../dominio/presenca'
import type { Alteracoes, Contexto } from '../dominio/presenca'
import { cancelarAula, candidatosAReposicao, desfazerEncaixe, encaixar, reabrirAula } from '../dominio/reposicao'
import type { OpcoesDeCancelamento } from '../dominio/reposicao'
import { aceito, recusado } from '../dominio/resultado'
import type { Resultado } from '../dominio/resultado'
import type { Aluno, Aula, CreditoReposicao, DataISO, Id, Marcacao, MembroEquipe, RegistroAula } from '../dominio/tipos'
import { inversoDe } from './desfazer'
import type { DadosBase, Intervalo, Repositorio } from './repositorio'

// Estado do app em sinais (@preact/signals): as telas leem e re-renderizam sozinhas.
// As ações aplicam a mudança na tela na hora (otimista), gravam no repositório e devolvem
// uma função de desfazer.

export const repositorio = signal<Repositorio | null>(null)
export const base = signal<DadosBase | null>(null)
export const registros = signal<ReadonlyMap<string, RegistroAula>>(new Map())
export const creditos = signal<ReadonlyMap<Id, CreditoReposicao>>(new Map())
export const situacao = signal<'carregando' | 'pronto' | 'erro'>('carregando')

const MARGEM_DA_JANELA = 42
let janela: Intervalo | null = null

export const alunosPorId = computed(() => new Map<Id, Aluno>((base.value?.alunos ?? []).map((a) => [a.id, a])))
export const equipePorId = computed(() => new Map<Id, MembroEquipe>((base.value?.equipe ?? []).map((e) => [e.id, e])))
export const unidades = computed(() => (base.value?.unidades ?? []).filter((u) => u.ativa))
const ativos = computed(() => new Set((base.value?.alunos ?? []).filter((a) => a.situacao === 'ativo').map((a) => a.id)))

export function nomeDoAluno(id: Id): string {
  return alunosPorId.value.get(id)?.nome ?? 'Aluno removido'
}

export function nomeDaEquipe(id: Id): string {
  return equipePorId.value.get(id)?.nome ?? 'Sem professor'
}

export function nomeDaUnidade(id: Id): string {
  return unidades.value.find((u) => u.id === id)?.nome ?? ''
}

/** Aulas de um dia, já com as exceções gravadas. Lê sinais: chamar dentro de componente. */
export function aulasNoDia(data: DataISO, filtro: FiltroDoDia = {}): Aula[] {
  const b = base.value
  if (!b) return []
  const mapa = registros.value
  const conjunto = ativos.value
  return aulasDoDia(data, b.turmas, (id) => mapa.get(id), filtro, { ehAtivo: (id) => conjunto.has(id) })
}

/** Uma aula pelo id `${turmaId}_${data}`. */
export function aulaPorId(idAula: string): Aula | undefined {
  const b = base.value
  const corte = idAula.lastIndexOf('_')
  if (!b || corte < 0) return undefined
  const turma = b.turmas.find((t) => t.id === idAula.slice(0, corte))
  if (!turma) return undefined
  const conjunto = ativos.value
  return montarAula(turma, idAula.slice(corte + 1), registros.value.get(idAula), { ehAtivo: (id) => conjunto.has(id) })
}

/** Créditos que podem ser usados nesta aula (um por aluno, o que vence primeiro). */
export function candidatosDaAula(aula: Aula): CreditoReposicao[] {
  return candidatosAReposicao(aula, creditos.value.values(), momento.value)
}

// ---------- carga ----------

export async function carregar(repo: Repositorio, hoje: DataISO): Promise<void> {
  situacao.value = 'carregando'
  try {
    const intervalo = { de: somarDias(hoje, -MARGEM_DA_JANELA), ate: somarDias(hoje, MARGEM_DA_JANELA) }
    const [dadosBase, lista, listaDeCreditos] = await Promise.all([
      repo.carregarBase(),
      repo.registros(intervalo),
      repo.creditos(),
    ])
    janela = intervalo
    batch(() => {
      repositorio.value = repo
      base.value = dadosBase
      registros.value = new Map(lista.map((r) => [r.id, r]))
      creditos.value = new Map(listaDeCreditos.map((c) => [c.id, c]))
      situacao.value = 'pronto'
    })
  } catch {
    situacao.value = 'erro'
  }
}

/** Garante que os registros de `data` estão carregados (a agenda pode ir longe no calendário). */
export async function garantirData(data: DataISO): Promise<void> {
  const repo = repositorio.peek()
  if (!repo || !janela || (data >= janela.de && data <= janela.ate)) return
  const novo = {
    de: data < janela.de ? somarDias(data, -14) : janela.de,
    ate: data > janela.ate ? somarDias(data, 14) : janela.ate,
  }
  const lista = await repo.registros(novo)
  janela = novo
  const mapa = new Map(registros.peek())
  for (const r of lista) if (!mapa.has(r.id)) mapa.set(r.id, r)
  registros.value = mapa
}

// ---------- gravação com desfazer ----------

function contexto(): Contexto {
  const agora = agoraDoApp()
  const config = base.peek()?.configuracao
  if (!config) throw new Error('dados ainda não carregados')
  return { agora: momentoDe(agora), instante: agora.toISOString(), config }
}

function aplicarNaTela(a: Alteracoes): void {
  const mapaRegistros = new Map(registros.peek())
  for (const r of a.registros) mapaRegistros.set(r.id, r)
  const mapaCreditos = new Map(creditos.peek())
  for (const id of a.creditosRemovidos) mapaCreditos.delete(id)
  for (const c of a.creditos) mapaCreditos.set(c.id, c)
  batch(() => {
    registros.value = mapaRegistros
    creditos.value = mapaCreditos
  })
}

async function gravar(feito: Alteracoes): Promise<() => Promise<void>> {
  const repo = repositorio.peek()
  if (!repo) throw new Error('sem repositório')
  const antesRegistros = registros.peek()
  const antesCreditos = creditos.peek()
  const voltar = () =>
    inversoDe(
      feito,
      { registro: (id) => antesRegistros.get(id), credito: (id) => antesCreditos.get(id) },
      { registro: (id) => registros.peek().get(id) },
      agoraDoApp().toISOString(),
    )
  aplicarNaTela(feito)
  try {
    await repo.salvar(feito)
  } catch (erro) {
    aplicarNaTela(voltar())
    throw erro
  }
  let desfeito = false
  return async () => {
    if (desfeito) return
    desfeito = true
    const inverso = voltar()
    aplicarNaTela(inverso)
    await repo.salvar(inverso)
  }
}

export type Feito<T = object> = Resultado<T & { alteracoes: Alteracoes; desfazer: () => Promise<void> }>

async function executar<T extends object>(calcular: () => Resultado<T & { alteracoes: Alteracoes }>): Promise<Feito<T>> {
  const r = calcular()
  if (!r.ok) return r
  try {
    const desfazer = await gravar(r.valor.alteracoes)
    return aceito({ ...r.valor, desfazer })
  } catch {
    return recusado('nada-a-fazer', 'Não deu para salvar. Tente de novo.')
  }
}

const buscaCredito = (id: Id) => creditos.peek().get(id)
const semAula = () => recusado<never>('aluno-fora-da-aula', 'Esta aula não existe mais.')

export function marcarPresenca(idAula: string, alunoId: Id, marcacao: Marcacao | null) {
  return executar<{ creditoGerado?: CreditoReposicao; avisoForaDoPrazo: boolean }>(() => {
    const aula = aulaPorId(idAula)
    if (!aula) return semAula()
    return marcar(aula, registros.peek().get(idAula), alunoId, marcacao, buscaCredito, contexto())
  })
}

export function marcarTodosComoPresentes(idAula: string) {
  return executar<{ quantidade: number; alunos: Id[] }>(() => {
    const aula = aulaPorId(idAula)
    if (!aula) return semAula()
    return marcarTodosPresentes(aula, registros.peek().get(idAula), contexto())
  })
}

export function darCreditoForaDoPrazo(idAula: string, alunoId: Id) {
  return executar<{ creditoGerado: CreditoReposicao }>(() => {
    const aula = aulaPorId(idAula)
    if (!aula) return semAula()
    return concederCredito(aula, alunoId, buscaCredito, contexto())
  })
}

export function encaixarReposicao(idAula: string, creditoId: Id) {
  return executar<object>(() => {
    const aula = aulaPorId(idAula)
    const credito = creditos.peek().get(creditoId)
    if (!aula || !credito) return semAula()
    const r = encaixar(aula, registros.peek().get(idAula), credito, contexto())
    return r.ok ? aceito({ alteracoes: r.valor }) : r
  })
}

export function tirarReposicao(idAula: string, alunoId: Id) {
  return executar<object>(() => {
    const aula = aulaPorId(idAula)
    if (!aula) return semAula()
    const r = desfazerEncaixe(aula, registros.peek().get(idAula), alunoId, buscaCredito, contexto())
    return r.ok ? aceito({ alteracoes: r.valor }) : r
  })
}

export function cancelar(idAula: string, opcoes: OpcoesDeCancelamento) {
  return executar<{ creditosGerados: number }>(() => {
    const aula = aulaPorId(idAula)
    if (!aula) return semAula()
    return cancelarAula(aula, registros.peek().get(idAula), opcoes, buscaCredito, contexto())
  })
}

export function reabrir(idAula: string) {
  return executar<object>(() => {
    const aula = aulaPorId(idAula)
    if (!aula) return semAula()
    const r = reabrirAula(aula, registros.peek().get(idAula), buscaCredito, contexto())
    return r.ok ? aceito({ alteracoes: r.valor }) : r
  })
}
