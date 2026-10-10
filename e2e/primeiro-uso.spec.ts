// O guia de primeiro uso (Mais, Montar o estúdio) na demonstração, onde ele é uma prévia: passa
// pelos cinco passos, monta a grade tocando nos horários e copiando um dia, confere a importação
// e chega ao resumo, sem gravar nada. O mesmo guia com o estúdio de verdade (gravando) está em
// e2e/comecando.spec.ts, com os emuladores.
import type { Page } from '@playwright/test'
import { aviso, entrarComoAdministracao, esperarFolhaParada, esperarParado, folha, irParaAba } from './apoio'
import { expect, test } from './base'

const titulo = (page: Page) => page.getByRole('heading', { level: 1 })
const celula = (page: Page, rotulo: string | RegExp) => page.getByRole('button', { name: rotulo })

async function continuar(page: Page, nome: string | RegExp = 'Continuar') {
  await page.getByRole('button', { name: nome }).click()
  await esperarParado(page, '.tela-quadro')
}

test.describe('montar o estúdio (prévia na demonstração)', () => {
  test('passa pelos cinco passos, monta a grade tocando e copiando um dia, e nada é gravado', async ({ page }) => {
    test.setTimeout(90_000)
    await entrarComoAdministracao(page)
    await irParaAba(page, 'Mais')
    await page.getByRole('button', { name: /Montar o estúdio/ }).click()
    await esperarParado(page, '.tela-quadro')

    // tela inteira para o guia: sem a barra de abas, com o progresso e a saída
    await expect(titulo(page)).toHaveText('O estúdio')
    await expect(page.getByText('Passo 1 de 5')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0)
    await expect(page.getByRole('progressbar', { name: 'Montar o estúdio' })).toHaveAttribute('aria-valuetext', 'Passo 1 de 5')
    await expect(page.getByText('Prévia: na demonstração o guia mostra cada passo, mas nada é gravado.')).toBeVisible()
    await page.getByLabel('Nome do estúdio').fill('Estúdio de Teste')
    await continuar(page)

    await expect(titulo(page)).toHaveText('Unidades')
    await expect(page.getByRole('list', { name: 'Unidades do estúdio' }).getByText('Centro', { exact: true })).toBeVisible()
    await page.getByLabel('Outra unidade').fill('Bosque')
    // o que ficou escrito vale ao continuar, sem precisar tocar em Adicionar
    await continuar(page)

    await expect(titulo(page)).toHaveText('Professores')
    await expect(page.getByRole('list', { name: 'Equipe' }).getByText('Helena Prado (você)')).toBeVisible()
    await page.getByLabel('Nome do professor').fill('Rita Alves')
    await page.getByLabel('E-mail').fill('rita@example.com')
    await page.getByRole('group', { name: 'Unidades' }).getByRole('button', { name: 'Bosque' }).click()
    await page.getByRole('button', { name: 'Adicionar professor' }).click()
    await expect(aviso(page, 'Rita Alves entrou na equipe. O convite você manda depois.')).toBeVisible()
    await expect(page.getByRole('list', { name: 'Equipe' }).locator('li', { hasText: 'Rita Alves' })).toContainText('convite a mandar')
    await continuar(page)

    await expect(titulo(page)).toHaveText('Turmas da semana')
    await page.getByRole('radiogroup', { name: 'Unidade' }).getByRole('radio', { name: 'Bosque' }).click()
    await expect(page.getByRole('radiogroup', { name: 'Quem dá a aula' }).getByRole('radio', { name: 'Rita' })).toHaveAttribute('aria-checked', 'true')
    await celula(page, 'Segunda, 7h: criar turma').click()
    await celula(page, 'Segunda, 8h: criar turma').click()
    await expect(celula(page, 'Segunda, 8h: turma nova com Rita')).toHaveAttribute('aria-pressed', 'true')
    // tocar de novo tira
    await celula(page, 'Segunda, 8h: turma nova com Rita').click()
    await expect(celula(page, 'Segunda, 8h: criar turma')).toBeVisible()
    // segunda igual a quarta e sexta
    await page.getByRole('group', { name: 'Para os dias' }).getByRole('button', { name: 'qua' }).click()
    await page.getByRole('group', { name: 'Para os dias' }).getByRole('button', { name: 'sex' }).click()
    await page.getByRole('button', { name: 'Copiar segunda para qua, sex' }).click()
    await expect(aviso(page, '2 turmas copiadas.')).toBeVisible()
    await expect(celula(page, 'Sexta, 7h: turma nova com Rita')).toBeVisible()
    // horário quebrado
    await page.getByLabel('Outro horário').fill('18:30')
    await page.getByRole('button', { name: 'Pôr na grade' }).click()
    await celula(page, 'Terça, 18h30: criar turma').click()
    // turma que já existe (na unidade Centro) não sai por aqui
    await page.getByRole('radiogroup', { name: 'Unidade' }).getByRole('radio', { name: 'Centro' }).click()
    await celula(page, /^Segunda, 7h: turma que já existe com/).click()
    await expect(aviso(page, 'A turma de segunda, 7h já existe. Para mudar, abra em Turmas.')).toBeVisible()
    await continuar(page, 'Salvar 4 turmas e continuar')

    await expect(titulo(page)).toHaveText('Alunos')
    await page.getByRole('button', { name: 'Importar de uma planilha' }).click()
    await page.getByLabel('Cole aqui as linhas da planilha').fill('Nome\tWhatsApp\nTeo Ramos\t(11) 90000-0095\nUma Lopes\t(11) 90000-0096')
    await page.getByRole('button', { name: 'Conferir' }).click()
    await page.getByRole('button', { name: 'Importar 2 alunos' }).click()
    await expect(page.getByText('2 alunos entrariam no cadastro; 2 estão sem mensalidade (preencha na ficha).')).toBeVisible()
    await continuar(page)

    await expect(titulo(page)).toHaveText('Prévia pronta.')
    const resumo = page.getByRole('definition')
    await expect(resumo.nth(0)).toContainText('Estúdio de Teste')
    await expect(resumo.nth(1)).toHaveText('3 unidades')
    await expect(resumo.nth(2)).toHaveText('4 professores, 1 convite para mandar')
    await expect(resumo.nth(3)).toContainText('turmas na semana')
    await page.getByRole('button', { name: 'Voltar para Mais' }).click()
    await esperarParado(page, '.tela-quadro')

    // de volta ao app: a barra de abas aparece, e a prévia não gravou nada
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible()
    await expect(page.locator('.topo-nome')).not.toHaveText('Estúdio de Teste')
    await page.getByRole('button', { name: /Unidades/ }).click()
    await expect(titulo(page)).toHaveText('Unidades')
    await expect(page.getByText('Bosque')).toHaveCount(0)
  })

  test('sair do guia no meio leva ao Hoje, e "Pular" anda sem gravar', async ({ page }) => {
    await entrarComoAdministracao(page)
    await irParaAba(page, 'Mais')
    await page.getByRole('button', { name: /Montar o estúdio/ }).click()
    await esperarParado(page, '.tela-quadro')
    await page.getByRole('button', { name: 'Pular este passo' }).click()
    await expect(titulo(page)).toHaveText('Unidades')
    await expect(page.getByText('Passo 2 de 5')).toBeVisible()
    await page.getByRole('button', { name: 'Voltar', exact: true }).click()
    await expect(titulo(page)).toHaveText('O estúdio')
    await page.getByRole('button', { name: 'Sair do guia' }).click()
    await expect(titulo(page)).toHaveText(/Helena/)
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible()
  })

  test('mudar a duração e os lugares das turmas novas numa folha', async ({ page }) => {
    await entrarComoAdministracao(page)
    await page.evaluate(() => {
      location.hash = '#/mais/montar/turmas'
    })
    await expect(titulo(page)).toHaveText('Turmas da semana')
    await expect(page.getByText('Cada turma nova: 50 min, 5 lugares.')).toBeVisible()
    await page.getByRole('button', { name: 'Mudar' }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Mais: lugares' }).click()
    await folha(page).getByRole('button', { name: 'Mais: duração' }).click()
    await folha(page).getByRole('button', { name: 'Pronto' }).click()
    await expect(page.getByText('Cada turma nova: 55 min, 6 lugares.')).toBeVisible()
  })
})
