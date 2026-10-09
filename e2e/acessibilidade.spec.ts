import { expect, test } from './base'
import type { Page } from '@playwright/test'
import { abrirApp, entrarComoAdministracao, entrarComoProfessor, esperarFolhaParada, esperarParado, irPara, irParaAba } from './apoio'

// Rótulos em caixa alta (micro-rótulos, pílulas, abas, dias da faixa) são etiquetas, não texto
// corrido: podem ficar abaixo de 16px. Todo o resto tem que ter 16px ou mais.
const ETIQUETAS = '.micro, .pilula, .aba, .dia-semana, .dia-da-aula-semana, .selo-demo, .avatar, .marca-dagua, .so-leitor'

async function auditar(page: Page, onde: string) {
  const problemas = await page.evaluate((etiquetas) => {
    const visivel = (el: Element) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
    }
    const saida: string[] = []
    const raiz = document.querySelector('.folha') ?? document.body
    for (const el of raiz.querySelectorAll('button, a[href], input, [role="radio"]')) {
      if (!visivel(el) || el.closest('[inert]')) continue
      const r = el.getBoundingClientRect()
      if (r.height < 47.5 || r.width < 47.5) {
        saida.push(`alvo pequeno ${Math.round(r.width)}x${Math.round(r.height)}: ${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 30)}`)
      }
    }
    const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
    for (let n = andar.nextNode(); n; n = andar.nextNode()) {
      const texto = n.textContent?.trim()
      const pai = n.parentElement
      if (!texto || !pai || !visivel(pai) || pai.closest(etiquetas) || pai.closest('svg')) continue
      const tamanho = parseFloat(getComputedStyle(pai).fontSize)
      if (tamanho < 16) saida.push(`texto ${tamanho}px: ${texto.slice(0, 30)}`)
    }
    return saida
  }, ETIQUETAS)
  expect(problemas, onde).toEqual([])
}

test.describe('acessibilidade para uso com uma mão', () => {
  test('alvos e texto no app do aluno e nas páginas públicas', async ({ page }) => {
    await abrirApp(page)
    await page.getByRole('button', { name: 'Explorar como aluno' }).click()
    await esperarFolhaParada(page)
    await auditar(page, 'escolher aluno')
    await page.getByRole('dialog').getByRole('button', { name: /Beatriz Barbosa/ }).click()
    await esperarParado(page, '.tela-quadro')
    await auditar(page, 'minhas aulas')
    await page.locator('#conteudo .lista .lista-item').first().click()
    await esperarFolhaParada(page)
    await auditar(page, 'folha da aula do aluno')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    for (const nome of ['Reposição', 'Mais']) {
      await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: nome }).click()
      await esperarParado(page, '.tela-quadro')
      await auditar(page, `aluno: ${nome}`)
    }
    await page.goto('./experimental/?demo&agora=2026-10-09T10:00')
    await expect(page.locator('.horario').first()).toBeVisible()
    await auditar(page, 'página de aula experimental')
    await page.goto('./privacidade/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await auditar(page, 'aviso de privacidade')
  })

  test('alvos e texto nas telas de conta (portas e login, com o emulador ligado só no endereço)', async ({ page }) => {
    // sem o emulador rodando: as telas aparecem e nada é pedido à rede antes de entrar
    await page.goto('./?emulador=1')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await auditar(page, 'portas')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Que bom ver você.' })).toBeVisible()
    await auditar(page, 'entrar com e-mail')
    await page.getByRole('button', { name: 'Primeiro acesso? Criar conta' }).click()
    await expect(page.getByRole('heading', { name: 'Crie a sua conta.' })).toBeVisible()
    await auditar(page, 'criar conta')
    await page.getByRole('button', { name: 'Já tenho conta' }).click()
    await page.getByRole('button', { name: 'Esqueci a senha' }).click()
    await esperarFolhaParada(page)
    await auditar(page, 'senha nova')
  })

  test('alvos de toque de 48px e texto de 16px em todas as telas', async ({ page }) => {
    await abrirApp(page)
    await auditar(page, 'entrar')
    await entrarComoAdministracao(page)
    await auditar(page, 'hoje')
    await irParaAba(page, 'Agenda')
    await auditar(page, 'agenda')
    await page.locator('.cartao-aula').nth(2).click()
    await esperarFolhaParada(page)
    await auditar(page, 'chamada')
    await page.keyboard.press('Escape')
    await irParaAba(page, 'Mais')
    await auditar(page, 'mais')
  })

  test('alvos e texto nas telas de gestão (administração)', async ({ page }) => {
    test.setTimeout(90_000)
    await entrarComoAdministracao(page)
    const telas = [
      '#/alunos',
      '#/alunos/a-10',
      '#/alunos/novo',
      '#/alunos/turmas',
      '#/alunos/turmas/t-centro-1-1800',
      '#/alunos/turmas/nova',
      '#/alunos/reposicoes',
      '#/financeiro',
      '#/mais',
      '#/mais/regras',
      '#/mais/estudio',
      '#/mais/unidades',
      '#/mais/equipe',
      '#/mais/equipe/e-marcos',
      '#/mais/equipe/convidar',
    ]
    for (const tela of telas) {
      await irPara(page, tela)
      await auditar(page, tela)
    }
    // folhas: encaixe a partir do crédito e lançamento de pagamento
    await irPara(page, '#/alunos/reposicoes')
    await page.locator('[data-credito]').first().getByRole('button', { name: 'Encaixar' }).click()
    await esperarFolhaParada(page)
    await page.getByRole('dialog').getByRole('radio').first().click()
    await auditar(page, 'folha de encaixe')
    await page.keyboard.press('Escape')
    // a folha fechando volta uma entrada no histórico: espera ela sumir antes de trocar de tela
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await esperarParado(page, '.tela-quadro')
    await irPara(page, '#/financeiro')
    await page.getByRole('button', { name: 'Lançar pagamento', exact: true }).click()
    await esperarFolhaParada(page)
    await page.getByRole('dialog').getByRole('button').filter({ hasText: 'Ana Almeida' }).click()
    await auditar(page, 'folha de pagamento')
  })

  test('alvos e texto nas telas do professor', async ({ page }) => {
    await entrarComoProfessor(page, 'Camila Nunes')
    for (const tela of ['#/alunos', '#/alunos/a-10', '#/alunos/turmas', '#/alunos/reposicoes', '#/mais']) {
      await irPara(page, tela)
      await auditar(page, tela)
    }
  })

  test('com a folha aberta, o resto do app fica inerte e o foco começa na folha', async ({ page }) => {
    await entrarComoAdministracao(page)
    await page.getByRole('button', { name: 'Abrir chamada', exact: true }).click()
    await esperarFolhaParada(page)
    await expect(page.locator('#app')).toHaveAttribute('inert', '')
    const foco = await page.evaluate(() => document.activeElement?.closest('.folha') !== null)
    expect(foco).toBe(true)
    await page.keyboard.press('Escape')
    await expect(page.locator('#app')).not.toHaveAttribute('inert', '')
  })

  test('com "reduzir movimento", nada desliza', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await entrarComoAdministracao(page)
    await page.getByRole('button', { name: 'Abrir chamada', exact: true }).click()
    // com 1 ms de duração, uma animação pode aparecer como "rodando" até o próximo quadro;
    // o que importa é que nenhuma dure de verdade
    const longas = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => Number(a.effect?.getComputedTiming().duration ?? 0) > 1)
        .map((a) => (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? 'waapi'),
    )
    expect(longas).toEqual([])
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
