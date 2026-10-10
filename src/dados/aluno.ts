// Estado do app do aluno em sinais. Cada ação confere a regra no domínio (para explicar o "não"
// na hora), grava e relê os dados; devolve como desfazer.
import { computed, signal } from '@preact/signals'
import { agoraDoApp, hoje, momento } from '../app/relogio'
import {
  aulasParaRepor,
  avisarFalta,
  conferirReposicao,
  desfazerAviso,
  desistirDaReposicao,
  meusCreditosLivres,
  minhasAulas,
} from '../dominio/minhasAulas'
import type { DadosDoAluno, MinhaAula } from '../dominio/minhasAulas'
import { aceito, recusado } from '../dominio/resultado'
import type { Resultado } from '../dominio/resultado'
import type { CreditoReposicao, VagaDaAula } from '../dominio/tipos'
import { tipoDaFalha } from './falhas'
import { RecusaDoAluno } from './repositorioDoAluno'
import type { RepositorioDoAluno } from './repositorioDoAluno'

export const repositorioDoAluno = signal<RepositorioDoAluno | null>(null)
export const dadosDoAluno = signal<DadosDoAluno | null>(null)
export const situacaoDoAluno = signal<'carregando' | 'pronto' | 'erro'>('carregando')
export const mensagemDeErroDoAluno = signal('')

export const aulasDoAluno = computed(() => (dadosDoAluno.value ? minhasAulas(dadosDoAluno.value, momento.value) : []))
export const creditosLivres = computed(() => (dadosDoAluno.value ? meusCreditosLivres(dadosDoAluno.value, hoje.value) : []))

export function opcoesDeReposicao(credito: CreditoReposicao): VagaDaAula[] {
  const d = dadosDoAluno.value
  return d ? aulasParaRepor(credito, d, momento.value) : []
}

export async function carregarAluno(repo: RepositorioDoAluno, silencioso = false): Promise<void> {
  repositorioDoAluno.value = repo
  if (!silencioso) situacaoDoAluno.value = 'carregando'
  try {
    dadosDoAluno.value = await repo.carregar()
    situacaoDoAluno.value = 'pronto'
  } catch (erro) {
    mensagemDeErroDoAluno.value =
      erro instanceof RecusaDoAluno ? erro.message : 'Não deu para carregar as suas aulas. Confira a internet e tente de novo.'
    situacaoDoAluno.value = 'erro'
  }
}

/** Sem fila para o aluno (o prazo e a vaga mudam enquanto espera): diz o que houve e pede para tentar de novo. */
function fraseParaOAluno(erro: unknown): string {
  const tipo = tipoDaFalha(erro)
  if (tipo === 'rede') return 'Sem internet agora: nada foi gravado. Tente de novo quando a conexão voltar.'
  if (tipo === 'permissao') return 'O app não conseguiu gravar com a sua conta. Fale com o estúdio pelo WhatsApp.'
  return 'Não deu para salvar. Confira a internet e tente de novo.'
}

type Feito = Resultado<{ desfazer?: () => Promise<Resultado<object>> }>

async function executar(acao: (repo: RepositorioDoAluno) => Promise<void>): Promise<Resultado<object>> {
  const repo = repositorioDoAluno.peek()
  if (!repo) return recusado('nada-a-fazer', 'Os dados ainda não carregaram.')
  try {
    await acao(repo)
  } catch (erro) {
    await carregarAluno(repo, true)
    return recusado('nada-a-fazer', erro instanceof RecusaDoAluno ? erro.message : fraseParaOAluno(erro))
  }
  await carregarAluno(repo, true)
  return aceito({})
}

function atual(aula: MinhaAula): MinhaAula | undefined {
  return aulasDoAluno.peek().find((a) => a.id === aula.id && a.origem === aula.origem)
}

/** Avisa a falta. `semCredito` diz que passou do limite de reposições do mês. */
export async function avisarAula(aula: MinhaAula): Promise<Resultado<{ semCredito: boolean; desfazer: () => Promise<Resultado<object>> }>> {
  const d = dadosDoAluno.peek()
  if (!d) return recusado('nada-a-fazer', 'Os dados ainda não carregaram.')
  const instante = agoraDoApp().toISOString()
  const r = avisarFalta(aula, d, momento.peek(), instante)
  if (!r.ok) return r
  const feito = await executar((repo) => repo.avisar(aula, r.valor.credito, instante))
  if (!feito.ok) return feito
  return aceito({
    semCredito: !r.valor.credito,
    desfazer: async () => {
      const agora = atual(aula)
      return agora ? desfazerAvisoDaAula(agora) : recusado('nada-a-fazer', 'Esta aula saiu da lista.')
    },
  })
}

export async function desfazerAvisoDaAula(aula: MinhaAula): Promise<Resultado<object>> {
  const d = dadosDoAluno.peek()
  if (!d) return recusado('nada-a-fazer', 'Os dados ainda não carregaram.')
  const r = desfazerAviso(aula, d, momento.peek())
  if (!r.ok) return r
  return executar((repo) => repo.desfazerAviso(aula, r.valor.creditoId, agoraDoApp().toISOString()))
}

export async function reporEm(credito: CreditoReposicao, vaga: VagaDaAula): Promise<Feito> {
  const d = dadosDoAluno.peek()
  if (!d) return recusado('nada-a-fazer', 'Os dados ainda não carregaram.')
  const r = conferirReposicao(credito, vaga, d, momento.peek())
  if (!r.ok) return r
  const feito = await executar((repo) => repo.encaixar(vaga, credito, agoraDoApp().toISOString()))
  if (!feito.ok) return feito
  const id = `${vaga.turmaId}_${vaga.data}`
  return aceito({
    desfazer: async () => {
      const agora = aulasDoAluno.peek().find((a) => a.id === id && a.origem === 'reposicao')
      return agora ? desistirDaAula(agora) : recusado('nada-a-fazer', 'Esta reposição saiu da lista.')
    },
  })
}

export async function desistirDaAula(aula: MinhaAula): Promise<Resultado<object>> {
  const d = dadosDoAluno.peek()
  if (!d) return recusado('nada-a-fazer', 'Os dados ainda não carregaram.')
  const r = desistirDaReposicao(aula, d, momento.peek())
  if (!r.ok) return r
  return executar((repo) => repo.desistir(aula, r.valor.creditoId, agoraDoApp().toISOString()))
}
