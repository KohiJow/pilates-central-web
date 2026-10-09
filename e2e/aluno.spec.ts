import type { Page } from '@playwright/test'
import { abrirApp, aviso, entrarComoAdministracao, esperarFolhaParada, esperarParado, folha, irPara } from './apoio'
import { expect, test } from './base'

// Sexta, 9/10, 10h. Beatriz Barbosa (a-11) tem acesso liberado; próxima aula: sábado, 9h.
async function entrarComoBeatriz(page: Page) {
  await abrirApp(page)
  await page.getByRole('button', { name: 'Explorar como aluno' }).click()
  await esperarFolhaParada(page)
  await folha(page).getByRole('button', { name: /Beatriz Barbosa/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Olá, Beatriz' })).toBeVisible()
}

function abaDoAluno(page: Page, nome: 'Minhas aulas' | 'Reposição' | 'Mais') {
  return page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: nome })
}

async function irParaAbaDoAluno(page: Page, nome: 'Minhas aulas' | 'Reposição' | 'Mais') {
  await abaDoAluno(page, nome).click()
  await expect(abaDoAluno(page, nome)).toHaveAttribute('aria-current', 'page')
  await esperarParado(page, '.tela-quadro')
}

const linhaDaAula = (page: Page, dia: string) => page.locator('#conteudo .lista .lista-item', { hasText: dia })

/** A reposição pode ser a próxima aula (no destaque) ou estar na lista. */
async function abrirAReposicao(page: Page) {
  const destaque = page.locator('.destaque', { has: page.locator('.pilula', { hasText: 'Reposição' }) })
  if (await destaque.count()) await destaque.getByRole('button').click()
  else await page.locator('#conteudo .lista .lista-item', { has: page.locator('.pilula', { hasText: 'Reposição' }) }).click()
  await esperarFolhaParada(page)
}

test.describe('app do aluno (demonstração)', () => {
  test('próximas aulas: a mais perto no destaque, sem nomes de colegas', async ({ page }) => {
    await entrarComoBeatriz(page)
    const destaque = page.locator('.destaque')
    await expect(destaque).toContainText('Sua próxima aula')
    await expect(destaque).toContainText('Amanhã, 9h')
    await expect(linhaDaAula(page, '13/10')).toContainText('18h')
    await expect(page.locator('#conteudo')).not.toContainText(/Camila|Rafael|Almeida/)
  })

  test('avisa a falta no prazo, ganha a reposição e desfaz pelo aviso', async ({ page }) => {
    await entrarComoBeatriz(page)
    await linhaDaAula(page, '13/10').click()
    await esperarFolhaParada(page)
    await expect(folha(page)).toContainText('Terça, 13 de outubro')
    await folha(page).getByRole('button', { name: 'Avisar que não vou' }).click()
    await expect(aviso(page, 'Falta avisada. Você ganhou uma reposição.')).toBeVisible()
    await expect(linhaDaAula(page, '13/10')).toContainText('Você avisou')
    await expect(page.getByRole('button', { name: /1 reposição para marcar/ })).toBeVisible()
    await aviso(page, /Falta avisada/).getByRole('button', { name: 'Desfazer' }).click()
    await expect(linhaDaAula(page, '13/10')).toContainText('Confirmada')
    await expect(page.getByRole('button', { name: /reposição para marcar/ })).toHaveCount(0)
  })

  test('escolhe a reposição numa aula com vaga e a equipe vê na ficha', async ({ page }) => {
    await entrarComoBeatriz(page)
    await linhaDaAula(page, '13/10').click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Avisar que não vou' }).click()
    await expect(aviso(page, /Falta avisada/)).toBeVisible()
    await page.getByRole('button', { name: /1 reposição para marcar/ }).click()
    await esperarParado(page, '.tela-quadro')
    await expect(page.getByRole('heading', { name: 'Escolha onde repor' })).toBeVisible()
    await expect(page.getByText('Falta de 13/10, vale até 12/11.')).toBeVisible()
    const opcoes = page.locator('.opcao-aula')
    await expect(opcoes.first()).toBeVisible()
    // só o Centro (a unidade dela)
    await expect(page.getByRole('list', { name: 'Aulas com vaga' })).not.toContainText('Jardim')
    await opcoes.first().click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Confirmar reposição' }).click()
    await expect(aviso(page, /^Reposição marcada: /)).toBeVisible()
    await expect(abaDoAluno(page, 'Minhas aulas')).toHaveAttribute('aria-current', 'page')
    await expect(page.locator('.pilula', { hasText: 'Reposição' })).toHaveCount(1)

    // a mesma demonstração, do lado da administração
    await irParaAbaDoAluno(page, 'Mais')
    await page.getByRole('button', { name: 'Trocar de perfil' }).click()
    await page.getByRole('button', { name: 'Explorar como administração' }).click()
    await irPara(page, '#/alunos/a-11')
    await expect(page.locator('section.secao', { has: page.getByRole('heading', { name: 'Reposições' }) })).toContainText('Reposição marcada')
  })

  test('desiste da reposição no prazo e o crédito volta', async ({ page }) => {
    await entrarComoBeatriz(page)
    await linhaDaAula(page, '13/10').click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Avisar que não vou' }).click()
    await expect(aviso(page, /Falta avisada/)).toBeVisible()
    await irParaAbaDoAluno(page, 'Reposição')
    await page.locator('.opcao-aula').first().click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Confirmar reposição' }).click()
    await expect(aviso(page, /^Reposição marcada/)).toBeVisible()
    await abrirAReposicao(page)
    await folha(page).getByRole('button', { name: 'Desistir da reposição' }).click()
    await expect(aviso(page, 'Reposição desmarcada. O crédito voltou para você.')).toBeVisible()
    await expect(page.getByRole('button', { name: /1 reposição para marcar/ })).toBeVisible()
  })

  test('aula em cima da hora: sem aviso pelo app, manda para o WhatsApp', async ({ page }) => {
    // terça às 16h: a aula das 18h começa em menos de 3 horas
    await abrirApp(page, '2026-10-13T16:00')
    await page.getByRole('button', { name: 'Explorar como aluno' }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: /Beatriz Barbosa/ }).click()
    await expect(page.locator('.destaque')).toContainText('Hoje, 18h')
    await page.locator('.destaque').getByRole('button', { name: 'Ver detalhes' }).click()
    await esperarFolhaParada(page)
    await expect(folha(page)).toContainText('Faltam menos de 3 horas para a aula.')
    await expect(folha(page).getByRole('button', { name: 'Avisar que não vou' })).toHaveCount(0)
    await expect(folha(page).getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', /^https:\/\/wa\.me\/5511900000000\?text=/)
  })

  test('com o app do aluno desligado, a entrada some', async ({ page }) => {
    await entrarComoAdministracao(page)
    await irPara(page, '#/mais/estudio')
    await page.getByRole('switch', { name: /App do aluno/ }).click()
    await expect(page.getByRole('switch', { name: /App do aluno/ })).toHaveAttribute('aria-checked', 'false')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(aviso(page, 'Dados do estúdio salvos.')).toBeVisible()
    await irPara(page, '#/mais')
    await page.getByRole('button', { name: 'Trocar de perfil' }).click()
    await expect(page.getByRole('button', { name: 'Explorar como professor' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Explorar como aluno' })).toHaveCount(0)
  })
})
