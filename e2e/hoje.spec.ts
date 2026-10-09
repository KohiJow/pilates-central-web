import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { abrirApp, entrarComoAdministracao, esperarFolhaParada, folha } from './apoio'

async function numero(page: Page, rotulo: RegExp): Promise<number> {
  const texto = await page.locator('.numero-card', { hasText: rotulo }).locator('.so-leitor').textContent()
  return Number(texto)
}

test.describe('hoje', () => {
  test('resumo do dia: próxima aula, números e listas', async ({ page }) => {
    await entrarComoAdministracao(page)
    await expect(page.getByText('Próxima aula')).toBeVisible()
    await expect(page.locator('.destaque .titulo')).toHaveText('18h, Centro')
    expect(await numero(page, /alunos esperados/)).toBeGreaterThan(0)
    await expect(page.getByRole('heading', { name: 'Reposições de hoje' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Avisaram que não vêm' })).toBeVisible()
  })

  test('avisar falta pela chamada atualiza os números do dia', async ({ page }) => {
    await entrarComoAdministracao(page)
    const esperados = await numero(page, /alunos esperados/)
    const avisos = await numero(page, /avisaram/)
    await page.getByRole('button', { name: 'Abrir chamada', exact: true }).click()
    await esperarFolhaParada(page)
    const linha = folha(page).locator('[data-aluno]').nth(1)
    await linha.getByRole('button', { name: 'Avisou' }).click()
    await expect(linha.getByRole('button', { name: 'Avisou' })).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')
    await expect(folha(page)).toHaveCount(0)
    await expect.poll(() => numero(page, /avisaram/)).toBe(avisos + 1)
    await expect.poll(() => numero(page, /alunos esperados/)).toBe(esperados - 1)
  })

  test('domingo: estado vazio leva para a agenda', async ({ page }) => {
    await abrirApp(page, '2026-10-11T10:00')
    await page.getByRole('button', { name: 'Explorar como administração' }).click()
    await expect(page.getByText('Sem aulas hoje')).toBeVisible()
    await page.getByRole('button', { name: 'Ver a agenda' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Domingo, 11 de outubro')
  })

  test('à noite, depois da última aula', async ({ page }) => {
    await abrirApp(page, '2026-10-09T21:30')
    await page.getByRole('button', { name: 'Explorar como administração' }).click()
    await expect(page.getByText('As aulas de hoje acabaram.')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Boa noite/ })).toBeVisible()
  })

  test('esqueleto enquanto os dados chegam', async ({ page }) => {
    await abrirApp(page, '2026-10-09T10:00', '&atraso=1500')
    await page.getByRole('button', { name: 'Explorar como administração' }).click()
    await page.reload()
    await expect(page.locator('.esqueleto').first()).toBeVisible()
    await expect(page.getByText('Próxima aula')).toBeVisible({ timeout: 6000 })
    await expect(page.locator('.esqueleto')).toHaveCount(0)
  })
})
