// Ponta a ponta com o SDK do Firebase de verdade contra os emuladores (auth e Firestore,
// projeto demo-pilates), nos dois motores. Roda com EMULADOR=1 (ver docs/firebase.md); sem isso
// os testes ficam de fora. As regras publicadas valem aqui também: o emulador carrega
// firestore.rules.
import type { Page, TestInfo } from '@playwright/test'
import { aba, aviso, esperarFolhaParada, esperarParado, folha, irPara, irParaAba } from './apoio'
import { expect, test } from './base'
import { CONTAS, convidadoDoMotor, FIRESTORE, lerDocumento, linkDeConfirmacao, SENHA } from './firebase/contas'

test.skip(!process.env.EMULADOR, 'precisa dos emuladores do Firebase (EMULADOR=1)')

// A política de segurança do site publicado só libera o Firebase de verdade, e o emulador é
// http://127.0.0.1. No Chromium, bypassCSP resolve. No WebKit ele não vale para a <meta> da
// política em todas as páginas, então ali a <meta> sai do HTML servido (no Chromium isso não
// serve: a página entregue pelo teste perde o endereço local e o navegador bloqueia o emulador).
test.use({ bypassCSP: true })

const ehPaginaDoSite = (url: URL) => url.pathname.startsWith('/pilates-central-web/') && url.pathname.endsWith('/')

test.beforeEach(async ({ context, browserName }) => {
  if (browserName !== 'webkit') return
  await context.route(ehPaginaDoSite, async (rota) => {
    const resposta = await rota.fetch()
    const html = (await resposta.text()).replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '')
    await rota.fulfill({ response: resposta, body: html })
  })
})

async function abrirLogin(page: Page) {
  await page.goto('./?emulador=1')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Que bom ver você.' })).toBeVisible()
}

async function entrarComo(page: Page, email: string) {
  await abrirLogin(page)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(SENHA)
  await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click()
}

function alunoDoMotor(info: TestInfo) {
  return info.project.name === 'webkit' ? CONTAS.alunoWebkit : CONTAS.alunoChromium
}

