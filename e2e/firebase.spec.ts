// Ponta a ponta com o SDK do Firebase de verdade contra os emuladores (auth e Firestore,
// projeto demo-pilates), nos dois motores. Roda com EMULADOR=1 (ver docs/firebase.md); sem isso
// os testes ficam de fora. As regras publicadas valem aqui também: o emulador carrega
// firestore.rules.
import type { TestInfo } from '@playwright/test'
import { aba, aviso, esperarFolhaParada, esperarParado, folha, irPara, irParaAba } from './apoio'
import { expect, test } from './base'
import { AUTH, CONTAS, convidadoDoMotor, EXCLUIDO_DO_MOTOR, FIRESTORE, lerDocumento, linkDeConfirmacao, projetoVazio, SENHA } from './firebase/contas'
import { abrirLogin, entrarComo, liberarEnderecoLocal } from './firebase/navegar'

/** Espera um documento do emulador ficar como o teste quer (as gravações são assíncronas). */
async function esperarNoBanco(caminho: string, condicao: (doc: Record<string, unknown> | null) => boolean) {
  await expect.poll(async () => condicao(await lerDocumento(caminho)), { timeout: 15_000 }).toBe(true)
}

const campo = (doc: Record<string, unknown> | null, nome: string) =>
  (doc?.fields as Record<string, { stringValue?: string; integerValue?: string }> | undefined)?.[nome]


test.skip(!process.env.EMULADOR, 'precisa dos emuladores do Firebase (EMULADOR=1)')

// No Chromium, bypassCSP deixa o app falar com o emulador; no WebKit a <meta> da política sai
// do HTML servido (ver liberarEnderecoLocal)
test.use({ bypassCSP: true })

