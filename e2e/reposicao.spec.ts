import { expect, test } from './base'
import type { Page } from '@playwright/test'
import { aviso, entrarComoAdministracao, esperarFolhaParada, esperarParado, folha, irPara, irParaAba, irParaSecao } from './apoio'

const titulo = (page: Page) => page.getByRole('heading', { level: 1 })
const numero = (page: Page, rotulo: string) => page.locator('.numero-card', { hasText: rotulo }).locator('.so-leitor')
const cartao = (page: Page, hora: string) => page.locator('.cartao-aula', { has: page.locator('strong', { hasText: new RegExp(`^${hora}$`) }) })

async function abrirCentral(page: Page) {
  await entrarComoAdministracao(page)
  await irParaAba(page, 'Alunos')
  await irParaSecao(page, 'Reposições')
  await expect(titulo(page)).toHaveText('Reposições')
}

test.describe('central de reposição', () => {
  test('quem tem crédito, o que vence primeiro no topo, marcadas e vencidas', async ({ page }) => {
    await abrirCentral(page)
    await expect(numero(page, 'para encaixar')).toHaveText('19')
    await expect(numero(page, 'vencem em 7 dias')).toHaveText('5')
    const primeiro = page.locator('[data-credito]').first()
    await expect(primeiro).toContainText('Sílvia Toledo')
    await expect(primeiro).toContainText('vence hoje')
    await expect(page.getByRole('heading', { name: 'Reposições marcadas' })).toBeVisible()
    // a reposição das 7h de hoje já aconteceu: fica como feita, sem "Tirar"
    await expect(page.locator('.lista-item', { hasText: 'Beatriz Barbosa' }).getByText('feita')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Venceram sem uso/ })).toBeVisible()
    await page.getByRole('radio', { name: 'Jardim' }).click()
    await expect(numero(page, 'para encaixar')).not.toHaveText('19')
  })

  test('encaixar a partir do crédito: só aulas com vaga, confirmar e desfazer', async ({ page }) => {
    await abrirCentral(page)
    await page.locator('[data-credito]', { hasText: 'Sílvia Toledo' }).getByRole('button', { name: 'Encaixar' }).click()
    await esperarFolhaParada(page)
    await expect(folha(page).getByRole('heading', { name: 'Hoje, 9/10' })).toBeVisible()
    // toda opção mostrada tem vaga
    const vagas = folha(page).getByRole('radio').getByRole('img')
    const total = await vagas.count()
    expect(total).toBeGreaterThan(0)
    for (let i = 0; i < total; i++) await expect(vagas.nth(i)).not.toHaveAttribute('aria-label', /lotada/)
    await expect(folha(page).getByRole('button', { name: /^Encaixar / })).toHaveCount(0)
    await folha(page).getByRole('radio').first().click()
    await expect(folha(page).getByRole('radio').first()).toHaveAttribute('aria-checked', 'true')
    await folha(page).getByRole('button', { name: 'Encaixar hoje, às 18h' }).click()
    await expect(aviso(page, 'Reposição de Sílvia marcada: hoje, 9/10, às 18h.')).toBeVisible()
    await expect(numero(page, 'para encaixar')).toHaveText('18')
    await expect(page.locator('.lista-item', { hasText: 'Sílvia Toledo' }).getByRole('button', { name: 'Tirar a reposição de Sílvia Toledo' })).toBeVisible()
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(numero(page, 'para encaixar')).toHaveText('19')
  })
})

test.describe('reposição pela chamada', () => {
  test('avisou no prazo, ganhou crédito, encaixou em outro horário e aparece lá como reposição', async ({ page }) => {
    await entrarComoAdministracao(page)
    await irParaAba(page, 'Agenda')
    await cartao(page, '18h').click()
    await esperarFolhaParada(page)
    const carla = folha(page).locator('[data-aluno="a-12"]')
    await carla.getByRole('button', { name: 'Avisou' }).click()
    await expect(aviso(page, 'Carla avisou. Tem reposição até 8/11.')).toBeVisible()
    await carla.getByRole('button', { name: 'Encaixar em outro horário' }).click()
    await expect(folha(page).getByText('Reposição de Carla')).toBeVisible()
    await folha(page).getByRole('radio').first().click()
    await folha(page).getByRole('button', { name: 'Encaixar hoje, às 19h' }).click()
    await expect(aviso(page, 'Reposição de Carla marcada: hoje, 9/10, às 19h.')).toBeVisible()
    await expect(folha(page).locator('[data-aluno="a-12"]')).toContainText('Reposição marcada para 9/10.')
    await page.keyboard.press('Escape')
    await expect(folha(page)).toHaveCount(0)
    await cartao(page, '19h').click()
    await esperarFolhaParada(page)
    await expect(folha(page).locator('[data-aluno="a-12"]').getByText('reposição', { exact: true })).toBeVisible()
  })

  test('limite de reposições do mês: aviso sem crédito e cortesia da administração', async ({ page }) => {
    await entrarComoAdministracao(page)
    await irPara(page, '#/mais/regras')
    await expect(titulo(page)).toHaveText('Regras de reposição')
    await page.getByRole('button', { name: 'Mais: reposições por mês, por aluno' }).click()
    await expect(page.getByText('Até 1 reposição por mês.', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Salvar regras' }).click()
    await expect(aviso(page, /Regras salvas/)).toBeVisible()

    await irParaAba(page, 'Agenda')
    await cartao(page, '18h').click()
    await esperarFolhaParada(page)
    // Elisa já avisou uma falta de outubro (dia 14) e ganhou crédito
    const elisa = folha(page).locator('[data-aluno="a-14"]')
    await elisa.getByRole('button', { name: 'Avisou' }).click()
    await expect(aviso(page, 'Elisa avisou, mas já usou as reposições do mês.')).toBeVisible()
    await expect(elisa.getByText('sem reposição')).toBeVisible()
    await elisa.getByRole('button', { name: 'Dar reposição mesmo assim' }).click()
    await expect(aviso(page, 'Elisa ganhou reposição até 8/11.')).toBeVisible()
    await expect(elisa.getByText('sem reposição')).toHaveCount(0)
    await esperarParado(page, '.folha')
  })
})
