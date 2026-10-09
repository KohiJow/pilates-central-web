import type { Competencia, Id } from '../../dominio/tipos'
import type { Gravacao, Intervalo, RepositorioDeDemonstracao } from '../repositorio'
import { gerarSemente, VERSAO_DO_BANCO } from './semente'
import type { BancoDeDemonstracao } from './semente'

export const CHAVE_DO_BANCO = 'pc-demonstracao'

/** O pedaço do localStorage que o adaptador usa (dá para trocar por um falso nos testes). */
export interface Armazenamento {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
  removeItem(chave: string): void
}

export interface OpcoesDaDemonstracao {
  armazenamento: Armazenamento | null
  agora: () => Date
  /** atraso artificial em ms, para ver o esqueleto de carregamento como se fosse a rede */
  atrasoMs?: number
}

const copia = <T>(valor: T): T => structuredClone(valor)

function ehBancoValido(dado: unknown): dado is BancoDeDemonstracao {
  if (typeof dado !== 'object' || dado === null) return false
  const banco = dado as Partial<BancoDeDemonstracao>
  return (
    banco.versao === VERSAO_DO_BANCO &&
    typeof banco.base === 'object' &&
    typeof banco.registros === 'object' &&
    typeof banco.creditos === 'object' &&
    typeof banco.financeiro === 'object' &&
    typeof banco.pagamentos === 'object'
  )
}

/** Troca na lista os itens com o mesmo id e acrescenta os novos, sem mudar a ordem dos outros. */
function mesclar<T>(lista: readonly T[], novos: readonly T[] | undefined, id: (item: T) => Id): T[] {
  if (!novos?.length) return [...lista]
  const porId = new Map(novos.map((n) => [id(n), n]))
  const saida = lista.map((item) => {
    const novo = porId.get(id(item))
    if (!novo) return item
    porId.delete(id(item))
    return copia(novo)
  })
  for (const novo of porId.values()) saida.push(copia(novo))
  return saida
}

/**
 * Adaptador de demonstração: dados fictícios guardados no próprio aparelho (localStorage).
 * Cada gravação regrava o banco inteiro de uma vez, o que dá a mesma atomicidade do lote do Firebase.
 */
export function criarRepositorioDeDemonstracao(opcoes: OpcoesDaDemonstracao): RepositorioDeDemonstracao {
  const { armazenamento, agora, atrasoMs = 0 } = opcoes
  let banco: BancoDeDemonstracao | undefined
  let persistente = armazenamento !== null

  const esperar = () => (atrasoMs > 0 ? new Promise<void>((r) => setTimeout(r, atrasoMs)) : Promise.resolve())

  function ler(): BancoDeDemonstracao | undefined {
    if (!armazenamento) return undefined
    try {
      const texto = armazenamento.getItem(CHAVE_DO_BANCO)
      if (!texto) return undefined
      const dado: unknown = JSON.parse(texto)
      return ehBancoValido(dado) ? dado : undefined
    } catch {
      return undefined
    }
  }

  function gravar(b: BancoDeDemonstracao): void {
    if (!armazenamento) return
    try {
      armazenamento.setItem(CHAVE_DO_BANCO, JSON.stringify(b))
      persistente = true
    } catch {
      // aba anônima ou armazenamento cheio: a demonstração segue só na memória
      persistente = false
    }
  }

  function obter(): BancoDeDemonstracao {
    if (!banco) {
      banco = ler()
      if (!banco) {
        banco = gerarSemente(agora())
        gravar(banco)
      }
    }
    return banco
  }

  return {
    modo: 'demonstracao',
    get persistente() {
      return persistente
    },

    async carregarBase() {
      await esperar()
      return copia(obter().base)
    },

    async registros({ de, ate }: Intervalo) {
      await esperar()
      return copia(Object.values(obter().registros).filter((r) => r.data >= de && r.data <= ate))
    },

    async creditos() {
      await esperar()
      return copia(Object.values(obter().creditos))
    },

    async financeiro() {
      await esperar()
      return copia(Object.values(obter().financeiro))
    },

    async pagamentos(competencias: Competencia[]) {
      await esperar()
      const quais = new Set(competencias)
      return copia(Object.values(obter().pagamentos).filter((p) => quais.has(p.competencia)))
    },

    async salvar(g: Gravacao) {
      const atual = obter()
      // monta o próximo estado inteiro antes de trocar: ou tudo entra, ou nada
      const proximo: BancoDeDemonstracao = {
        ...atual,
        base: {
          configuracao: g.configuracao ? copia(g.configuracao) : atual.base.configuracao,
          unidades: mesclar(atual.base.unidades, g.unidades, (u) => u.id),
          equipe: mesclar(atual.base.equipe, g.equipe, (m) => m.id),
          alunos: mesclar(atual.base.alunos, g.alunos, (a) => a.id),
          turmas: mesclar(atual.base.turmas, g.turmas, (t) => t.id),
        },
        registros: { ...atual.registros },
        creditos: { ...atual.creditos },
        financeiro: { ...atual.financeiro },
        pagamentos: { ...atual.pagamentos },
      }
      for (const f of g.financeiro ?? []) proximo.financeiro[f.alunoId] = copia(f)
      for (const r of g.registros ?? []) proximo.registros[r.id] = copia(r)
      for (const id of g.creditosRemovidos ?? []) delete proximo.creditos[id]
      for (const c of g.creditos ?? []) proximo.creditos[c.id] = copia(c)
      for (const id of g.pagamentosRemovidos ?? []) delete proximo.pagamentos[id]
      for (const p of g.pagamentos ?? []) proximo.pagamentos[p.id] = copia(p)
      banco = proximo
      gravar(proximo)
    },

    async recomecar() {
      banco = gerarSemente(agora())
      gravar(banco)
    },
  }
}
