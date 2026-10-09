import { expect, test } from './base'
import type { Page } from '@playwright/test'
import { aba, aviso, entrarComoAdministracao, entrarComoProfessor, esperarFolhaParada, esperarParado, folha, irPara, irParaAba } from './apoio'

const titulo = (page: Page) => page.getByRole('heading', { level: 1 })
const linhaDoAluno = (page: Page, nome: string) => page.locator('[data-aluno]', { hasText: nome })

async function abrirAlunos(page: Page) {
  await entrarComoAdministracao(page)
  await irParaAba(page, 'Alunos')
  await expect(titulo(page)).toHaveText('Alunos')
}

async function abrirFicha(page: Page, nome: string) {
  await linhaDoAluno(page, nome).click()
  await expect(titulo(page)).toHaveText(nome)
  await esperarParado(page, '.tela-quadro')
}

test.describe('lista de alunos', () => {
  test('busca sem acento, filtra por unidade e situação, e destaca quem sumiu', async ({ page }) => {
    await abrirAlunos(page)
    await expect(page.getByText('39 alunos')).toBeVisible()
    // ausências seguidas: destaque discreto na própria linha
    await expect(linhaDoAluno(page, 'Ana Almeida').getByText('4 ausências seguidas')).toBeVisible()

    await page.getByRole('searchbox', { name: 'Buscar aluno' }).fill('natalia')
    await expect(page.locator('[data-aluno]')).toHaveCount(1)
    await expect(linhaDoAluno(page, 'Natália Pereira')).toBeVisible()
    // pelo final do telefone
    await page.getByRole('searchbox', { name: 'Buscar aluno' }).fill('0047')
    await expect(page.locator('[data-aluno]')).toHaveText([/Roberto Couto/])
    await page.getByRole('searchbox', { name: 'Buscar aluno' }).fill('')

    await page.getByRole('radio', { name: 'Jardim' }).click()
    await expect(page.getByText('11 alunos')).toBeVisible()
    await page.getByRole('radio', { name: 'Todas' }).click()
    await page.getByRole('radio', { name: 'Pausados' }).click()
    await expect(page.locator('[data-aluno]')).toHaveCount(2)
    await page.getByRole('radio', { name: 'Arquivados' }).click()
    await expect(page.locator('[data-aluno]')).toHaveText([/Lívia Fontes/])
  })

  test('voltar da ficha mantém a busca e a lista volta para onde estava', async ({ page }) => {
    await abrirAlunos(page)
    // rola até o fim da lista, abre um aluno lá embaixo e volta
    await linhaDoAluno(page, 'Yara Brito').scrollIntoViewIfNeeded()
    const antes = await page.evaluate(() => window.scrollY)
    expect(antes).toBeGreaterThan(1000)
    await abrirFicha(page, 'Yara Brito')
    await page.locator('.voltar').click()
    await expect(titulo(page)).toHaveText('Alunos')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(antes - 60)
    await expect(linhaDoAluno(page, 'Yara Brito')).toBeInViewport()

    await page.getByRole('searchbox', { name: 'Buscar aluno' }).fill('ana')
    await abrirFicha(page, 'Ana Almeida')
    await page.goBack()
    await expect(titulo(page)).toHaveText('Alunos')
    await expect(page.getByRole('searchbox', { name: 'Buscar aluno' })).toHaveValue('ana')
  })
})

test.describe('ficha do aluno', () => {
  test('plano, turmas, frequência do mês, reposições, mensalidade e WhatsApp', async ({ page }) => {
    await abrirAlunos(page)
    await abrirFicha(page, 'Ana Almeida')
    await expect(page.getByText('3x por semana')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Segunda, 18h com Camila' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Frequência de outubro' })).toBeVisible()
    await expect(page.locator('.numero-card', { hasText: 'faltas' }).locator('.so-leitor')).toHaveText('3')
    await expect(page.getByText('Faltou em 14/09')).toBeVisible()
    await expect(page.getByText('R$ 360,00 por mês')).toBeVisible()
    const whatsapp = page.getByRole('link', { name: 'WhatsApp' })
    await expect(whatsapp).toHaveAttribute('href', 'https://wa.me/5511900000010')
    // mês passado
    await page.getByRole('radio', { name: 'Mês passado' }).click()
    await expect(page.getByRole('heading', { name: 'Frequência de setembro' })).toBeVisible()
    await expect(page.locator('.numero-card', { hasText: 'presenças' }).locator('.so-leitor')).not.toHaveText('0')
  })

  test('encaixar a reposição a partir do crédito, com desfazer', async ({ page }) => {
    await abrirAlunos(page)
    await abrirFicha(page, 'Ana Almeida')
    const credito = page.locator('.lista-item', { hasText: 'Faltou em 14/09' })
    await credito.getByRole('button', { name: 'Encaixar' }).click()
    await esperarFolhaParada(page)
    const opcoes = folha(page).getByRole('radio')
    expect(await opcoes.count()).toBeGreaterThan(0)
    await opcoes.first().click()
    await folha(page).getByRole('button', { name: /^Encaixar / }).click()
    await expect(aviso(page, /Reposição de Ana marcada/)).toBeVisible()
    await expect(folha(page)).toHaveCount(0)
    await expect(page.getByText('Reposição marcada', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.locator('.lista-item', { hasText: 'Faltou em 14/09' }).getByRole('button', { name: 'Encaixar' })).toBeVisible()
  })
})

