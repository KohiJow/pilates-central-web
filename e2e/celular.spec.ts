import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { extname, join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { expect, test } from './base'
import { arrastar, entrarComoAdministracao, esperarFolhaParada, esperarParado, folha, irParaAba } from './apoio'

// Coisas de celular que o resto da suíte não pega, cada uma achada na revisão no iPhone e no
// Android (vídeo quadro a quadro, medição na tela) e conferida aqui nos dois motores.

test.describe('celular', () => {
  test('as fontes baixam uma vez só (a pré-carga casa com o pedido do CSS em cada motor)', async ({ page }) => {
    const pedidos: string[] = []
    page.on('request', (r) => {
      if (r.url().endsWith('.woff2')) pedidos.push(new URL(r.url()).pathname)
    })
    const avisos: string[] = []
    page.on('console', (m) => {
      if (/preload/i.test(m.text())) avisos.push(m.text())
    })
    await entrarComoAdministracao(page)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(500)
    const repetidos = pedidos.filter((p, i) => pedidos.indexOf(p) !== i)
    expect(pedidos.length).toBeGreaterThanOrEqual(2)
    expect(repetidos).toEqual([])
    expect(avisos).toEqual([])
  })

  test('a demonstração abre sem baixar o Firebase, com menos de 170 kB de JS comprimido', async ({ page }) => {
    const scripts: string[] = []
    page.on('response', (r) => {
      if (new URL(r.url()).pathname.endsWith('.js')) scripts.push(r.url())
    })
    await entrarComoAdministracao(page)
    await irParaAba(page, 'Agenda')
    expect(scripts.filter((s) => /firebase/i.test(s))).toEqual([])
    let comprimido = 0
    for (const s of new Set(scripts)) {
      const corpo = await (await page.request.get(s)).body()
      comprimido += gzipSync(corpo, { level: 9 }).length
    }
    console.log(JSON.stringify({ scripts: new Set(scripts).size, jsComprimidoKB: Math.round(comprimido / 1024) }))
    expect(comprimido).toBeGreaterThan(20_000)
    expect(comprimido).toBeLessThan(170 * 1024)
  })

  test('campos com 16px ou mais: o iPhone não dá zoom ao tocar para digitar', async ({ page }) => {
    const pequenos = async () =>
      page.evaluate(() =>
        [...document.querySelectorAll('input, select, textarea')]
          .filter((c) => (c as HTMLElement).offsetParent !== null && parseFloat(getComputedStyle(c).fontSize) < 16)
          .map((c) => `${c.nodeName} ${(c as HTMLInputElement).name || c.id}: ${getComputedStyle(c).fontSize}`),
      )
    await entrarComoAdministracao(page)
    let vistos = 0
    for (const tela of ['#/alunos', '#/alunos/novo', '#/alunos/turmas/nova', '#/mais/estudio', '#/mais/equipe/convidar']) {
      await page.evaluate((h) => (location.hash = h), tela)
      await esperarParado(page, '.tela-quadro')
      vistos += await page.locator('input:visible, select:visible, textarea:visible').count()
      expect(await pequenos(), tela).toEqual([])
    }
    await irParaAba(page, 'Financeiro')
    await page.getByRole('button', { name: 'Lançar pagamento', exact: true }).click()
    await esperarFolhaParada(page)
    await folha(page).getByRole('button').filter({ hasText: 'Ana Almeida' }).click()
    expect(await pequenos(), 'folha de pagamento').toEqual([])
    expect(vistos).toBeGreaterThan(5)
  })

  test('com o servidor fora do ar, o app instalado abre do service worker', async ({ page }) => {
    // um servidor só deste teste, para poder desligá-lo de verdade (o modo sem rede do
    // Playwright não passa pelo service worker no WebKit)
    const pasta = resolve('dist')
    const TIPOS: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.woff2': 'font/woff2',
      '.webmanifest': 'application/manifest+json',
      '.json': 'application/json',
    }
    const servidor = createServer((pedido, resposta) => {
      const caminho = decodeURIComponent(new URL(pedido.url ?? '/', 'http://x').pathname)
      if (!caminho.startsWith('/pilates-central-web/')) return void resposta.writeHead(404).end()
      let arquivo = join(pasta, caminho.slice('/pilates-central-web/'.length))
      if (!arquivo.startsWith(pasta)) return void resposta.writeHead(403).end()
      if (existsSync(arquivo) && statSync(arquivo).isDirectory()) arquivo = join(arquivo, 'index.html')
      if (!existsSync(arquivo)) return void resposta.writeHead(404).end()
      resposta.writeHead(200, { 'content-type': TIPOS[extname(arquivo)] ?? 'application/octet-stream' })
      createReadStream(arquivo).pipe(resposta)
    })
    await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r))
    const { port } = servidor.address() as AddressInfo
    const endereco = `http://127.0.0.1:${port}/pilates-central-web/`
    try {
      await page.goto(`${endereco}?demo&agora=2026-10-09T10:00`)
      await page.getByRole('button', { name: 'Explorar como administração' }).click()
      await expect(page.getByRole('heading', { name: /Helena/ })).toBeVisible()
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready
      })
      await page.reload()
      await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
    } finally {
      servidor.closeAllConnections()
      await new Promise((r) => servidor.close(r))
    }
    // sem servidor nenhum: a página, os scripts, os estilos e as fontes vêm da cópia guardada
    await page.reload()
    await expect(page.getByRole('heading', { name: /Helena/ })).toBeVisible()
    await expect(page.getByText('Próxima aula')).toBeVisible()
    await irParaAba(page, 'Agenda')
    await expect(page.locator('.cartao-aula').first()).toBeVisible()
  })

  test('soltar o dedo depois de arrastar o dia: a lista continua para o mesmo lado, sem voltar', async ({ page }) => {
    await entrarComoAdministracao(page)
    await irParaAba(page, 'Agenda')
    await page.evaluate(() => {
      const w = window as unknown as { __x: number[]; __solto: boolean }
      w.__x = []
      w.__solto = false
      document.addEventListener('pointerup', () => (w.__solto = true), { capture: true })
      const quadro = () => {
        const el = document.querySelector('.agenda-dia-conteudo')
        if (w.__solto && el) {
          const t = getComputedStyle(el).transform
          w.__x.push(t === 'none' ? 0 : new DOMMatrixReadOnly(t).m41)
        }
        if (w.__x.length < 40) requestAnimationFrame(quadro)
      }
      requestAnimationFrame(quadro)
    })
    const caixa = await page.locator('.agenda-dia').boundingBox()
    if (!caixa) throw new Error('lista sem caixa')
    const y = caixa.y + 60
    // arraste longo, para além da metade: antes, a lista largada voltava um pedaço antes de sumir
    await arrastar(page, { x: caixa.x + caixa.width * 0.9, y }, { x: caixa.x + caixa.width * 0.1, y: y + 4 }, 16)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sábado, 10 de outubro')
    await esperarParado(page, '.agenda-dia-conteudo')
    const x = await page.evaluate(() => (window as unknown as { __x: number[] }).__x)
    // até o dia novo entrar (quando o x pula para o outro lado), só anda para a esquerda
    const saida = x.slice(0, Math.max(1, x.findIndex((v) => v > 0)))
    for (let i = 1; i < saida.length; i++) expect(saida[i], `quadro ${i}: ${saida.join(', ')}`).toBeLessThanOrEqual((saida[i - 1] ?? 0) + 0.5)
  })
})
