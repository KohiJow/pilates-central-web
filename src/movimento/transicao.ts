import { movimentoReduzido, suportaTransicaoDeVista } from './preferencias'

export type Direcao = 'frente' | 'tras' | 'nenhuma'

type ComTransicao = Document & {
  startViewTransition?: (atualizar: () => Promise<void> | void) => { finished: Promise<void> }
}

/** Espera o Preact aplicar a mudança no DOM (ele renderiza em microtarefa). */
export const aguardarRender = () => new Promise<void>((r) => setTimeout(r, 0))

/**
 * Troca de tela com View Transitions quando o navegador tem (melhoria progressiva).
 * Sem suporte, a troca é imediata e o CSS anima a entrada da tela nova (.tela-entrando).
 */
export async function trocarComTransicao(atualizar: () => void, direcao: Direcao): Promise<void> {
  const raiz = document.documentElement
  raiz.dataset.direcao = direcao
  const doc = document as ComTransicao
  if (!suportaTransicaoDeVista || movimentoReduzido.peek() || !doc.startViewTransition) {
    atualizar()
    return
  }
  const transicao = doc.startViewTransition(async () => {
    atualizar()
    await aguardarRender()
  })
  await transicao.finished.catch(() => undefined)
}