test.describe('Firebase (emuladores)', () => {
  test('a responsável entra com e-mail e senha e vê o financeiro', async ({ page }) => {
    await entrarComo(page, CONTAS.responsavel.email)
    await expect(page.getByRole('heading', { level: 1, name: /Helena/ })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.selo-demo')).toHaveCount(0)
    await irParaAba(page, 'Financeiro')
    await expect(page.locator('.resumo-mes')).toContainText(/R\$/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /^Em aberto/ })).toBeVisible()
  })

  test('o professor entra e não tem financeiro, nem pelo endereço', async ({ page }) => {
    const pedidos: string[] = []
    page.on('request', (r) => {
      if (r.url().startsWith(FIRESTORE)) pedidos.push(r.url())
    })
    await entrarComo(page, CONTAS.professor.email)
    await expect(page.getByRole('heading', { level: 1, name: /Camila/ })).toBeVisible({ timeout: 15_000 })
    await expect(aba(page, 'Agenda')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Financeiro' })).toHaveCount(0)
    await irPara(page, '#/financeiro')
    await expect(aba(page, 'Hoje')).toHaveAttribute('aria-current', 'page')
    // o app do professor nem pede os dados financeiros
    expect(pedidos.filter((u) => /pagamentos|financeiroDosAlunos/.test(u))).toEqual([])
    await irParaAba(page, 'Alunos')
    await expect(page.locator('.lista-item').first()).toBeVisible()
  })

  test('o aluno avisa a falta, ganha a reposição e remarca numa aula com vaga', async ({ page }, info) => {
    const aluno = alunoDoMotor(info)
    await entrarComo(page, aluno.email)
    await expect(page.getByRole('heading', { level: 1, name: /^Olá, / })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Sua próxima aula')).toBeVisible()

    // a primeira aula da lista que ainda dá para avisar
    const linhas = page.locator('#conteudo .lista .lista-item')
    const total = await linhas.count()
    let avisada: string | null = null
    for (let i = 0; i < total && !avisada; i++) {
      const linha = linhas.nth(i)
      if (!(await linha.textContent())?.includes('Confirmada')) continue
      await linha.click()
      await esperarFolhaParada(page)
      const botao = folha(page).getByRole('button', { name: 'Avisar que não vou' })
      if (await botao.isVisible()) {
        avisada = (await folha(page).getByRole('heading').first().textContent()) ?? ''
        await botao.click()
      } else {
        await page.keyboard.press('Escape')
        await expect(folha(page)).toHaveCount(0)
      }
    }
    expect(avisada, 'nenhuma aula no prazo para avisar').toBeTruthy()
    await expect(aviso(page, /Falta avisada/)).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.pilula', { hasText: 'Você avisou' }).first()).toBeVisible()

    // reposição: escolhe a primeira aula com vaga e confirma
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Reposição' }).click()
    await esperarParado(page, '.tela-quadro')
    await expect(page.getByRole('heading', { name: 'Escolha onde repor' })).toBeVisible()
    await page.locator('.opcao-aula').first().click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Confirmar reposição' }).click()
    await expect(aviso(page, /Reposição marcada/)).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.pilula', { hasText: 'Reposição' }).first()).toBeVisible()

    // conferido no banco (sem regras): o crédito do aluno foi usado numa aula
    const lista = await fetch(`${FIRESTORE}/v1/projects/demo-pilates/databases/(default)/documents:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'creditos' }],
          where: { fieldFilter: { field: { fieldPath: 'alunoId' }, op: 'EQUAL', value: { stringValue: aluno.alunoId } } },
        },
      }),
    })
    const creditos = ((await lista.json()) as { document?: { fields: Record<string, unknown> } }[]).filter((r) => r.document)
    expect(creditos.some((c) => 'usadoEm' in (c.document?.fields ?? {}))).toBe(true)
  })

  test('a página pública lista os horários com vaga e não grava nada', async ({ page }) => {
    const gravacoes: string[] = []
    page.on('request', (r) => {
      if (r.url().startsWith(FIRESTORE) && r.method() !== 'GET') gravacoes.push(`${r.method()} ${r.url()}`)
    })
    await page.goto('./experimental/?emulador=1')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const horarios = page.locator('.horario')
    await expect(horarios.first()).toBeVisible({ timeout: 15_000 })
    await horarios.first().click()
    const whats = page.getByRole('link', { name: /WhatsApp/ }).first()
    await expect(whats).toHaveAttribute('href', /^https:\/\/wa\.me\/5511900000000\?text=/)
    const texto = decodeURIComponent((await whats.getAttribute('href'))?.split('text=')[1] ?? '')
    expect(texto).toMatch(/aula experimental/)
    expect(gravacoes).toEqual([])
    expect(await lerDocumento('publico/estudio')).not.toBeNull()
  })

  test('professor convidado cria a conta, confirma o e-mail e entra', async ({ page }, info) => {
    const convidado = convidadoDoMotor(info.project.name)
    await abrirLogin(page)
    await page.getByRole('button', { name: 'Primeiro acesso? Criar conta' }).click()
    await page.getByLabel('E-mail').fill(convidado.email)
    await page.getByLabel('Senha', { exact: true }).fill(SENHA)
    await page.locator('form').getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByRole('heading', { name: 'Falta só um passo.' })).toBeVisible({ timeout: 15_000 })
    // sem confirmar, o app não deixa passar
    await page.getByRole('button', { name: 'Já confirmei' }).click()
    await expect(page.getByText(/Ainda não aparece como confirmado/)).toBeVisible()
    // o link que o emulador "mandou" por e-mail
    const resposta = await page.request.get(await linkDeConfirmacao(convidado.email))
    expect(resposta.ok()).toBe(true)
    await page.getByRole('button', { name: 'Já confirmei' }).click()
    await expect(page.getByRole('heading', { level: 1, name: /Convidado/ })).toBeVisible({ timeout: 15_000 })
    await irParaAba(page, 'Mais')
    await expect(page.locator('.perfil')).toContainText('Professor')
    // o convite foi usado e sumiu
    expect(await lerDocumento(`convites/${convidado.email}`)).toBeNull()
  })
})
