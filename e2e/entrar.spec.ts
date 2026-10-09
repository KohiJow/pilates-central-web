import { expect, test } from './base'
import { aba, abrirApp, entrarComoAdministracao, entrarComoProfessor, irParaAba } from './apoio'

test.describe('entrar na demonstração', () => {
  test('mostra o aviso de demonstração e as duas formas de explorar', async ({ page }) => {
    await abrirApp(page)
    await expect(page.getByText('Modo demonstração')).toBeVisible()
    await expect(page.getByText(/dados são fictícios/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Explorar como administração' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Explorar como professor' })).toBeVisible()
    // a página pública que o estúdio divulga e o aviso de privacidade estão a um toque
    await expect(page.getByRole('link', { name: 'Ver a página de aula experimental' })).toHaveAttribute('href', /\/experimental\/$/)
    await expect(page.getByRole('link', { name: 'Aviso de privacidade' })).toHaveAttribute('href', /\/privacidade\/$/)
  })

  test('como administração: abas com rótulo e o selo discreto de demonstração', async ({ page }) => {
    await entrarComoAdministracao(page)
    for (const nome of ['Hoje', 'Agenda', 'Mais'] as const) await expect(aba(page, nome)).toBeVisible()
    await expect(aba(page, 'Hoje')).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('button', { name: 'Demonstração' })).toBeVisible()
    await expect(page.getByText('Próxima aula')).toBeVisible()
  })

  test('como professor: escolhe quem é e vê só as próprias aulas', async ({ page }) => {
    await entrarComoProfessor(page, 'Tiago Martins')
    await expect(page.getByText('Aqui aparecem só as suas aulas.')).toBeVisible()
    await irParaAba(page, 'Agenda')
    await expect(page.getByRole('button', { name: 'Só as minhas aulas' })).toHaveAttribute('aria-pressed', 'true')
    // todas as aulas listadas são do Tiago
    const cartoes = page.locator('.cartao-aula')
    const total = await cartoes.count()
    for (let i = 0; i < total; i++) await expect(cartoes.nth(i).locator('.cartao-aula-professor')).toContainText('Tiago')
  })

  test('outra pessoa da equipe: a lista mostra o papel de cada um', async ({ page }) => {
    await abrirApp(page)
    await page.getByRole('button', { name: 'Entrar como outra pessoa da equipe' }).click()
    const dialogo = page.getByRole('dialog')
    await expect(dialogo.getByRole('button', { name: /Helena Prado.*Responsável/ })).toBeVisible()
    await dialogo.getByRole('button', { name: /Marcos Teles.*Administração/ }).click()
    await expect(page.getByRole('heading', { name: /Marcos/ })).toBeVisible()
  })

  test('a sessão continua depois de recarregar e "Trocar de perfil" volta para a entrada', async ({ page }) => {
    await entrarComoAdministracao(page)
    await page.reload()
    await expect(page.getByRole('heading', { name: /Helena/ })).toBeVisible()
    await irParaAba(page, 'Mais')
    await page.getByRole('button', { name: 'Trocar de perfil' }).click()
    await expect(page.getByRole('button', { name: 'Explorar como administração' })).toBeVisible()
    // quem entra depois começa no Hoje, não na aba Mais de quem saiu
    await page.getByRole('button', { name: 'Explorar como professor' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Rafael Moreira/ }).click()
    await expect(page.getByRole('heading', { name: /Rafael/ })).toBeVisible()
    await expect(aba(page, 'Hoje')).toHaveAttribute('aria-current', 'page')
  })
})
