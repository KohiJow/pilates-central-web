import { expect, test } from './base'
import { aviso, entrarComoAdministracao, esperarParado, irPara } from './apoio'

// Os textos do estúdio (frase, focos, endereço, mapa, Instagram) vêm das configurações e
// alimentam a página pública; nada do estúdio fica escrito no código.

test.describe('textos do estúdio', () => {
  test('a página pública mostra o que está nas configurações da demonstração, com a marca d\'água do nome', async ({ page }) => {
    await page.goto('./experimental/?demo&agora=2026-10-09T10:00')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Um estúdio pequeno, com turmas de até seis pessoas e atenção a cada uma.')).toBeVisible()
    for (const foco of ['Fortalecimento', 'Postura', 'Mobilidade']) await expect(page.locator('.vitrine-focos .pilula', { hasText: foco })).toBeVisible()
    const onde = page.locator('section', { has: page.getByRole('heading', { name: 'Onde fica' }) })
    await expect(onde).toContainText('Rua Exemplo, 100, sala 2, Centro')
    await expect(onde.getByRole('link', { name: 'Mapa' }).first()).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Rua%20Exemplo/)
    await expect(onde).toContainText('@estudio.exemplo')
    await expect(onde.getByRole('link', { name: 'Abrir' })).toHaveAttribute('href', 'https://www.instagram.com/estudio.exemplo/')
    // nada do estúdio de verdade escrito na página
    await expect(page.locator('main')).not.toContainText('Campinas')
    await expect(page.locator('.marca-dagua span').first()).toHaveText('PILATES')
  })

  test('a administração muda os textos em Mais, Estúdio, e a página pública acompanha', async ({ page }) => {
    await entrarComoAdministracao(page)
    await irPara(page, '#/mais/estudio')
    await page.getByRole('textbox', { name: 'Nome do estúdio' }).fill('Movimento Pleno Pilates')
    await page.getByRole('textbox', { name: 'Frase de apresentação' }).fill('Aulas em grupos pequenos, no seu ritmo.')
    await page.getByRole('textbox', { name: 'Foco 1' }).fill('Alongamento')
    await page.getByRole('textbox', { name: 'Foco 2 (opcional)' }).fill('')
    await page.getByRole('textbox', { name: 'Foco 3 (opcional)' }).fill('')
    await page.getByRole('textbox', { name: 'Endereço' }).fill('Avenida Exemplo, 500, Jardim')
    await page.getByRole('textbox', { name: 'Link do mapa (opcional)' }).fill('https://maps.app.goo.gl/exemplo')
    await page.getByRole('textbox', { name: 'Instagram (opcional)' }).fill('@movimento.pleno')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(aviso(page, 'Dados do estúdio salvos.')).toBeVisible()
    await esperarParado(page, '.tela-quadro')
    await expect(page.locator('.topo-nome')).toHaveText('Movimento Pleno Pilates')

    await page.goto('./experimental/?demo&agora=2026-10-09T10:00')
    await expect(page.locator('.topo-nome')).toHaveText('Movimento Pleno Pilates')
    await expect(page.getByText('Aulas em grupos pequenos, no seu ritmo.')).toBeVisible()
    await expect(page.locator('.vitrine-focos .pilula')).toHaveText(['Alongamento'])
    const onde = page.locator('section', { has: page.getByRole('heading', { name: 'Onde fica' }) })
    await expect(onde).toContainText('Avenida Exemplo, 500, Jardim')
    await expect(onde.getByRole('link', { name: 'Mapa' }).first()).toHaveAttribute('href', 'https://maps.app.goo.gl/exemplo')
    await expect(onde.getByRole('link', { name: 'Abrir' })).toHaveAttribute('href', 'https://www.instagram.com/movimento.pleno/')
    await expect(page.locator('.marca-dagua span').first()).toHaveText('MOVIMENTO')
  })

  test('link do mapa e Instagram tortos são apontados no campo', async ({ page }) => {
    await entrarComoAdministracao(page)
    await irPara(page, '#/mais/estudio')
    await page.getByRole('textbox', { name: 'Link do mapa (opcional)' }).fill('maps.app.goo.gl/exemplo')
    await page.getByRole('textbox', { name: 'Instagram (opcional)' }).fill('nome com espaço')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Cole o link completo do mapa, começando com https://.')).toBeVisible()
    await expect(page.getByText(/Use só o nome do perfil/)).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Link do mapa (opcional)' })).toBeFocused()
  })
})
