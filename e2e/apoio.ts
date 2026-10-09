import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

/** Sexta-feira, 9 de outubro de 2026, 10h em Campinas: um dia com aulas antes e depois. */
export const AGORA_PADRAO = '2026-10-09T10:00'

/**
 * Abre a demonstração com o relógio fixo. `demo` escolhe a porta da demonstração: vale com ou sem
 * projeto Firebase configurado no build (com projeto, a tela inicial seria a das duas portas).
 */
export async function abrirApp(page: Page, agora = AGORA_PADRAO, extra = ''): Promise<void> {
  await page.goto(`./?demo&agora=${agora}${extra}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

export async function entrarComoAdministracao(page: Page, agora = AGORA_PADRAO): Promise<void> {
  await abrirApp(page, agora)
  await page.getByRole('button', { name: 'Explorar como administração' }).click()
  await expect(page.getByRole('heading', { name: /Helena/ })).toBeVisible()
}

export async function entrarComoProfessor(page: Page, nome = 'Camila Nunes', agora = AGORA_PADRAO): Promise<void> {
  await abrirApp(page, agora)
  await page.getByRole('button', { name: 'Explorar como professor' }).click()
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(nome) }).click()
  await expect(page.getByRole('heading', { name: new RegExp(nome.split(' ')[0] ?? nome) })).toBeVisible()
}

export type NomeDaAba = 'Hoje' | 'Agenda' | 'Alunos' | 'Financeiro' | 'Mais'

export function aba(page: Page, nome: NomeDaAba): Locator {
  return page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: nome })
}

export async function irParaAba(page: Page, nome: NomeDaAba): Promise<void> {
  await aba(page, nome).click()
  await expect(aba(page, nome)).toHaveAttribute('aria-current', 'page')
  await esperarTransicao(page)
  await esperarParado(page, '.tela-quadro')
}

/** Durante uma View Transition o navegador não entrega toques à página: espera ela acabar. */
export async function esperarTransicao(page: Page): Promise<void> {
  await expect(page.locator('html[data-transicao]')).toHaveCount(0)
}

/** Troca de seção dentro da aba Alunos (Alunos, Turmas, Reposições). */
export async function irParaSecao(page: Page, nome: 'Alunos' | 'Turmas' | 'Reposições'): Promise<void> {
  await page.getByRole('navigation', { name: 'Seções' }).getByRole('button', { name: nome }).click()
  await expect(page.getByRole('navigation', { name: 'Seções' }).getByRole('button', { name: nome })).toHaveAttribute('aria-current', 'page')
  await esperarParado(page, '.tela-quadro')
}

/** Abre uma tela pelo endereço (como um link salvo) e espera ela parar de entrar. */
export async function irPara(page: Page, hash: string): Promise<void> {
  await page.evaluate((h) => {
    location.hash = h
  }, hash)
  await esperarParado(page, '.tela-quadro')
}

/** O aviso flutuante com o texto pedido. */
export function aviso(page: Page, texto: string | RegExp): Locator {
  return page.getByRole('status').filter({ hasText: texto })
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
