import { expect, test } from '@playwright/test'
import { abrirApp, entrarComoDona } from './apoio'

test.describe('app instalável', () => {
  test('manifesto com nome, tela cheia, cores e ícones (inclusive maskable)', async ({ page, request }) => {
    await abrirApp(page)
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBeTruthy()
    const resposta = await request.get(new URL(href ?? '', page.url()).href)
    expect(resposta.ok()).toBe(true)
    const manifesto = (await resposta.json()) as {
      name: string
      display: string
      start_url: string
      theme_color: string
      background_color: string
      icons: { src: string; sizes: string; purpose?: string }[]
    }
    expect(manifesto.name).toBe('Pilates Central')
    expect(manifesto.display).toBe('standalone')
    expect(manifesto.theme_color).toMatch(/^#/)
    expect(manifesto.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(manifesto.icons.some((i) => i.purpose === 'maskable')).toBe(true)
    for (const icone of manifesto.icons) {
      const r = await request.get(new URL(icone.src, new URL(href ?? '', page.url())).href)
      expect(r.ok(), icone.src).toBe(true)
      expect(r.headers()['content-type']).toContain('image/png')
    }
    const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')
    expect((await request.get(new URL(apple ?? '', page.url()).href)).ok()).toBe(true)
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', /^#/)
  })

  test('abre sem erro no console e com a política de segurança', async ({ page }) => {
    const erros: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text())
    })
    page.on('pageerror', (e) => erros.push(e.message))
    await entrarComoDona(page)
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1)
    expect(erros).toEqual([])
  })

  test('o service worker guarda tudo o que o app precisa para abrir', async ({ page }) => {
    await entrarComoDona(page)
    const resultado = await page.evaluate(async () => {
      const registro = await navigator.serviceWorker.ready
      const chaves = await caches.keys()
      const cache = await caches.open(chaves.find((c) => c.startsWith('pilates-central-')) ?? '')
      const guardados = (await cache.keys()).map((r) => new URL(r.url).pathname)
      const scripts = [...document.querySelectorAll('script[src], link[rel="stylesheet"]')].map(
        (e) => new URL(e.getAttribute('src') ?? e.getAttribute('href') ?? '', location.href).pathname,
      )
      return { ativo: Boolean(registro.active), guardados, faltando: scripts.filter((s) => !guardados.includes(s)) }
    })
    expect(resultado.ativo).toBe(true)
    expect(resultado.guardados).toContain('/pilates-central-web/')
    expect(resultado.guardados).toContain('/pilates-central-web/manifest.webmanifest')
    expect(resultado.faltando).toEqual([])
  })

  test('depois da primeira visita, abre sem internet no modo demonstração', async ({ page, context, browserName }) => {
    // o WebKit do Playwright não passa a navegação pelo service worker com a rede desligada
    // ("internal error" no recarregar); lá o teste acima confere o que ficou guardado
    test.skip(browserName === 'webkit', 'simulação de rede desligada sem service worker no WebKit do Playwright')
    await entrarComoDona(page)
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    // a primeira visita instala; a página passa a ser controlada no recarregar
    await page.reload()
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('heading', { name: /Helena/ })).toBeVisible()
    await expect(page.getByText('Próxima aula')).toBeVisible()
    await context.setOffline(false)
  })
})
