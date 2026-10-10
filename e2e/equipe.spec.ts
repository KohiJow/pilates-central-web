import { expect, test } from './base'
import type { Page } from '@playwright/test'
import { abrirApp, aviso, entrarComoAdministracao, esperarFolhaParada, esperarParado, folha, irPara, irParaAba } from './apoio'

const titulo = (page: Page) => page.getByRole('heading', { level: 1 })

async function abrirEquipe(page: Page) {
  await irPara(page, '#/mais/equipe')
  await expect(titulo(page)).toHaveText('Equipe')
}

async function entrarComoMarcos(page: Page) {
  await abrirApp(page)
  await page.getByRole('button', { name: 'Entrar como outra pessoa da equipe' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Marcos Teles/ }).click()
  await expect(page.getByRole('heading', { name: /Marcos/ })).toBeVisible()
}

test.describe('equipe e papéis', () => {
  test('a lista mostra o papel de cada um; convidar professor valida e fica pendente', async ({ page }) => {
    await entrarComoAdministracao(page)
    await abrirEquipe(page)
    await expect(page.locator('[data-membro="e-helena"]')).toContainText('Responsável')
    await expect(page.locator('[data-membro="e-marcos"]')).toContainText('Administração')
    await expect(page.locator('[data-membro="e-camila"]')).toContainText('Professor, Centro')

    await page.getByRole('button', { name: 'Convidar pessoa' }).click()
    await esperarParado(page, '.tela-quadro')
    await page.getByRole('textbox', { name: 'Nome' }).fill('Bruna Teixeira')
    await page.getByRole('textbox', { name: 'E-mail' }).fill('camila@example.com')
    await page.getByRole('button', { name: 'Registrar convite' }).click()
    await expect(page.getByText('Camila Nunes já usa este e-mail.')).toBeVisible()
    await expect(page.getByText('Escolha pelo menos uma unidade.')).toBeVisible()
    await page.getByRole('textbox', { name: 'E-mail' }).fill('bruna@example.com')
    await page.getByRole('button', { name: 'Jardim' }).click()
    await page.getByRole('button', { name: 'Registrar convite' }).click()
    await expect(aviso(page, /Convite registrado para Bruna/)).toBeVisible()
    await expect(titulo(page)).toHaveText('Bruna Teixeira')
    await expect(page.locator('.cabecalho-de-tela').getByText('convite pendente')).toBeVisible()
  })

  test('convite pendente: aparece com a data e o prazo, pode ser copiado, revogado e mandado de novo', async ({ page, context, browserName }) => {
    await entrarComoAdministracao(page)
    await abrirEquipe(page)
    await page.getByRole('button', { name: 'Convidar pessoa' }).click()
    await esperarParado(page, '.tela-quadro')
    await page.getByRole('textbox', { name: 'Nome' }).fill('Bruna Teixeira')
    await page.getByRole('textbox', { name: 'E-mail' }).fill('bruna@example.com')
    await page.getByRole('textbox', { name: 'Telefone (opcional)' }).fill('(11) 90000-0088')
    await page.getByRole('button', { name: 'Jardim' }).click()
    await page.getByRole('button', { name: 'Registrar convite' }).click()
    await expect(titulo(page)).toHaveText('Bruna Teixeira')
    // registrado hoje (9/10), vale 7 dias
    await expect(page.locator('.dados')).toContainText('Registrado em 9/10 por Helena, vale até 16/10.')
    // a mensagem pronta leva o link de entrada e o e-mail, nunca o e-mail na URL
    const whats = page.getByRole('link', { name: 'Mandar o convite pelo WhatsApp' })
    const texto = decodeURIComponent(((await whats.getAttribute('href')) ?? '').split('text=')[1] ?? '')
    expect(texto).toContain('bruna@example.com')
    expect(texto).toContain('?entrar')
    expect(texto).toContain('O convite vale por 7 dias.')
    expect(texto).not.toMatch(/\?entrar\S*bruna/)
    const botao = page.getByRole('button', { name: /^(Compartilhar o convite|Copiar o convite)$/ })
    await expect(botao).toBeVisible()
    if (browserName === 'chromium' && (await botao.textContent())?.includes('Copiar')) {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await botao.click()
      await expect(aviso(page, /Convite copiado/)).toBeVisible()
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(texto)
    }

    // na lista: a seção de convites pendentes, com a data e o prazo
    await page.locator('.voltar').click()
    await expect(titulo(page)).toHaveText('Equipe')
    const pendentes = page.locator('section.secao', { has: page.getByRole('heading', { name: 'Convites pendentes' }) })
    await expect(pendentes.locator('[data-membro]')).toHaveCount(1)
    await expect(pendentes.locator('[data-membro]')).toContainText('Professor, registrado em 9/10, vale até 16/10')
    await expect(pendentes.getByText('convite pendente')).toBeVisible()

    // revogar: sai dos pendentes, fica em "Sem acesso" como revogado, e dá para convidar de novo
    await pendentes.locator('[data-membro]').click()
    await page.getByRole('button', { name: 'Revogar o convite' }).click()
    await expect(aviso(page, 'Convite de Bruna revogado.')).toBeVisible()
    await expect(page.locator('.cabecalho-de-tela').getByText('convite revogado')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Mandar o convite pelo WhatsApp' })).toHaveCount(0)
    await page.locator('.voltar').click()
    await expect(page.getByRole('heading', { name: 'Convites pendentes' })).toHaveCount(0)
    const semAcesso = page.locator('section.secao', { has: page.getByRole('heading', { name: 'Sem acesso' }) })
    await expect(semAcesso.getByText('convite revogado')).toBeVisible()
    await semAcesso.locator('[data-membro]').click()
    await page.getByRole('button', { name: 'Convidar de novo' }).click()
    await expect(aviso(page, /Convite de Bruna mandado de novo: vale por 7 dias/)).toBeVisible()
    await expect(page.locator('.cabecalho-de-tela').getByText('convite pendente')).toBeVisible()

    // o registro de alterações anota os dois passos, só com códigos
    await irPara(page, '#/mais/alteracoes')
    await expect(page.locator('[data-auditoria="convite-reenviado"]').first()).toContainText('Helena Prado mandou de novo o convite de Bruna Teixeira')
    await expect(page.locator('[data-auditoria="convite-revogado"]').first()).toContainText('Helena Prado revogou o convite de Bruna Teixeira')
  })

  test('convite vencido: a lista avisa e a ficha oferece mandar de novo', async ({ page }) => {
    // o convite da demonstração é registrado hoje; 8 dias depois, venceu
    await entrarComoAdministracao(page)
    await abrirEquipe(page)
    await page.getByRole('button', { name: 'Convidar pessoa' }).click()
    await esperarParado(page, '.tela-quadro')
    await page.getByRole('textbox', { name: 'Nome' }).fill('Bruna Teixeira')
    await page.getByRole('textbox', { name: 'E-mail' }).fill('bruna@example.com')
    await page.getByRole('button', { name: 'Jardim' }).click()
    await page.getByRole('button', { name: 'Registrar convite' }).click()
    await expect(titulo(page)).toHaveText('Bruna Teixeira')
    await page.goto('./?demo&agora=2026-10-17T10:00#/mais/equipe')
    await expect(titulo(page)).toHaveText('Equipe')
    const pendentes = page.locator('section.secao', { has: page.getByRole('heading', { name: 'Convites pendentes' }) })
    await expect(pendentes.getByText('convite vencido')).toBeVisible()
    await expect(pendentes.locator('[data-membro]')).toContainText('venceu em 16/10')
    await pendentes.locator('[data-membro]').click()
    await expect(page.locator('.dados')).toContainText('Passou do prazo sem a pessoa criar a conta: mande de novo.')
    await page.getByRole('button', { name: 'Mandar o convite de novo' }).click()
    await expect(aviso(page, /mandado de novo: vale por 7 dias/)).toBeVisible()
    await expect(page.locator('.dados')).toContainText('Registrado em 17/10 por Helena, vale até 24/10.')
  })

  test('responsável promove professor e passa a conta para quem administra', async ({ page }) => {
    await entrarComoAdministracao(page)
    await abrirEquipe(page)
    await page.locator('[data-membro="e-tiago"]').click()
    await expect(titulo(page)).toHaveText('Tiago Martins')
    await page.getByRole('button', { name: 'Passar para a administração' }).click()
    await expect(aviso(page, 'Tiago agora faz parte da administração.')).toBeVisible()
    await expect(page.locator('.cabecalho-de-tela')).toContainText('Administração')
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.locator('.cabecalho-de-tela')).toContainText('Professor')

    await page.locator('.voltar').click()
    await page.locator('[data-membro="e-marcos"]').click()
    await page.getByRole('button', { name: 'Passar a conta para Marcos' }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Passar a conta' }).click()
    await expect(aviso(page, /Marcos agora é responsável pela conta/)).toBeVisible()
    await expect(page.locator('.cabecalho-de-tela')).toContainText('Responsável')
    // quem passou a conta continua na administração, sem as ações de titular
    await expect(page.getByRole('button', { name: 'Tirar o acesso' })).toHaveCount(0)
    await irParaAba(page, 'Mais')
    await expect(page.locator('.perfil')).toContainText('Administração')
    await expect(page.locator('.perfil')).toContainText('Helena Prado')
  })

  test('administração não mexe em quem administra nem na responsável (tentativa de escalada)', async ({ page }) => {
    await entrarComoMarcos(page)
    await abrirEquipe(page)
    await page.locator('[data-membro="e-helena"]').click()
    await expect(titulo(page)).toHaveText('Helena Prado')
    await expect(page.getByRole('button', { name: /Editar contato/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Tirar o acesso' })).toHaveCount(0)
    await expect(page.getByText('só deixa de ser passando a conta', { exact: false })).toBeVisible()
    // professor: pode tirar o acesso, mas não promover
    await page.locator('.voltar').click()
    await page.locator('[data-membro="e-rafael"]').click()
    await expect(page.getByRole('button', { name: 'Passar para a administração' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Tirar o acesso' })).toBeVisible()
    await page.getByRole('button', { name: 'Tirar o acesso' }).click()
    await expect(aviso(page, 'Rafael dá 9 turmas. Passe para outra pessoa antes.')).toBeVisible()
    // convite: só professor
    await page.locator('.voltar').click()
    await page.getByRole('button', { name: 'Convidar pessoa' }).click()
    await expect(page.getByRole('radio', { name: 'Administração' })).toHaveCount(0)
  })

  test('unidades: abrir uma nova e não fechar a que tem alunos', async ({ page }) => {
    await entrarComoAdministracao(page)
    await irPara(page, '#/mais/unidades')
    await page.getByRole('button', { name: 'Nova unidade' }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('textbox', { name: 'Nome' }).fill('centro')
    await folha(page).getByRole('button', { name: 'Criar unidade' }).click()
    await expect(folha(page).getByText('Já existe uma unidade com este nome.')).toBeVisible()
    await folha(page).getByRole('textbox', { name: 'Nome' }).fill('Barão')
    await folha(page).getByRole('button', { name: 'Criar unidade' }).click()
    await expect(aviso(page, 'Unidade Barão criada.')).toBeVisible()
    await page.getByRole('button', { name: /^Jardim/ }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Fechar esta unidade' }).click()
    await expect(aviso(page, 'A unidade ainda tem 8 turmas. Encerre antes.')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(folha(page)).toHaveCount(0)
    await irParaAba(page, 'Alunos')
    await expect(page.getByRole('radio', { name: 'Barão' })).toBeVisible()
  })

  test('nome do estúdio vai para o topo do app', async ({ page }) => {
    await entrarComoAdministracao(page)
    await irPara(page, '#/mais/estudio')
    await page.getByRole('textbox', { name: 'Nome do estúdio' }).fill('Studio Exemplo')
    await page.getByRole('textbox', { name: 'WhatsApp do estúdio' }).fill('123')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Use DDD e número, por exemplo (19) 90000-0000.')).toBeVisible()
    await page.getByRole('textbox', { name: 'WhatsApp do estúdio' }).fill('(11) 90000-0000')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(aviso(page, 'Dados do estúdio salvos.')).toBeVisible()
    await expect(page.locator('.topo-nome')).toHaveText('Studio Exemplo')
  })
})
