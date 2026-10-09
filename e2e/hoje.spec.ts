import { expect, test } from './base'
import type { Page } from '@playwright/test'
import { abrirApp, entrarComoAdministracao, esperarFolhaParada, esperarParado, folha, irParaAba } from './apoio'

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
    await page.getByRole('button', { name: 'Ver quem vem', exact: true }).click()
    await esperarFolhaParada(page)
    const linha = folha(page).locator('[data-aluno]').nth(1)
    await linha.getByRole('button', { name: 'Avisou' }).click()
    await expect(linha.getByRole('button', { name: 'Avisou' })).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')
    await expect(folha(page)).toHaveCount(0)
    await expect.poll(() => numero(page, /avisaram/)).toBe(avisos + 1)
    await expect.poll(() => numero(page, /alunos esperados/)).toBe(esperados - 1)
  })

  test('para olhar: reposições perto de vencer e alunos sumidos levam para onde se resolve', async ({ page }) => {
    await entrarComoAdministracao(page)
    const vencer = page.getByRole('button', { name: /5 reposições vencem em 7 dias/ })
    await expect(vencer).toBeVisible()
    const sumida = page.getByRole('button', { name: /Ana Almeida faltou 4 vezes seguidas/ })
    await expect(sumida).toBeVisible()
    await vencer.click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reposições')
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Alunos' })).toHaveAttribute('aria-current', 'page')

    // a aluna sumida abre direto na ficha, com o WhatsApp à mão, e o voltar devolve ao Hoje
    await irParaAba(page, 'Hoje')
    await sumida.click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ana Almeida')
    await expect(page.getByRole('link', { name: 'WhatsApp' })).toBeVisible()
    await esperarParado(page, '.tela-quadro')
    await page.locator('.voltar').click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Bom dia/)
  })

  test('aula que acabou sem a chamada completa aparece no hoje e se resolve dali', async ({ page }) => {
    await entrarComoAdministracao(page)
    await expect(page.getByRole('heading', { name: 'Chamada por fazer' })).toHaveCount(0)
    // apaga uma presença da aula das 7h (já terminou): ela passa a ter alguém sem marcação
    await irParaAba(page, 'Agenda')
    await page.locator('.cartao-aula').first().click()
    await esperarFolhaParada(page)
    await folha(page).locator('[data-aluno]').first().getByRole('button', { name: 'Presente' }).click()
    await expect(page.getByRole('status').filter({ hasText: /apagada/ })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(folha(page)).toHaveCount(0)
    await irParaAba(page, 'Hoje')
    const porFazer = page.getByRole('button', { name: /Aula das 7h, Centro.*1 aluno está sem marcação/ })
    await expect(porFazer).toBeVisible()
    await porFazer.click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Todos presentes (1)' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Chamada por fazer' })).toHaveCount(0)
  })

  test('domingo: estado vazio leva para a agenda', async ({ page }) => {
    await abrirApp(page, '2026-10-11T10:00')
    await page.getByRole('button', { name: 'Explorar como administração' }).click()
    await expect(page.getByText('Sem aulas hoje')).toBeVisible()
    // segunda é feriado (aulas canceladas): a próxima é terça cedo
    await expect(page.getByText('A próxima é terça, 7h.', { exact: false })).toBeVisible()
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
