import { expect, test } from './base'
import type { Page } from '@playwright/test'
import { aviso, entrarComoAdministracao, entrarComoProfessor, esperarFolhaParada, esperarParado, folha, irParaAba, irParaSecao } from './apoio'

const titulo = (page: Page) => page.getByRole('heading', { level: 1 })

async function abrirTurmas(page: Page) {
  await entrarComoAdministracao(page)
  await irParaAba(page, 'Alunos')
  await irParaSecao(page, 'Turmas')
  await expect(titulo(page)).toHaveText('Turmas da semana')
}

async function abrirTurma(page: Page, dia: string, hora: string) {
  await page.getByRole('button', { name: new RegExp(`^${dia}, ${hora} com`) }).click()
  await expect(titulo(page)).toHaveText(`${dia}, ${hora}`)
  await esperarParado(page, '.tela-quadro')
}

test.describe('turmas', () => {
  test('grade da semana por unidade, com lugares e frequência', async ({ page }) => {
    await abrirTurmas(page)
    await expect(page.getByRole('heading', { name: 'Segunda' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sábado' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Sexta, 18h com Camila/ }).getByRole('img', { name: /6 de 6 lugares ocupados, lotada/ })).toBeVisible()
    await page.getByRole('radio', { name: 'Jardim' }).click()
    await expect(page.getByRole('button', { name: /^Segunda, 18h30 com Tiago/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sábado' })).toHaveCount(0)
  })

  test('coloca e tira aluno fixo respeitando a capacidade, com desfazer', async ({ page }) => {
    await abrirTurmas(page)
    await abrirTurma(page, 'Sexta', '18h')
    await expect(page.getByRole('button', { name: 'Turma cheia' })).toBeDisabled()
    await page.getByRole('button', { name: 'Tirar Carla Cardoso da turma' }).click()
    await expect(aviso(page, 'Carla saiu da turma.')).toBeVisible()
    await expect(page.locator('[data-aluno="a-12"]')).toHaveCount(0)
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.locator('[data-aluno="a-12"]')).toBeVisible()

    await page.getByRole('button', { name: 'Tirar Carla Cardoso da turma' }).click()
    await page.getByRole('button', { name: 'Colocar aluno' }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('searchbox', { name: 'Buscar aluno' }).fill('mariana')
    await folha(page).getByRole('button', { name: 'Colocar' }).click()
    await expect(aviso(page, 'Mariana entrou na turma.')).toBeVisible()
    await expect(page.locator('[data-aluno="a-20"]')).toContainText('Plano de 2x por semana, mas está em 3 turmas.')
  })

  test('turma nova: valida professor e horário, e entra na grade', async ({ page }) => {
    await abrirTurmas(page)
    await page.getByRole('button', { name: 'Nova turma' }).click()
    await expect(titulo(page)).toHaveText('Nova turma')
    await esperarParado(page, '.tela-quadro')
    await page.getByRole('radio', { name: 'Seg' }).click()
    await page.getByLabel('Começa às').fill('18:30')
    await page.getByRole('button', { name: 'Criar turma' }).click()
    await expect(page.getByText('Escolha quem dá a aula.')).toBeVisible()
    await page.getByRole('combobox', { name: 'Quem dá a aula' }).selectOption({ label: 'Camila Nunes' })
    await page.getByRole('button', { name: 'Criar turma' }).click()
    await expect(page.getByText('Camila já dá a turma de segunda, 18h.')).toBeVisible()
    await page.getByLabel('Começa às').fill('20:00')
    await page.getByRole('button', { name: 'Mais: lugares' }).click()
    await page.getByRole('button', { name: 'Criar turma' }).click()
    await expect(aviso(page, 'Turma de segunda, 20h criada.')).toBeVisible()
    await expect(titulo(page)).toHaveText('Segunda, 20h')
    await expect(page.getByText('0 lugares fixos de 6.')).toBeVisible()
  })

  test('editar não deixa a capacidade ficar abaixo dos fixos; encerrar pede confirmação e desfaz', async ({ page }) => {
    await abrirTurmas(page)
    await abrirTurma(page, 'Quarta', '18h')
    await page.getByRole('button', { name: 'Editar horário, lugares ou professor' }).click()
    await esperarParado(page, '.tela-quadro')
    await expect(page.getByText('O dia e a unidade não mudam numa turma que já existe', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Menos: lugares' })).toBeEnabled()
    await page.getByRole('button', { name: 'Menos: lugares' }).click()
    await expect(page.getByRole('spinbutton', { name: 'Lugares' })).toHaveAttribute('aria-valuetext', '5 alunos')
    await expect(page.getByRole('button', { name: 'Menos: lugares' })).toBeDisabled()
    await page.getByRole('button', { name: 'Salvar turma' }).click()
    await expect(aviso(page, 'Turma atualizada.')).toBeVisible()
    await expect(page.getByText('5 lugares fixos de 5.')).toBeVisible()

    await page.getByRole('button', { name: 'Encerrar turma' }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Encerrar', exact: true }).click()
    await expect(aviso(page, /Turma encerrada/)).toBeVisible()
    await expect(page.locator('.cabecalho-de-tela').getByText('Encerrada')).toBeVisible()
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.locator('.cabecalho-de-tela').getByText('Encerrada')).toHaveCount(0)
  })

  test('professor vê a grade, mas não cria nem muda turma', async ({ page }) => {
    await entrarComoProfessor(page, 'Rafael Moreira')
    await irParaAba(page, 'Alunos')
    await irParaSecao(page, 'Turmas')
    await expect(page.getByRole('button', { name: 'Nova turma' })).toHaveCount(0)
    await expect(page.getByText('Rafael (você)').first()).toBeVisible()
    await abrirTurma(page, 'Segunda', '7h')
    await expect(page.getByRole('button', { name: 'Colocar aluno' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Tirar / })).toHaveCount(0)
  })
})
