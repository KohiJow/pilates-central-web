import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { arrastar, entrarComoAdministracao, entrarComoProfessor, esperarFolhaParada, folha, irParaAba } from './apoio'

const titulo = (page: Page) => page.getByRole('heading', { level: 1 })
const cartao = (page: Page, hora: string) => page.locator('.cartao-aula', { has: page.locator('strong', { hasText: new RegExp(`^${hora}$`) }) })

async function abrirAgenda(page: Page) {
  await entrarComoAdministracao(page)
  await irParaAba(page, 'Agenda')
  await expect(titulo(page)).toHaveText('Sexta, 9 de outubro')
}

async function abrirAula(page: Page, hora: string) {
  await cartao(page, hora).click()
  await esperarFolhaParada(page)
}

test.describe('agenda', () => {
  test('faixa de dias: hoje marcado, troca pelo toque e volta com "Hoje"', async ({ page }) => {
    await abrirAgenda(page)
    await expect(page.locator('[data-dia="2026-10-09"]')).toHaveAttribute('aria-pressed', 'true')
    await page.locator('[data-dia="2026-10-10"]').click()
    await expect(titulo(page)).toHaveText('Sábado, 10 de outubro')
    await expect(page.locator('[data-dia="2026-10-10"]')).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Hoje', exact: true }).first().click()
    await expect(titulo(page)).toHaveText('Sexta, 9 de outubro')
  })

  test('aulas por período, com horário, professor e vagas em pontos', async ({ page }) => {
    await abrirAgenda(page)
    await expect(page.getByRole('heading', { name: 'Manhã' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Noite' })).toBeVisible()
    await expect(page.locator('.cartao-aula')).toHaveCount(4)
    await expect(cartao(page, '18h').locator('.cartao-aula-professor')).toHaveText('Camila')
    await expect(cartao(page, '18h').getByRole('img', { name: /5 de 6 lugares ocupados, 1 vaga/ })).toBeVisible()
  })

  test('troca de unidade', async ({ page }) => {
    await abrirAgenda(page)
    await page.getByRole('radio', { name: 'Jardim' }).click()
    await expect(page.getByText('Não tem aula neste dia.')).toBeVisible()
    await page.locator('[data-dia="2026-10-08"]').click()
    await expect(page.locator('.cartao-aula').first()).toBeVisible()
    await page.getByRole('radio', { name: 'Centro' }).click()
    await expect(page.getByRole('radio', { name: 'Centro' })).toHaveAttribute('aria-checked', 'true')
  })

  test('deslizar o dedo troca de dia; arraste curto volta para o lugar', async ({ page }) => {
    await abrirAgenda(page)
    const caixa = await page.locator('.agenda-dia').boundingBox()
    if (!caixa) throw new Error('lista sem caixa')
    const y = caixa.y + 60
    await arrastar(page, { x: caixa.x + caixa.width * 0.85, y }, { x: caixa.x + caixa.width * 0.15, y: y + 6 })
    await expect(titulo(page)).toHaveText('Sábado, 10 de outubro')
    await arrastar(page, { x: caixa.x + caixa.width * 0.15, y }, { x: caixa.x + caixa.width * 0.85, y: y + 6 })
    await expect(titulo(page)).toHaveText('Sexta, 9 de outubro')
    await arrastar(page, { x: caixa.x + caixa.width * 0.5, y }, { x: caixa.x + caixa.width * 0.45, y }, 4)
    await expect(titulo(page)).toHaveText('Sexta, 9 de outubro')
    // o arraste não abre a aula que estava embaixo do dedo
    await expect(folha(page)).toHaveCount(0)
  })

  test('domingo sem aula e feriado cancelado', async ({ page }) => {
    await abrirAgenda(page)
    await page.locator('[data-dia="2026-10-11"]').click()
    await expect(page.getByText('Não tem aula neste dia.')).toBeVisible()
    await page.locator('[data-dia="2026-10-12"]').click()
    await expect(titulo(page)).toHaveText('Segunda, 12 de outubro')
    const total = await page.locator('.cartao-aula').count()
    expect(total).toBeGreaterThan(0)
    await expect(page.locator('.cartao-aula--cancelada')).toHaveCount(total)
    await expect(page.locator('.cartao-aula').first().getByText('Feriado', { exact: true })).toBeVisible()
  })
})

test.describe('chamada', () => {
  test('marca presente com retorno na hora e desfaz pelo aviso', async ({ page }) => {
    await abrirAgenda(page)
    await abrirAula(page, '18h')
    const linha = folha(page).locator('[data-aluno]').nth(1)
    const presente = linha.getByRole('button', { name: 'Presente' })
    await expect(presente).toHaveAttribute('aria-pressed', 'false')
    await presente.click()
    await expect(presente).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('status').filter({ hasText: 'presente' })).toBeVisible()
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(presente).toHaveAttribute('aria-pressed', 'false')
  })

  test('todos presentes num toque, sem mexer em quem avisou', async ({ page }) => {
    await abrirAgenda(page)
    await abrirAula(page, '18h')
    const botao = folha(page).getByRole('button', { name: /Todos presentes/ })
    await botao.click()
    await expect(page.getByRole('status').filter({ hasText: /presenças marcadas/ })).toBeVisible()
    await expect(botao).toHaveCount(0)
    const linhas = folha(page).locator('[data-aluno]')
    const total = await linhas.count()
    for (let i = 0; i < total; i++) {
      const avisou = await linhas.nth(i).getByRole('button', { name: 'Avisou' }).getAttribute('aria-pressed')
      const presente = linhas.nth(i).getByRole('button', { name: 'Presente' })
      await expect(presente).toHaveAttribute('aria-pressed', avisou === 'true' ? 'false' : 'true')
    }
  })

  test('avisar falta no prazo gera reposição e libera a vaga', async ({ page }) => {
    await abrirAgenda(page)
    await abrirAula(page, '18h')
    await expect(folha(page).getByRole('img', { name: /1 vaga/ })).toBeVisible()
    const linha = folha(page).locator('[data-aluno]').nth(1)
    await linha.getByRole('button', { name: 'Avisou' }).click()
    await expect(page.getByRole('status').filter({ hasText: /Tem reposição até 8\/11/ })).toBeVisible()
    await expect(folha(page).getByRole('img', { name: /2 vagas/ })).toBeVisible()
  })

  test('encaixar reposição só onde há vaga', async ({ page }) => {
    await abrirAgenda(page)
    await abrirAula(page, '19h')
    const antes = await folha(page).getByText('reposição', { exact: true }).count()
    await folha(page).getByRole('button', { name: 'Encaixar reposição' }).click()
    await expect(folha(page).getByText(/vagas? livres?/)).toBeVisible()
    await folha(page).getByRole('button', { name: 'Encaixar', exact: true }).first().click()
    await expect(page.getByRole('status').filter({ hasText: /Reposição de .* marcada para as 19h/ })).toBeVisible()
    await expect(folha(page).getByText('reposição', { exact: true })).toHaveCount(antes + 1)
  })

  test('aula de outro dia: chamada fechada, aviso de falta liberado', async ({ page }) => {
    await abrirAgenda(page)
    await page.locator('[data-dia="2026-10-10"]').click()
    await abrirAula(page, '9h')
    await expect(folha(page).getByText('A chamada abre no dia da aula.', { exact: false })).toBeVisible()
    const linha = folha(page).locator('[data-aluno]').first()
    await expect(linha.getByRole('button', { name: 'Presente' })).toBeDisabled()
    await expect(linha.getByRole('button', { name: 'Faltou' })).toBeDisabled()
    await expect(linha.getByRole('button', { name: 'Avisou' })).toBeEnabled()
  })

  test('a folha fecha arrastando para baixo, com Esc e com o voltar do celular', async ({ page }) => {
    await abrirAgenda(page)
    await abrirAula(page, '18h')
    const pegador = await page.locator('.folha-alca').boundingBox()
    if (!pegador) throw new Error('sem alça')
    await arrastar(page, { x: pegador.x + 10, y: pegador.y + 2 }, { x: pegador.x + 10, y: pegador.y + 420 }, 10)
    await expect(folha(page)).toHaveCount(0)

    await abrirAula(page, '18h')
    await page.keyboard.press('Escape')
    await expect(folha(page)).toHaveCount(0)

    await abrirAula(page, '18h')
    await page.goBack()
    await expect(folha(page)).toHaveCount(0)
    await expect(titulo(page)).toHaveText('Sexta, 9 de outubro')
  })

  test('arraste curto da folha volta para o lugar', async ({ page }) => {
    await abrirAgenda(page)
    await abrirAula(page, '18h')
    const pegador = await page.locator('.folha-alca').boundingBox()
    if (!pegador) throw new Error('sem alça')
    await arrastar(page, { x: pegador.x + 10, y: pegador.y + 2 }, { x: pegador.x + 10, y: pegador.y + 50 }, 10)
    await esperarFolhaParada(page)
    await expect(folha(page)).toBeVisible()
  })

  test('a administração cancela uma aula futura e desfaz; o professor não vê a opção', async ({ page }) => {
    await abrirAgenda(page)
    await abrirAula(page, '19h')
    await folha(page).getByRole('button', { name: 'Cancelar esta aula' }).click()
    await folha(page).getByRole('button', { name: /Cancelar a aula das 19h/ }).click()
    await expect(page.getByRole('status').filter({ hasText: /Aula cancelada/ })).toBeVisible()
    await expect(folha(page).getByText('Cancelada pelo estúdio')).toBeVisible()
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(folha(page).getByRole('button', { name: /Todos presentes/ })).toBeVisible()
  })

  test('professor não cancela aula', async ({ page }) => {
    await entrarComoProfessor(page, 'Rafael Moreira')
    await irParaAba(page, 'Agenda')
    await abrirAula(page, '19h')
    await expect(folha(page).getByRole('button', { name: 'Cancelar esta aula' })).toHaveCount(0)
  })
})
