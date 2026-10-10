// Passos comuns dos testes que abrem o app com projeto configurado (emuladores ou respostas
// simuladas): abrir o login, entrar com uma conta e deixar o WebKit falar com o endereço local.
import type { BrowserContext, Page } from '@playwright/test'
import { expect } from '../base'
import { SENHA } from './contas'

const ehPaginaDoSite = (url: URL) => url.pathname.startsWith('/pilates-central-web/') && url.pathname.endsWith('/')

/**
 * A política de segurança do site publicado só libera o Firebase de verdade, e o emulador é
 * http://127.0.0.1. No Chromium, bypassCSP resolve. No WebKit ele não vale para a <meta> da
 * política em todas as páginas, então ali a <meta> sai do HTML servido (no Chromium isso não
 * serve: a página entregue pelo teste perde o endereço local e o navegador bloqueia o emulador).
 */
export async function liberarEnderecoLocal(context: BrowserContext, browserName: string): Promise<void> {
  if (browserName !== 'webkit') return
  await context.route(ehPaginaDoSite, async (rota) => {
    const resposta = await rota.fetch()
    const html = (await resposta.text()).replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '')
    await rota.fulfill({ response: resposta, body: html })
  })
}

export async function abrirLogin(page: Page, projeto = '1'): Promise<void> {
  await page.goto(`./?emulador=${projeto}`)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Que bom ver você.' })).toBeVisible()
}

export async function preencherLogin(page: Page, email: string, senha = SENHA): Promise<void> {
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(senha)
}

export async function entrarComo(page: Page, email: string, senha = SENHA): Promise<void> {
  await abrirLogin(page)
  await preencherLogin(page, email, senha)
  await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click()
}
