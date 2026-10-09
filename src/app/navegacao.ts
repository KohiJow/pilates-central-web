import { computed, signal } from '@preact/signals'
import type { ItemDeAba } from '../componentes/BarraAbas'
import { ehAdministracao } from '../dominio/permissoes'
import type { Papel } from '../dominio/tipos'

export type Aba = 'hoje' | 'agenda' | 'alunos' | 'financeiro' | 'mais'

const TODAS: Record<Aba, ItemDeAba<Aba>> = {
  hoje: { id: 'hoje', rotulo: 'Hoje', icone: 'hoje' },
  agenda: { id: 'agenda', rotulo: 'Agenda', icone: 'agenda' },
  alunos: { id: 'alunos', rotulo: 'Alunos', icone: 'alunos' },
  financeiro: { id: 'financeiro', rotulo: 'Financeiro', icone: 'financeiro' },
  mais: { id: 'mais', rotulo: 'Mais', icone: 'mais' },
}

// O professor não tem a aba Financeiro (nem a vê escondida: ela não existe para ele).
const DA_ADMINISTRACAO: Aba[] = ['hoje', 'agenda', 'alunos', 'financeiro', 'mais']
const DO_PROFESSOR: Aba[] = ['hoje', 'agenda', 'alunos', 'mais']

function ordemDoPapel(papel: Papel | undefined): Aba[] {
  return ehAdministracao(papel) ? DA_ADMINISTRACAO : DO_PROFESSOR
}

export function abasDoPapel(papel: Papel | undefined): ItemDeAba<Aba>[] {
  return ordemDoPapel(papel).map((id) => TODAS[id])
}

/** Onde o app está: a aba e o caminho dentro dela (`#/alunos/a-10/editar`). */
export interface Rota {
  aba: Aba
  caminho: string[]
}

function ehAba(texto: string | undefined): texto is Aba {
  return texto !== undefined && texto in TODAS
}

export function rotaDoEndereco(hash: string = location.hash): Rota {
  const partes = hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p)
      } catch {
        return p
      }
    })
  const [primeira, ...resto] = partes
  return ehAba(primeira) ? { aba: primeira, caminho: resto } : { aba: 'hoje', caminho: [] }
}

function enderecoDe(r: Rota): string {
  const partes = [r.aba, ...r.caminho].map(encodeURIComponent).join('/')
  return `${location.pathname}${location.search}#/${partes}`
}

const chaveDe = (r: Rota) => [r.aba, ...r.caminho].join('/')

export const rota = signal<Rota>(rotaDoEndereco())
export const aba = computed(() => rota.value.aba)
/** Chave da tela atual: muda a cada troca de tela (a tela nova entra animada). */
export const chaveDaTela = computed(() => chaveDe(rota.value))

/** Rolagem de cada tela, para a lista voltar onde estava depois de abrir uma ficha. */
const rolagens = new Map<string, number>()

function mudar(nova: Rota, direcao: 'frente' | 'tras', rolagem = 0): void {
  document.documentElement.dataset.direcao = direcao
  rota.value = nova
  // depois que a tela nova foi montada
  requestAnimationFrame(() => window.scrollTo(0, rolagem))
}

/**
 * Troca de aba sem empilhar histórico (o "voltar" do celular fecha folhas e telas abertas,
 * não fica passeando pelas abas). A tela nova entra do lado da aba escolhida. `caminho` leva
 * direto a uma seção da aba (do Hoje para Alunos > Reposições, por exemplo).
 */
export function irPara(nova: Aba, papel: Papel | undefined, caminho: string[] = []): void {
  const atual = rota.peek()
  const r = { aba: nova, caminho }
  if (chaveDe(r) === chaveDe(atual)) return
  const ordem = ordemDoPapel(papel)
  const direcao = ordem.indexOf(nova) >= ordem.indexOf(atual.aba) ? 'frente' : 'tras'
  history.replaceState({ ...(history.state as object | null), tela: 0 }, '', enderecoDe(r))
  mudar(r, direcao)
}

/** Abre uma tela dentro da aba atual (ficha, formulário): empilha, e "voltar" volta. */
export function abrir(...caminho: string[]): void {
  abrirEm(rota.peek().aba, caminho)
}

/** Abre uma tela de outra aba (da folha da aula para a ficha do aluno, por exemplo). */
export function abrirEm(aba: Aba, caminho: string[]): void {
  const atual = rota.peek()
  rolagens.set(chaveDe(atual), window.scrollY)
  const r = { aba, caminho }
  const estado = history.state as { tela?: number; folha?: number } | null
  const profundidade = Number(estado?.tela ?? 0) + 1
  // aberta de dentro de uma folha: a tela nova toma o lugar da entrada da folha no histórico,
  // senão o "voltar" passaria por uma folha que já fechou
  if (estado?.folha !== undefined) history.replaceState({ tela: profundidade }, '', enderecoDe(r))
  else history.pushState({ tela: profundidade }, '', enderecoDe(r))
  mudar(r, 'frente')
}

/** Troca a tela atual por outra sem empilhar (depois de cadastrar, a ficha toma o lugar do formulário). */
export function substituir(...caminho: string[]): void {
  const atual = rota.peek()
  const r = { aba: atual.aba, caminho }
  history.replaceState(history.state, '', enderecoDe(r))
  mudar(r, 'frente')
}

/**
 * Troca de seção no mesmo nível (Alunos, Turmas, Reposições): substitui sem empilhar.
 * `ordem` diz de que lado a seção nova entra.
 */
export function trocarSecao(caminho: string[], ordem: readonly string[]): void {
  const atual = rota.peek()
  const de = ordem.indexOf(atual.caminho[0] ?? '')
  const para = ordem.indexOf(caminho[0] ?? '')
  const r = { aba: atual.aba, caminho }
  if (chaveDe(r) === chaveDe(atual)) return
  history.replaceState(history.state, '', enderecoDe(r))
  mudar(r, para >= de ? 'frente' : 'tras')
}

/**
 * Volta uma tela. Se a tela atual foi aberta pelo app, usa o histórico (igual ao "voltar" do
 * celular); se a pessoa chegou direto pelo endereço, sobe para a tela de cima.
 */
export function voltar(): void {
  const profundidade = Number((history.state as { tela?: number } | null)?.tela ?? 0)
  if (profundidade > 0) {
    history.back()
    return
  }
  const atual = rota.peek()
  const r = { aba: atual.aba, caminho: atual.caminho.slice(0, -1) }
  history.replaceState({ ...(history.state as object | null), tela: 0 }, '', enderecoDe(r))
  mudar(r, 'tras', rolagens.get(chaveDe(r)) ?? 0)
}

/**
 * Ao sair (ou trocar de perfil na demonstração), quem entrar depois começa no Hoje, e não na tela
 * em que a pessoa anterior estava (a aba Mais, de onde se sai).
 */
export function voltarAoInicio(): void {
  rolagens.clear()
  const r: Rota = { aba: 'hoje', caminho: [] }
  history.replaceState({ tela: 0 }, '', enderecoDe(r))
  rota.value = r
}

/** "voltar" do celular (ou history.back de uma tela aberta pelo app). */
export function acompanharHistorico(): void {
  window.addEventListener('popstate', () => {
    const nova = rotaDoEndereco()
    // folha fechando pelo "voltar": o endereço não muda e a tela fica onde está
    if (chaveDe(nova) === chaveDe(rota.peek())) return
    mudar(nova, 'tras', rolagens.get(chaveDe(nova)) ?? 0)
  })
}
