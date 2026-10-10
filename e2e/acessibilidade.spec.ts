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
      '#/mais/alteracoes',
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

  test('alvos, texto e contraste na importação de planilha (prévia com erros e correção)', async ({ page }) => {
    test.setTimeout(90_000)
    await entrarComoAdministracao(page)
    await irPara(page, '#/alunos/importar')
    await page.getByRole('button', { name: 'Como escrever cada coluna' }).click()
    await auditar(page, 'importar alunos')
    await page.getByLabel('Cole aqui as linhas da planilha').fill('Nome;WhatsApp;Turmas\nAna Lima;119;dom 10h\nBia Rosa;(11) 90000-0061;sáb 9h')
    await page.getByRole('button', { name: 'Conferir' }).click()
    await expect(page.locator('[data-linha]')).toHaveCount(2)
    await auditar(page, 'prévia da importação')
    for (const esquema of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: esquema })
      await medirContraste(page, `prévia da importação, ${esquema}`)
    }
    await page.locator('[data-linha="1"]').click()
    await esperarFolhaParada(page)
    await auditar(page, 'folha de correção')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await esperarParado(page, '.tela-quadro')
    await irPara(page, '#/alunos/turmas/importar')
    await auditar(page, 'importar turmas')
  })

  test('alvos, texto e contraste no guia de primeiro uso (cada passo e a grade da semana)', async ({ page }) => {
    test.setTimeout(90_000)
    await entrarComoAdministracao(page)
    for (const passo of ['estudio', 'unidades', 'equipe', 'alunos', 'fim']) {
      await irPara(page, `#/mais/montar/${passo}`)
      await auditar(page, `guia: ${passo}`)
    }
    await irPara(page, '#/mais/montar/turmas')
    await page.getByRole('radiogroup', { name: 'Unidade' }).getByRole('radio', { name: 'Jardim' }).click()
    await page.getByRole('button', { name: 'Sexta, 7h: criar turma' }).click()
    await auditar(page, 'guia: turmas')
    for (const esquema of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: esquema })
      await medirContraste(page, `guia: turmas, ${esquema}`)
    }
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
    await page.getByRole('button', { name: 'Ver quem vem', exact: true }).click()
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
    await page.getByRole('button', { name: 'Ver quem vem', exact: true }).click()
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

  // Contraste medido na tela, e não só nos pares de tokens: pega opacidade, fundo composto de
  // camadas semitransparentes e cor herdada. Texto pequeno 4,5:1; grande (24px, ou 18,66px em
  // negrito) 3:1.
  for (const esquema of ['light', 'dark'] as const) {
    test(`contraste medido na tela, tema ${esquema === 'light' ? 'claro' : 'escuro'}`, async ({ page }) => {
      test.setTimeout(90_000)
      await page.emulateMedia({ colorScheme: esquema, reducedMotion: 'reduce' })
      await abrirApp(page, '2026-10-09T17:45')
      await medirContraste(page, 'entrada')
      await page.getByRole('button', { name: 'Explorar como administração' }).click()
      await expect(page.getByRole('heading', { name: /Helena/ })).toBeVisible()
      await medirContraste(page, 'hoje')
      await page.getByRole('button', { name: 'Abrir chamada', exact: true }).click()
      await esperarFolhaParada(page)
      await medirContraste(page, 'chamada')
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      // agenda com domingo e feriado à vista (dias sem aula ficam com a cor secundária)
      for (const tela of ['#/agenda', '#/alunos', '#/alunos/a-10', '#/alunos/turmas', '#/alunos/reposicoes', '#/financeiro', '#/mais']) {
        await irPara(page, tela)
        await medirContraste(page, tela)
      }
      await page.goto('./experimental/?demo&agora=2026-10-09T10:00')
      await expect(page.locator('.horario').first()).toBeVisible()
      await medirContraste(page, 'página de aula experimental')
    })
  }
})

async function medirContraste(page: Page, onde: string) {
  const ruins = await page.evaluate(() => {
    type Cor = [number, number, number, number]
    const ler = (c: string): Cor | null => {
      const m = c.match(/rgba?\(([^)]+)\)/)
      if (!m?.[1]) return null
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
      return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 1]
    }
    const linear = (v: number) => {
      const x = v / 255
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
    }
    const luz = (c: Cor) => 0.2126 * linear(c[0]) + 0.7152 * linear(c[1]) + 0.0722 * linear(c[2])
    const sobre = (cima: Cor, baixo: Cor): Cor => {
      const a = cima[3]
      return [cima[0] * a + baixo[0] * (1 - a), cima[1] * a + baixo[1] * (1 - a), cima[2] * a + baixo[2] * (1 - a), 1]
    }
    const fundoDe = (el: Element): Cor => {
      const camadas: Cor[] = []
      for (let n: Element | null = el; n; n = n.parentElement) {
        const c = ler(getComputedStyle(n).backgroundColor)
        if (c && c[3] > 0) {
          camadas.push(c)
          if (c[3] >= 1) break
        }
      }
      let base: Cor = ler(getComputedStyle(document.documentElement).backgroundColor) ?? [255, 255, 255, 1]
      for (let i = camadas.length - 1; i >= 0; i--) base = sobre(camadas[i] as Cor, base)
      return base
    }
    const opacidade = (el: Element) => {
      let o = 1
      for (let n: Element | null = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
      return o
    }
    const saida: string[] = []
    const vistos = new Set<Element>()
    const andar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let t = andar.nextNode(); t; t = andar.nextNode()) {
      const el = t.parentElement
      if (!t.textContent?.trim() || !el || vistos.has(el)) continue
      vistos.add(el)
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      if (r.width === 0 || r.height === 0 || s.visibility === 'hidden') continue
      if (el.closest('.so-leitor, [aria-hidden="true"], .marca-dagua, [inert]')) continue
      const cor = ler(s.color)
      if (!cor) continue
      const fundo = fundoDe(el)
      const frente = sobre([cor[0], cor[1], cor[2], cor[3] * opacidade(el)], fundo)
      const [a, b] = [luz(frente), luz(fundo)]
      const razao = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      const px = parseFloat(s.fontSize)
      const grande = px >= 24 || (px >= 18.66 && Number(s.fontWeight) >= 700)
      if (razao < (grande ? 3 : 4.5)) saida.push(`${razao.toFixed(2)}:1 em ${px}px: ${(t.textContent ?? '').trim().slice(0, 30)}`)
    }
    return [...new Set(saida)]
  })
  expect(ruins, onde).toEqual([])
}
