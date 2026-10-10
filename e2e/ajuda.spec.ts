// Ajuda dentro do app (Mais, Ajuda): cards curtos para cada papel, com o desenho do iPhone.
import { entrarComoAdministracao, entrarComoProfessor, esperarParado, irParaAba } from './apoio'
import { expect, test } from './base'

test.describe('ajuda', () => {
  test('a administração acha a ajuda em Mais, com todos os assuntos', async ({ page }) => {
    await entrarComoAdministracao(page)
    await irParaAba(page, 'Mais')
    await page.getByRole('button', { name: /^Ajuda/ }).click()
    await esperarParado(page, '.tela-quadro')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ajuda')
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'Pôr o app na tela inicial',
      'Montar o estúdio',
      'Fazer a chamada',
      'Reposição',
      'Lançar um pagamento',
      'Convidar alguém para o app',
      'O que o professor vê',
      'O que o aluno vê',
      'Sem internet',
      'Privacidade',
    ])
    // o caminho do iPhone em passos, com o desenho ao lado (decorativo para o leitor de tela)
    await expect(page.getByRole('listitem').filter({ hasText: 'Adicionar à Tela de Início' })).toBeVisible()
    await expect(page.locator('.ajuda-desenho')).toHaveAttribute('aria-hidden', 'true')
    await page.locator('.voltar').click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ajustes')
  })

  test('o professor vê a ajuda sem o que é só da administração', async ({ page }) => {
    await entrarComoProfessor(page)
    await irParaAba(page, 'Mais')
    await page.getByRole('button', { name: /^Ajuda/ }).click()
    await esperarParado(page, '.tela-quadro')
    await expect(page.getByRole('heading', { level: 2, name: 'Fazer a chamada' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Lançar um pagamento' })).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 2, name: 'Convidar alguém para o app' })).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 2, name: 'Montar o estúdio' })).toHaveCount(0)
  })
})
