import { readFileSync } from 'node:fs'
import { expect, test } from './base'
import type { Page } from '@playwright/test'
import { aviso, entrarComoAdministracao, esperarFolhaParada, folha, irParaAba } from './apoio'

const titulo = (page: Page) => page.getByRole('heading', { level: 1 })
async function abrirFinanceiro(page: Page) {
  await entrarComoAdministracao(page)
  await irParaAba(page, 'Financeiro')
  await expect(titulo(page)).toHaveText('Outubro de 2026')
  await expect(page.locator('.resumo-mes')).toBeVisible()
}

const reais = (texto: string | null) => Number((texto ?? '').replace(/[^\d,]/g, '').replace(',', '.'))

test.describe('financeiro', () => {
  test('resumo do mês: previsto, recebido, em aberto e ativos, por unidade', async ({ page }) => {
    await abrirFinanceiro(page)
    const resumo = page.locator('.resumo-mes')
    await expect(resumo).toContainText(/de R\$\s10\.660,00 previstos/)
    await expect(resumo.locator('.so-leitor').nth(0)).toHaveText(/^R\$\s5\.590,00$/)
    await expect(resumo.locator('.so-leitor').nth(1)).toHaveText(/^R\$\s5\.070,00$/)
    await expect(resumo.locator('.so-leitor').nth(2)).toHaveText('37')
    await expect(page.getByRole('progressbar', { name: 'Recebido de outubro de 2026' })).toHaveAttribute('aria-valuenow', '52')
    await expect(page.getByRole('heading', { name: 'Em aberto (19)' })).toBeVisible()
    await page.getByRole('radio', { name: 'Jardim' }).click()
    await expect(resumo).toContainText(/de R\$\s3\.080,00 previstos/)
    await expect(resumo.locator('.so-leitor').nth(2)).toHaveText('11')
    // mês anterior
    await page.getByRole('button', { name: 'Mês anterior' }).click()
    await expect(titulo(page)).toHaveText('Setembro de 2026')
    await expect(page.getByRole('button', { name: 'Próximo mês' })).toBeEnabled()
    await page.getByRole('button', { name: 'Próximo mês' }).click()
    await expect(page.getByRole('button', { name: 'Próximo mês' })).toBeDisabled()
  })

  test('em aberto: lembrete educado pelo WhatsApp e lançamento rápido com valor sugerido', async ({ page }) => {
    await abrirFinanceiro(page)
    const bianca = page.locator('.aberto[data-aluno="a-40"]')
    await expect(bianca).toContainText('atrasada')
    const lembrete = bianca.getByRole('link', { name: 'Lembrar Bianca pelo WhatsApp' })
    const href = (await lembrete.getAttribute('href')) ?? ''
    expect(href.startsWith('https://wa.me/5511900000040?text=')).toBe(true)
    const texto = decodeURIComponent(href.split('text=')[1] ?? '')
    expect(texto).toBe(
      'Oi, Bianca! Tudo bem? Aqui é do Pilates Central. Passando para lembrar da mensalidade de outubro (R$ 140,00), que venceu em 5/10. Se já pagou, pode desconsiderar. Obrigado!',
    )

    await page.locator('.aberto[data-aluno="a-37"]').getByRole('button', { name: 'Lançar pagamento de Vera' }).click()
    await esperarFolhaParada(page)
    await expect(folha(page).getByRole('textbox', { name: 'Valor (R$)' })).toHaveValue('280,00')
    // a forma preferida dela já vem marcada
    await expect(folha(page).getByRole('radio', { checked: true })).toHaveCount(1)
    await folha(page).getByRole('radio', { name: 'TotalPass' }).click()
    await folha(page).getByRole('button', { name: /^Lançar R\$\s280,00$/ }).click()
    await expect(aviso(page, /R\$\s280,00 de Vera lançado \(TotalPass\)\./)).toBeVisible()
    await expect(page.locator('.aberto[data-aluno="a-37"]')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Em aberto (18)' })).toBeVisible()
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.getByRole('heading', { name: 'Em aberto (19)' })).toBeVisible()
  })

  test('lançar escolhendo o aluno, com validação; apagar lançamento com desfazer', async ({ page }) => {
    await abrirFinanceiro(page)
    await page.getByRole('button', { name: 'Lançar pagamento', exact: true }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('searchbox', { name: 'Buscar aluno' }).fill('eduardo')
    await folha(page).getByRole('button', { name: /Eduardo Freitas/ }).click()
    await expect(folha(page).getByRole('textbox', { name: 'Valor (R$)' })).toHaveValue('360,00')
    await folha(page).getByRole('textbox', { name: 'Valor (R$)' }).fill('abc')
    await folha(page).getByRole('button', { name: 'Lançar pagamento' }).click()
    await expect(folha(page).getByText('Digite o valor, por exemplo 280 ou 280,50.')).toBeVisible()
    await folha(page).getByRole('textbox', { name: 'Valor (R$)' }).fill('180')
    await folha(page).getByRole('button', { name: /^Lançar R\$\s180,00$/ }).click()
    await expect(aviso(page, /R\$\s180,00 de Eduardo lançado/)).toBeVisible()
    // pagou metade: continua em aberto com o resto
    await expect(page.locator('.aberto[data-aluno="a-32"]')).toContainText(/R\$\s180,00 \(pagou R\$\s180,00\)/)

    const lancamentos = page.locator('section.secao', { has: page.getByRole('heading', { name: 'Lançamentos de outubro' }) })
    await lancamentos.getByRole('button', { name: /Eduardo Freitas.*180,00/ }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Apagar lançamento' }).click()
    await expect(aviso(page, 'Lançamento apagado.')).toBeVisible()
    await expect(page.locator('.aberto[data-aluno="a-32"]')).toContainText(/R\$\s360,00, vence em 10\/10/)
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.locator('.aberto[data-aluno="a-32"]')).toContainText(/\(pagou R\$\s180,00\)/)
  })

  test('gráfico dos últimos seis meses, tocável e com tabela para leitor de tela', async ({ page }) => {
    await abrirFinanceiro(page)
    const colunas = page.locator('.grafico').getByRole('button')
    await expect(colunas).toHaveCount(6)
    await expect(colunas.last()).toHaveAttribute('aria-label', /^outubro de 2026: R\$\s5\.590,00$/)
    await expect(colunas.last()).toHaveAttribute('aria-pressed', 'true')
    await colunas.first().click()
    await expect(page.locator('.grafico-leitura')).toContainText('maio de 2026')
    await expect(page.locator('.grafico table tbody tr')).toHaveCount(6)
    const setembro = reais(await page.locator('.grafico table tbody tr').nth(4).locator('td').textContent())
    expect(setembro).toBeGreaterThan(5590)
  })

  test('planilha do mês em CSV que o Excel em português abre', async ({ page }) => {
    await abrirFinanceiro(page)
    const baixando = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar planilha do mês' }).click()
    const arquivo = await baixando
    expect(arquivo.suggestedFilename()).toBe('mensalidades-2026-10.csv')
    const caminho = await arquivo.path()
    const csv = readFileSync(caminho, 'utf8')
    expect(csv.startsWith('﻿Aluno;Unidade;Mês;Situação;Valor;Forma;Data;Observação\r\n')).toBe(true)
    expect(csv).toContain('Bianca Valente;Centro;10/2026;atrasado;140,00;;05/10/2026;pagou 140,00 de 280,00')
    // uma linha por pagamento e uma por mensalidade em aberto
    expect(csv.trim().split('\r\n').length).toBeGreaterThan(20)
    await expect(aviso(page, 'Planilha do mês baixada.')).toBeVisible()
  })
})
