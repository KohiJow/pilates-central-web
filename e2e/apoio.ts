import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

/** Sexta-feira, 9 de outubro de 2026, 10h em Campinas: um dia com aulas antes e depois. */
export const AGORA_PADRAO = '2026-10-09T10:00'

export async function abrirApp(page: Page, agora = AGORA_PADRAO, extra = ''): Promise<void> {
  await page.goto(`./?agora=${agora}${extra}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

export async function entrarComoDona(page: Page, agora = AGORA_PADRAO): Promise<void> {
  await abrirApp(page, agora)
  await page.getByRole('button', { name: 'Explorar como dona' }).click()
  await expect(page.getByRole('heading', { name: /Helena/ })).toBeVisible()
}

export async function entrarComoProfessor(page: Page, nome = 'Camila Nunes', agora = AGORA_PADRAO): Promise<void> {
  await abrirApp(page, agora)
  await page.getByRole('button', { name: 'Explorar como professor' }).click()
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(nome) }).click()
  await expect(page.getByRole('heading', { name: new RegExp(nome.split(' ')[0] ?? nome) })).toBeVisible()
}

export function aba(page: Page, nome: 'Hoje' | 'Agenda' | 'Mais'): Locator {
  return page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: nome })
}

export async function irParaAba(page: Page, nome: 'Hoje' | 'Agenda' | 'Mais'): Promise<void> {
  await aba(page, nome).click()
  await expect(aba(page, nome)).toHaveAttribute('aria-current', 'page')
  await esperarTransicao(page)
  await esperarParado(page, '.tela-quadro')
}

/** Durante uma View Transition o navegador não entrega toques à página: espera ela acabar. */
export async function esperarTransicao(page: Page): Promise<void> {
  await expect(page.locator('html[data-transicao]')).toHaveCount(0)
}

export function folha(page: Page): Locator {
  return page.getByRole('dialog')
}

/** Espera a folha terminar de subir: sem animação rodando e de volta à posição zero. */
export async function esperarFolhaParada(page: Page): Promise<void> {
  await expect(folha(page)).toBeVisible()
  await esperarParado(page, '.folha')
}

/** Espera um elemento parar: nenhuma animação rodando e transform de volta a zero. */
export async function esperarParado(page: Page, seletor: string): Promise<void> {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel)
    if (!el || el.getAnimations().some((a) => a.playState === 'running')) return false
    const t = getComputedStyle(el).transform
    if (t === 'none') return true
    const m = new DOMMatrixReadOnly(t)
    return Math.abs(m.m41) < 0.5 && Math.abs(m.m42) < 0.5
  }, seletor)
}

/**
 * Arrasta com o "dedo" (eventos de ponteiro do mouse, que o app trata igual ao toque).
 * Um passo a cada ~16 ms, como um dedo de verdade a 60 Hz: sem isso o movimento sai
 * instantâneo e o app (com razão) entende como arremesso.
 */
export async function arrastar(page: Page, de: { x: number; y: number }, ate: { x: number; y: number }, passos = 12) {
  await page.mouse.move(de.x, de.y)
  await page.mouse.down()
  for (let i = 1; i <= passos; i++) {
    await page.mouse.move(de.x + ((ate.x - de.x) * i) / passos, de.y + ((ate.y - de.y) * i) / passos)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
}
