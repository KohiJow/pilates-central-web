import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { abrirApp, entrarComoDona, esperarFolhaParada, irParaAba } from './apoio'

// Rótulos em caixa alta (micro-rótulos, pílulas, abas, dias da faixa) são etiquetas, não texto
// corrido: podem ficar abaixo de 16px. Todo o resto tem que ter 16px ou mais.
const ETIQUETAS = '.micro, .pilula, .aba, .dia-semana, .selo-demo, .avatar, .marca-dagua, .so-leitor'

async function auditar(page: Page, onde: string) {
  const problemas = await page.evaluate((etiquetas) => {
    const visivel = (el: Element) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
    }
    const saida: string[] = []
    const raiz = document.querySelector('.folha') ?? document.body
    for (const el of raiz.querySelectorAll('button, a[href], input, [role="radio"]')) {
      if (!visivel(el) || el.closest('[inert]')) continue
      const r = el.getBoundingClientRect()
      if (r.height < 47.5 || r.width < 47.5) {
        saida.push(`alvo pequeno ${Math.round(r.width)}x${Math.round(r.height)}: ${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 30)}`)
      }
    }
    const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
    for (let n = andar.nextNode(); n; n = andar.nextNode()) {
      const texto = n.textContent?.trim()
      const pai = n.parentElement
      if (!texto || !pai || !visivel(pai) || pai.closest(etiquetas) || pai.closest('svg')) continue
      const tamanho = parseFloat(getComputedStyle(pai).fontSize)
      if (tamanho < 16) saida.push(`texto ${tamanho}px: ${texto.slice(0, 30)}`)
    }
    return saida
  }, ETIQUETAS)
  expect(problemas, onde).toEqual([])
}

test.describe('acessibilidade para uso com uma mão', () => {
  test('alvos de toque de 48px e texto de 16px em todas as telas', async ({ page }) => {
    await abrirApp(page)
    await auditar(page, 'entrar')
    await entrarComoDona(page)
    await auditar(page, 'hoje')
    await irParaAba(page, 'Agenda')
    await auditar(page, 'agenda')
    await page.locator('.cartao-aula').nth(2).click()
    await esperarFolhaParada(page)
    await auditar(page, 'chamada')
    await page.keyboard.press('Escape')
    await irParaAba(page, 'Mais')
    await auditar(page, 'mais')
  })

  test('com a folha aberta, o resto do app fica inerte e o foco começa na folha', async ({ page }) => {
    await entrarComoDona(page)
    await page.getByRole('button', { name: 'Abrir chamada', exact: true }).click()
    await esperarFolhaParada(page)
    await expect(page.locator('#app')).toHaveAttribute('inert', '')
    const foco = await page.evaluate(() => document.activeElement?.closest('.folha') !== null)
    expect(foco).toBe(true)
    await page.keyboard.press('Escape')
    await expect(page.locator('#app')).not.toHaveAttribute('inert', '')
  })

  test('com "reduzir movimento", nada desliza', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await entrarComoDona(page)
    await page.getByRole('button', { name: 'Abrir chamada', exact: true }).click()
    // com 1 ms de duração, uma animação pode aparecer como "rodando" até o próximo quadro;
    // o que importa é que nenhuma dure de verdade
    const longas = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => Number(a.effect?.getComputedTiming().duration ?? 0) > 1)
        .map((a) => (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? 'waapi'),
    )
    expect(longas).toEqual([])
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
