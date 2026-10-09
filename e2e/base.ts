import { expect, test as base } from '@playwright/test'

export { expect }

// Endereços do Firebase de verdade (e do Google em geral). Nenhum teste fala com eles: o
// projeto real não é lido nem gravado daqui. Quem precisa de Firebase usa os emuladores locais.
const DE_VERDADE = /^https?:\/\/([^/]+\.)?(googleapis\.com|firebaseapp\.com|firebaseio\.com|firebasestorage\.app|gstatic\.com|google\.com)(:\d+)?\//

/** `test` com uma trava ligada em todos os testes: pedido para o Firebase real é cortado e reprova. */
export const test = base.extend<{ semFirebaseDeVerdade: void }>({
  semFirebaseDeVerdade: [
    async ({ context }, use) => {
      const tentativas: string[] = []
      await context.route(DE_VERDADE, (rota) => {
        tentativas.push(rota.request().url())
        return rota.abort()
      })
      await use()
      expect(tentativas, 'o teste tentou falar com o Firebase de verdade').toEqual([])
    },
    { auto: true },
  ],
})