test.describe('cadastro de aluno', () => {
  test('valida em português, cadastra, avisa do plano e coloca na turma', async ({ page }) => {
    await abrirAlunos(page)
    await page.getByRole('button', { name: 'Novo aluno' }).click()
    await expect(titulo(page)).toHaveText('Novo aluno')
    await esperarParado(page, '.tela-quadro')
    // valor do plano sugerido pelo que o estúdio mais cobra no 2x
    await expect(page.getByRole('textbox', { name: 'Valor por mês (R$)' })).toHaveValue('280,00')

    await page.getByRole('button', { name: 'Cadastrar aluno' }).click()
    await expect(page.getByText('Escreva o nome do aluno.')).toBeVisible()
    await expect(page.getByText('Use DDD e número, por exemplo (19) 90000-0000.')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Nome e sobrenome' })).toBeFocused()

    await page.getByRole('textbox', { name: 'Nome e sobrenome' }).fill('Joana Teste')
    await page.getByRole('textbox', { name: 'Telefone (WhatsApp)' }).fill('(11) 90000-0099')
    await page.getByRole('radio', { name: '3x' }).click()
    await expect(page.getByRole('textbox', { name: 'Valor por mês (R$)' })).toHaveValue('360,00')
    await page.getByRole('button', { name: 'Cadastrar aluno' }).click()
    await expect(aviso(page, /Cadastro de Joana feito/)).toBeVisible()
    await expect(titulo(page)).toHaveText('Joana Teste')
    await expect(page.getByText('Plano de 3x por semana, mas não está em nenhuma turma.')).toBeVisible()

    await page.getByRole('button', { name: 'Colocar em turma' }).click()
    await esperarFolhaParada(page)
    // a turma de sexta 18h está cheia
    await expect(folha(page).locator('.lista-item', { hasText: 'Sexta, 18h' }).getByRole('button', { name: 'Cheia' })).toBeDisabled()
    await folha(page).locator('.lista-item', { hasText: 'Segunda, 8h' }).getByRole('button', { name: 'Colocar' }).click()
    await expect(aviso(page, /Joana entrou na turma de segunda, 8h/)).toBeVisible()
    await expect(page.getByText('Plano de 3x por semana, mas está em 1 turma.')).toBeVisible()
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.getByText('Plano de 3x por semana, mas não está em nenhuma turma.')).toBeVisible()
  })

  test('edita, pausa (com confirmação e desfazer) e arquiva tirando das turmas', async ({ page }) => {
    await abrirAlunos(page)
    await abrirFicha(page, 'Carla Cardoso')
    await page.getByRole('button', { name: 'Editar cadastro' }).click()
    await expect(page.getByRole('textbox', { name: 'Telefone (WhatsApp)' })).toHaveValue('(11) 90000-0012')
    await page.getByRole('textbox', { name: 'Observação (opcional)' }).fill('Prefere a turma da manhã.')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(aviso(page, 'Cadastro atualizado.')).toBeVisible()
    await expect(titulo(page)).toHaveText('Carla Cardoso')
    await expect(page.getByText('Prefere a turma da manhã.')).toBeVisible()

    await page.getByRole('button', { name: 'Pausar (férias, viagem)' }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Pausar', exact: true }).click()
    await expect(aviso(page, /Cadastro de Carla pausado/)).toBeVisible()
    await expect(page.locator('.cabecalho-de-tela').getByText('Pausado', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.locator('.cabecalho-de-tela').getByText('Pausado', { exact: true })).toHaveCount(0)

    await page.getByRole('button', { name: 'Arquivar' }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Arquivar', exact: true }).click()
    await expect(aviso(page, /Cadastro de Carla arquivado: saiu das turmas/)).toBeVisible()
    await expect(page.locator('.secao', { has: page.getByRole('heading', { name: 'Plano e turmas fixas' }) }).locator('ul.lista > li')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Voltar para ativo' })).toBeVisible()
  })
})

test.describe('professor', () => {
  test('vê alunos sem valores, sem cadastro e sem a aba Financeiro', async ({ page }) => {
    await entrarComoProfessor(page, 'Camila Nunes')
    await expect(aba(page, 'Financeiro')).toHaveCount(0)
    await irParaAba(page, 'Alunos')
    await expect(page.getByRole('button', { name: 'Novo aluno' })).toHaveCount(0)
    await abrirFicha(page, 'Ana Almeida')
    await expect(page.getByText('3x por semana')).toBeVisible()
    await expect(page.getByText(/por mês/)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Mensalidade' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Editar cadastro' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Colocar em turma' })).toHaveCount(0)
    // reposição o professor encaixa
    await expect(page.locator('.lista-item', { hasText: 'Faltou em 14/09' }).getByRole('button', { name: 'Encaixar' })).toBeVisible()
    // link direto para o financeiro cai no Hoje; formulário de aluno diz que não pode
    await irPara(page, '#/financeiro')
    await expect(titulo(page)).toHaveText(/Bom dia, Camila/)
    await irPara(page, '#/alunos/novo')
    await expect(page.getByText('Só a administração cadastra e edita alunos.')).toBeVisible()
  })
})
