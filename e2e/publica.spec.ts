import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { abrirApp, AGORA_PADRAO, aviso, entrarComoAdministracao, esperarFolhaParada, folha, irPara } from './apoio'
import { expect, test } from './base'

async function abrirExperimental(page: Page, agora = AGORA_PADRAO) {
  await page.goto(`./experimental/?demo&agora=${agora}`)
  await expect(page.getByRole('heading', { level: 1, name: /Venha conhecer o estúdio/ })).toBeVisible()
}

function diaNaFaixa(page: Page, nome: RegExp) {
  return page.getByRole('group', { name: 'Escolha o dia' }).getByRole('button', { name: nome })
}

test.describe('página pública de aula experimental', () => {
  test('mostra o espaço, os horários com vaga e monta o pedido para o WhatsApp, sem gravar nada', async ({ page }) => {
    const pedidos: string[] = []
    page.on('request', (r) => {
      if (r.method() !== 'GET') pedidos.push(`${r.method()} ${r.url()}`)
    })
    await abrirExperimental(page)
    await expect(page.locator('.selo-demo')).toHaveText('Demonstração')
    await expect(page.getByRole('img', { name: /Sala clara/ })).toBeVisible()
    await expect(page.locator('.foto img')).toHaveCount(5)
    // sexta, 10h: o primeiro dia é hoje e o horário das 11h (em 1 hora) não aparece
    await expect(diaNaFaixa(page, /9 de outubro, hoje/)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.horario', { hasText: '11h' })).toHaveCount(0)
    const whats = page.getByRole('link', { name: /WhatsApp/ })
    await expect(whats).toHaveText(/Falar no WhatsApp/)
    const primeiro = page.locator('.horario').first()
    const hora = (await primeiro.locator('.opcao-aula-hora').textContent()) ?? ''
    await primeiro.click()
    await expect(primeiro).toHaveAttribute('aria-checked', 'true')
    await expect(whats).toHaveText(`Pedir hoje, ${hora}, no WhatsApp`)
    const href = (await whats.getAttribute('href')) ?? ''
    expect(href).toMatch(/^https:\/\/wa\.me\/5511900000000\?text=/)
    expect(decodeURIComponent(href.split('text=')[1] ?? '')).toContain(`aula experimental: sexta, 9 de outubro, às ${hora}`)
    await expect(page.getByText('Av. Dr. Thomáz Alves, 148, sala 2, Centro, Campinas/SP')).toBeVisible()
    expect(pedidos).toEqual([])
  })

  test('a vaga aberta por um aviso de falta aparece na página', async ({ page }) => {
    await abrirExperimental(page)
    await diaNaFaixa(page, /13 de outubro/).click()
    const dezoito = page.locator('.horario', { hasText: '18h' })
    const antes = (await dezoito.count()) ? Number(((await dezoito.locator('.lista-item-sub').textContent()) ?? '0').replace(/\D/g, '')) : 0

    await abrirApp(page)
    await page.getByRole('button', { name: 'Explorar como aluno' }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: /Beatriz Barbosa/ }).click()
    await page.locator('#conteudo .lista .lista-item', { hasText: '13/10' }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Avisar que não vou' }).click()
    await expect(aviso(page, /Falta avisada/)).toBeVisible()

    await abrirExperimental(page)
    await diaNaFaixa(page, /13 de outubro/).click()
    await expect(dezoito.locator('.lista-item-sub')).toHaveText(`${antes + 1} ${antes + 1 === 1 ? 'vaga' : 'vagas'}`)
  })

  test('em Mais, a equipe vê e passa adiante o link da página', async ({ page, context, browserName }) => {
    await entrarComoAdministracao(page)
    await irPara(page, '#/mais')
    const secao = page.locator('section.secao', { has: page.getByRole('heading', { name: 'Página de aula experimental' }) })
    await expect(secao).toContainText('/pilates-central-web/experimental/')
    await expect(secao.getByRole('link', { name: 'Ver a página' })).toHaveAttribute('href', /\/experimental\/$/)
    const botao = secao.getByRole('button', { name: /^(Compartilhar|Copiar link)$/ })
    await expect(botao).toBeVisible()
    if (browserName === 'chromium' && (await botao.textContent())?.includes('Copiar')) {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await botao.click()
      await expect(aviso(page, /Link copiado/)).toBeVisible()
      expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/pilates-central-web\/experimental\/$/)
    }
  })

  test('aviso de privacidade em português simples, com o caminho de volta', async ({ page }) => {
    await page.goto('./privacidade/')
    await expect(page.getByRole('heading', { level: 1, name: 'Aviso de privacidade' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Os seus direitos' })).toBeVisible()
    await expect(page.getByText(/sem Google Analytics/)).toBeVisible()
    await page.getByRole('link', { name: 'Abrir o app', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('A agenda do estúdio')
  })
})

test.describe('LGPD e acesso do aluno na ficha (administração)', () => {
  test('baixa os dados do aluno num arquivo e exclui o cadastro com confirmação', async ({ page }) => {
    await entrarComoAdministracao(page)
    await irPara(page, '#/alunos/a-10')
    await expect(page.getByRole('heading', { level: 1, name: 'Ana Almeida' })).toBeVisible()
    const baixando = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar os dados do aluno' }).click()
    const arquivo = await baixando
    expect(arquivo.suggestedFilename()).toBe('dados-ana-almeida-2026-10-09.json')
    const dados = JSON.parse(readFileSync((await arquivo.path()) ?? '', 'utf8')) as {
      cadastro: { nome: string; telefone: string }
      turmasFixas: unknown[]
      presencas: { marcacao: string }[]
      pagamentos: unknown[]
      mensalidade?: unknown
    }
    expect(dados.cadastro.nome).toBe('Ana Almeida')
    expect(dados.turmasFixas.length).toBeGreaterThan(0)
    expect(dados.presencas.filter((p) => p.marcacao === 'faltou').length).toBeGreaterThanOrEqual(3)
    expect(dados.pagamentos.length).toBeGreaterThan(0)
    expect(dados.mensalidade).toBeTruthy()

    await page.getByRole('button', { name: 'Excluir o cadastro' }).click()
    await esperarFolhaParada(page)
    await expect(folha(page)).toContainText('Não dá para desfazer.')
    await folha(page).getByRole('button', { name: 'Excluir de vez' }).click()
    await expect(aviso(page, 'Cadastro de Ana excluído.')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Aluno não encontrado' })).toBeVisible()
    await page.getByRole('button', { name: 'Alunos' }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Alunos' })).toBeVisible()
    await expect(page.getByText('Ana Almeida')).toHaveCount(0)
  })

  test('libera e tira o app do aluno, com o convite pronto para o WhatsApp', async ({ page }) => {
    await entrarComoAdministracao(page)
    await irPara(page, '#/alunos/a-12')
    const secao = page.locator('section.secao', { has: page.getByRole('heading', { name: 'App do aluno' }) })
    await secao.getByRole('button', { name: /Liberar o app para/ }).click()
    await expect(aviso(page, /Acesso de .* liberado/)).toBeVisible()
    await expect(secao).toContainText('Acesso liberado em 9/10.')
    const convite = secao.getByRole('link', { name: 'Mandar o convite pelo WhatsApp' })
    const texto = decodeURIComponent(((await convite.getAttribute('href')) ?? '').split('text=')[1] ?? '')
    expect(texto).toContain('aluno12@example.com')
    expect(texto).toContain('Primeiro acesso? Criar conta')
    await secao.getByRole('button', { name: 'Tirar o acesso' }).click()
    await expect(secao.getByRole('button', { name: /Liberar o app para/ })).toBeVisible()
  })
})