test.beforeEach(({ context, browserName }) => liberarEnderecoLocal(context, browserName))

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

  test('o professor registra quem vem experimentar pelo Hoje, e o registro vai para o banco em texto', async ({ page }, info) => {
    await entrarComo(page, CONTAS.professor.email)
    await expect(page.getByRole('heading', { level: 1, name: /Camila/ })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Registrar aula experimental' }).click()
    await esperarFolhaParada(page)
    await folha(page).locator('.opcao-aula').first().click()
    const nome = `Visita ${info.project.name}`
    // um telefone por motor: os dois registram na mesma aula do mesmo emulador, e a mesma pessoa
    // (pelo telefone) não entra duas vezes na mesma aula
    const telefone = info.project.name === 'webkit' ? '11900000092' : '11900000091'
    await folha(page).getByRole('textbox', { name: 'Nome' }).fill(nome)
    await folha(page).getByRole('textbox', { name: 'WhatsApp' }).fill(telefone)
    await folha(page).getByRole('button', { name: /^Registrar / }).click()
    await expect(aviso(page, /vem experimentar/)).toBeVisible({ timeout: 15_000 })
    await expect(folha(page)).toHaveCount(0)

    // no banco (sem regras): o registro da aula leva a pessoa numa linha 'Nome|telefone'
    const registrada = async () => {
      const r = await fetch(`${FIRESTORE}/v1/projects/demo-pilates/databases/(default)/documents:runQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'registros' }] } }),
      })
      const docs = ((await r.json()) as { document?: { fields: Record<string, unknown> } }[]).filter((d) => d.document)
      return docs.some((d) => JSON.stringify(d.document?.fields?.experimentais ?? {}).includes(`"${nome}|55${telefone}"`))
    }
    await expect.poll(registrada, { timeout: 15_000 }).toBe(true)
  })

  test('o aluno avisa a falta, ganha a reposição e remarca numa aula com vaga', async ({ page }, info) => {
    const aluno = alunoDoMotor(info)
    await entrarComo(page, aluno.email)
    await expect(page.getByRole('heading', { level: 1, name: /^Olá, / })).toBeVisible({ timeout: 15_000 })
    // o emulador usa o relógio de verdade: no horário da aula do aluno o destaque diz "Aula agora"
    await expect(page.getByText(/^(Sua próxima aula|Aula agora)$/)).toBeVisible()

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

  test('a administração grava no banco: estúdio, app do aluno, convite, reposição, pagamento e exclusão', async ({ page }, info) => {
    test.setTimeout(120_000)
    const webkit = info.project.name === 'webkit'
    const motor = info.project.name
    await entrarComo(page, CONTAS.responsavel.email)
    await expect(page.getByRole('heading', { level: 1, name: /Helena/ })).toBeVisible({ timeout: 15_000 })

    // estúdio: o nome vai para a configuração e para a página pública
    await irPara(page, '#/mais/estudio')
    await page.getByRole('textbox', { name: 'Nome do estúdio' }).fill(`Estúdio ${motor}`)
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(aviso(page, 'Dados do estúdio salvos.')).toBeVisible()
    await esperarNoBanco('configuracao/estudio', (d) => campo(d, 'nomeEstudio')?.stringValue === `Estúdio ${motor}`)
    await esperarNoBanco('publico/estudio', (d) => campo(d, 'nomeEstudio')?.stringValue === `Estúdio ${motor}`)

    // app do aluno: o convite vai para o e-mail e o portal nasce sem os colegas
    const aluno = webkit ? 'a-13' : 'a-12'
    await irPara(page, `#/alunos/${aluno}`)
    await page.getByRole('button', { name: /Liberar o app para/ }).click()
    await expect(aviso(page, /Acesso de .* liberado/)).toBeVisible()
    // o convite nasce com prazo (7 dias, a validade padrão), que as regras conferem no aceite
    await esperarNoBanco(
      `convites/aluno${aluno.slice(2)}@example.com`,
      (d) => campo(d, 'papel')?.stringValue === 'aluno' && Number(campo(d, 'expiraEm')?.integerValue) > Date.now() + 6 * 86_400_000,
    )
    await esperarNoBanco(`portal/${aluno}`, (d) => d !== null && !JSON.stringify(d).includes('aluno1'))

    // convite de professor
    await irPara(page, '#/mais/equipe')
    await page.getByRole('button', { name: 'Convidar pessoa' }).click()
    await esperarParado(page, '.tela-quadro')
    await page.getByRole('textbox', { name: 'Nome' }).fill(`Professor ${motor}`)
    await page.getByRole('textbox', { name: 'E-mail' }).fill(`prof-${motor}@example.com`)
    await page.getByRole('button', { name: 'Centro' }).click()
    await page.getByRole('button', { name: 'Registrar convite' }).click()
    await expect(aviso(page, /Convite registrado/)).toBeVisible()
    await esperarNoBanco(`convites/prof-${motor}@example.com`, (d) => campo(d, 'papel')?.stringValue === 'professor')

    // reposição encaixada pela equipe: registro, crédito e vaga numa transação
    await irPara(page, '#/alunos/reposicoes')
    // o emulador usa o relógio de verdade: o primeiro da lista vence hoje e, à noite, já não
    // tem aula com vaga; o último vale por mais tempo
    const credito = page.locator('[data-credito]').last()
    const creditoId = (await credito.getAttribute('data-credito')) ?? ''
    await credito.getByRole('button', { name: 'Encaixar' }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('radio').first().click()
    await folha(page).getByRole('button', { name: /^Encaixar/ }).click()
    await expect(aviso(page, /^Reposição de .* marcada/)).toBeVisible()
    await esperarNoBanco(`creditos/${creditoId}`, (d) => JSON.stringify(d).includes('usadoEm'))

    // pagamento
    await irParaAba(page, 'Financeiro')
    await page.getByRole('button', { name: 'Lançar pagamento', exact: true }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('searchbox', { name: 'Buscar aluno' }).fill('eduardo')
    await folha(page).getByRole('button', { name: /Eduardo Freitas/ }).click()
    await folha(page).getByRole('textbox', { name: 'Valor (R$)' }).fill('10')
    await folha(page).getByRole('button', { name: /^Lançar R\$\s10,00$/ }).click()
    await expect(aviso(page, /R\$\s10,00 de Eduardo lançado/)).toBeVisible()

    // exclusão a pedido do aluno (LGPD)
    const excluido = EXCLUIDO_DO_MOTOR[webkit ? 'webkit' : 'chromium']
    await irPara(page, `#/alunos/${excluido}`)
    await page.getByRole('button', { name: 'Excluir o cadastro' }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Excluir de vez' }).click()
    await expect(aviso(page, /Cadastro de .* excluído/)).toBeVisible()
    await esperarNoBanco(`alunos/${excluido}`, (d) => d === null)
    await esperarNoBanco(`financeiroDosAlunos/${excluido}`, (d) => d === null)
    await esperarNoBanco(`acessos/uid-${excluido}`, (d) => d === null)
  })

  test('senha nova e login errado respondem igual, tenha ou não conta', async ({ page }) => {
    await abrirLogin(page)
    await page.getByLabel('E-mail').fill('ninguem@example.com')
    await page.getByLabel('Senha', { exact: true }).fill('qualquer-senha')
    await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha não conferem.')
    await page.getByLabel('E-mail').fill(CONTAS.professor.email)
    await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha não conferem.')

    for (const email of ['ninguem@example.com', CONTAS.professor.email]) {
      await page.getByRole('button', { name: 'Esqueci a senha' }).click()
      await esperarFolhaParada(page)
      await folha(page).getByLabel('E-mail').fill(email)
      await folha(page).getByRole('button', { name: 'Enviar o link' }).click()
      await expect(folha(page).getByRole('status')).toHaveText(/Se houver uma conta com este e-mail, enviamos um link/)
      await page.keyboard.press('Escape')
      await expect(folha(page)).toHaveCount(0)
    }
    // o emulador "mandou" o e-mail só para quem tem conta
    const r = await fetch(`${AUTH}/emulator/v1/projects/demo-pilates/oobCodes`)
    const { oobCodes } = (await r.json()) as { oobCodes: { email: string; requestType: string }[] }
    expect(oobCodes.some((c) => c.email === CONTAS.professor.email && c.requestType === 'PASSWORD_RESET')).toBe(true)
    expect(oobCodes.some((c) => c.email === 'ninguem@example.com')).toBe(false)
  })

  test('primeiro acesso: só o e-mail combinado nas regras reivindica, e o estúdio começa vazio', async ({ page }, info) => {
    test.setTimeout(90_000)
    const projeto = projetoVazio(info.project.name)

    // O emulador de login guarda as contas num projeto só (o SDK não manda o projeto no login);
    // o Firestore separa os dados por projeto. Rodando os dois motores no mesmo emulador, a conta
    // já pode existir: aí entra em vez de criar.
    async function criarEConfirmar(email: string, destino = 'Vamos começar.') {
      await page.goto(`./?emulador=${projeto}`)
      await page.getByRole('button', { name: 'Entrar', exact: true }).click()
      await page.getByRole('button', { name: 'Primeiro acesso? Criar conta' }).click()
      await page.getByLabel('E-mail').fill(email)
      await page.getByLabel('Senha', { exact: true }).fill(SENHA)
      await page.locator('form').getByRole('button', { name: 'Criar conta' }).click()
      const confirmar = page.getByRole('heading', { name: 'Falta só um passo.' })
      const comecar = page.getByRole('heading', { name: destino })
      const erro = page.getByRole('alert')
      await expect(confirmar.or(erro)).toBeVisible({ timeout: 15_000 })
      if (await erro.isVisible()) {
        await page.getByRole('button', { name: 'Já tenho conta' }).click()
        await page.getByLabel('E-mail').fill(email)
        await page.getByLabel('Senha', { exact: true }).fill(SENHA)
        await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click()
        await expect(confirmar.or(comecar)).toBeVisible({ timeout: 15_000 })
      }
      if (await confirmar.isVisible()) {
        expect((await page.request.get(await linkDeConfirmacao(email))).ok()).toBe(true)
        await page.getByRole('button', { name: 'Já confirmei' }).click()
      }
      await expect(comecar).toBeVisible({ timeout: 15_000 })
    }

    // outra conta chega primeiro: nem fica sabendo que o estúdio está sem dono (as regras não
    // deixam ler a posse) e cai na mesma tela de quem não tem convite
    await criarEConfirmar('apressada@example.com', 'Ainda não dá para entrar.')
    await expect(page.getByText('Este e-mail ainda não tem convite.')).toBeVisible()
    expect(await lerDocumento('estudio/posse', projeto)).toBeNull()
    await page.getByRole('button', { name: 'Sair e entrar com outro e-mail' }).click()
    await expect(page.getByRole('heading', { name: 'Que bom ver você.' })).toBeVisible()

    // a conta combinada vira a responsável
    await criarEConfirmar('responsavel@example.com')
    await page.getByLabel('Seu nome').fill('Pessoa Responsável')
    await page.getByLabel('Nome do estúdio').fill('Estúdio Novo')
    await page.getByRole('button', { name: 'Começar' }).click()
    await expect(page.getByRole('heading', { level: 1, name: /Pessoa/ })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.topo-nome')).toHaveText('Estúdio Novo')
    await expect(page.getByText('Não tem aula marcada para hoje.')).toBeVisible()
    await irParaAba(page, 'Mais')
    await expect(page.locator('.perfil')).toContainText('Responsável')
    await expect(page.getByRole('button', { name: /Equipe/ })).toBeVisible()
    expect(await lerDocumento('estudio/posse', projeto)).not.toBeNull()
  })
})
