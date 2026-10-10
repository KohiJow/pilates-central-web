import { aviso, entrarComoAdministracao, entrarComoProfessor, esperarFolhaParada, esperarParado, folha, irPara, irParaAba } from './apoio'
import { expect, test } from './base'

// O registro de alterações: quem lançou ou apagou pagamento, excluiu cadastro ou mexeu em acesso,
// e quando. Na demonstração fica no aparelho; no Firebase, na coleção auditoria (só a administração).

test.describe('registro de alterações', () => {
  test('o pagamento lançado e desfeito, a exclusão e o acesso do aluno aparecem com quem fez e quando', async ({ page }) => {
    await entrarComoAdministracao(page)
    await irPara(page, '#/mais/alteracoes')
    await expect(page.getByRole('heading', { level: 1, name: 'Registro de alterações' })).toBeVisible()
    await expect(page.getByText('Nada registrado ainda')).toBeVisible()

    // lançar e desfazer um pagamento
    await irParaAba(page, 'Financeiro')
    await page.locator('.aberto[data-aluno="a-37"]').getByRole('button', { name: 'Lançar pagamento de Vera' }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: /^Lançar R\$\s280,00$/ }).click()
    await expect(aviso(page, /de Vera lançado/)).toBeVisible()
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.getByRole('heading', { name: 'Em aberto (19)' })).toBeVisible()

    // liberar o app e excluir um cadastro
    await irPara(page, '#/alunos/a-12')
    await page.getByRole('button', { name: /Liberar o app para/ }).click()
    await expect(aviso(page, /liberado/)).toBeVisible()
    await irPara(page, '#/alunos/a-10')
    await page.getByRole('button', { name: 'Excluir o cadastro' }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button', { name: 'Excluir de vez' }).click()
    await expect(aviso(page, 'Cadastro de Ana excluído.')).toBeVisible()

    await irPara(page, '#/mais/alteracoes')
    const linhas = page.locator('[data-auditoria]')
    await expect(linhas).toHaveCount(4)
    // da mais recente para a mais antiga; o aluno excluído só pelo código
    await expect(linhas.nth(0)).toContainText('Helena Prado excluiu o cadastro a-10 a pedido do aluno')
    await expect(linhas.nth(0)).not.toContainText('Ana Almeida')
    await expect(linhas.nth(1)).toContainText(/Helena Prado liberou o app para .+/)
    await expect(linhas.nth(2)).toContainText(/Helena Prado apagou o lançamento de R\$\s280,00, outubro de 2026 de Vera/)
    await expect(linhas.nth(3)).toContainText(/Helena Prado lançou R\$\s280,00, outubro de 2026 de Vera/)
    await expect(linhas.nth(3)).toContainText(/9\/10 às 10h/)
    // a exclusão também tirou a observação dos pagamentos (só o código fica)
    await irParaAba(page, 'Financeiro')
    await expect(page.locator('.resumo-mes')).toBeVisible()
  })

  test('o professor não tem a tela, nem pelo endereço', async ({ page }) => {
    await entrarComoProfessor(page, 'Camila Nunes')
    await irPara(page, '#/mais')
    await expect(page.getByRole('button', { name: /Registro de alterações/ })).toHaveCount(0)
    await irPara(page, '#/mais/alteracoes')
    await esperarParado(page, '.tela-quadro')
    await expect(page.getByText('Só a administração vê o registro de alterações.')).toBeVisible()
  })
})
