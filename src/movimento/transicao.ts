import { movimentoReduzido, transicaoDeVista } from './preferencias'

type ComTransicao = Document & {
  startViewTransition?: (atualizar: () => Promise<void> | void) => { finished: Promise<void> }
}

/** Espera o Preact aplicar a mudança no DOM (ele renderiza em microtarefa). */
export const aguardarRender = () => new Promise<void>((r) => setTimeout(r, 0))

/**
 * Aplica uma mudança da página inteira com View Transition (melhoria progressiva): a tela velha
 * esmaece para a nova. Sem suporte (ou com "reduzir movimento"), a mudança é imediata.
 * Usada na troca de tema, em que todas as cores mudam de uma vez e CSS sozinho não faria a
 * transição só com opacity. Na troca de abas a alternativa em CSS mediu melhor (ver README).
 */
export async function trocarComTransicao(atualizar: () => void): Promise<void> {
  const raiz = document.documentElement
  const doc = document as ComTransicao
  if (!transicaoDeVista.ligada || movimentoReduzido.peek() || !doc.startViewTransition) {
    atualizar()
    return
  }
  // durante a transição o navegador não entrega toques à página; o atributo deixa isso visível
  // para os testes (e para depurar)
  raiz.dataset.transicao = 'sim'
  const transicao = doc.startViewTransition(async () => {
    atualizar()
    await aguardarRender()
  })
  await transicao.finished.catch(() => undefined)
  delete raiz.dataset.transicao
}
