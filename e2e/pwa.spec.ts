import { expect, test } from './base'
import { abrirApp, AGORA_PADRAO, aviso, BASE, entrarComoAdministracao, servidorDoDist } from './apoio'

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

  test('tela de abertura do app instalado no iPhone: uma imagem por tamanho de tela, nos dois temas', async ({ page, request }) => {
    await abrirApp(page)
    const links = page.locator('link[rel="apple-touch-startup-image"]')
    const quantos = await links.count()
    // onze tamanhos de iPhone (do SE ao Pro Max), claro e escuro
    expect(quantos).toBe(22)
    const midias = await links.evaluateAll((els) => els.map((el) => el.getAttribute('media') ?? ''))
    for (const m of midias) {
      expect(m).toMatch(/^screen and \(device-width: \d+px\) and \(device-height: \d+px\) and \(-webkit-device-pixel-ratio: [23]\) and \(orientation: portrait\) and \(prefers-color-scheme: (light|dark)\)$/)
    }
    expect(midias.filter((m) => m.endsWith('dark)'))).toHaveLength(11)
    // o iPhone 13 (390 x 844, 3x) tem a dele nos dois temas, e a imagem existe no tamanho certo
    for (const tema of ['light', 'dark']) {
      const link = links.filter({ has: page.locator(`:scope[media*="(device-width: 390px)"][media*="${tema}"]`) })
      const href = await link.getAttribute('href')
      expect(href, tema).toMatch(/\/abertura\/1170x2532(-escuro)?\.png$/)
      const r = await request.get(new URL(href ?? '', page.url()).href)
      expect(r.ok(), href ?? '').toBe(true)
      expect(r.headers()['content-type']).toContain('image/png')
    }
    // até o app montar, a página já mostra o logo no centro (continuação da tela de abertura);
    // depois de montar, ele sai (o Preact não tira sozinho o que já estava no contêiner)
    const html = await (await request.get(page.url())).text()
    expect(html).toContain('class="abertura"')
    await expect(page.locator('#app > .abertura')).toHaveCount(0)
    expect(await page.locator('#app > *').count()).toBe(1)
    // as telas de abertura não vão para o cache do service worker (o iOS guarda ao instalar)
    const sw = await (await request.get(`${BASE}sw.js`)).text()
    expect(sw).not.toContain('abertura/')
  })

  test('abre sem erro no console e com a política de segurança', async ({ page }) => {
    const erros: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text())
    })
    page.on('pageerror', (e) => erros.push(e.message))
    await entrarComoAdministracao(page)
    const politica = (await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')) ?? ''
    expect(politica).toMatch(/script-src 'self' 'sha256-/)
    expect(politica).not.toMatch(/unsafe-inline|unsafe-eval/)
    expect(politica).toContain("require-trusted-types-for 'script'")
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'strict-origin-when-cross-origin')
    expect(erros).toEqual([])
  })

  test('com Trusted Types, HTML por texto é recusado e só o service worker carrega por endereço', async ({ page }) => {
    await entrarComoAdministracao(page)
    const resultado = await page.evaluate(() => {
      const tt = (window as Window & { trustedTypes?: { defaultPolicy: { name: string } | null } }).trustedTypes
      if (!tt) return { suportado: false, politica: '', innerHtml: 'n/a', script: 'n/a' }
      const div = document.createElement('div')
      let innerHtml = 'passou'
      try {
        div.innerHTML = '<img src=x onerror=alert(1)>'
      } catch (e) {
        innerHtml = e instanceof TypeError ? 'recusado' : String(e)
      }
      let script = 'passou'
      try {
        const el = document.createElement('script')
        el.src = 'https://evil.example.com/x.js'
      } catch (e) {
        script = e instanceof TypeError ? 'recusado' : String(e)
      }
      return { suportado: true, politica: tt.defaultPolicy?.name ?? '', innerHtml, script }
    })
    // o motor do Safari pode não ter Trusted Types; aí a diretiva é ignorada e nada muda
    test.skip(!resultado.suportado, 'este motor não tem Trusted Types')
    expect(resultado.politica).toBe('default')
    expect(resultado.innerHtml).toBe('recusado')
    expect(resultado.script).toBe('recusado')
    // o app continua inteiro depois das recusas
    await expect(page.getByRole('heading', { name: /Helena/ })).toBeVisible()
  })

  test('versão nova do service worker: avisa, e só troca quando a pessoa toca em Atualizar', async ({ page }) => {
    // um servidor só do teste: é ele que passa a entregar um sw.js de outra versão
    const servidor = await servidorDoDist()
    try {
      await page.goto(`${servidor.endereco}?demo&agora=${AGORA_PADRAO}`)
      await page.getByRole('button', { name: 'Explorar como administração' }).click()
      await expect(page.getByRole('heading', { name: /Helena/ })).toBeVisible()
      await page.evaluate(() => navigator.serviceWorker.ready)
      // a primeira versão assume sem recarregar nada; a página passa a ser controlada no recarregar
      await page.reload()
      await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
      const versaoAntes = await page.evaluate(async () => (await caches.keys()).find((c) => c.startsWith('pilates-central-')) ?? '')
      expect(versaoAntes).not.toBe('')

      // o servidor passa a entregar outra versão: o app só avisa, e a versão nova fica esperando
      servidor.versaoDoSw('teste-versao-nova')
      await page.evaluate(async () => {
        const r = await navigator.serviceWorker.getRegistration()
        await r?.update()
      })
      const avisoNovo = aviso(page, 'Tem uma versão nova do app.')
      await expect(avisoNovo).toBeVisible({ timeout: 15_000 })
      // enquanto a pessoa não toca, quem manda é a versão antiga; a nova já guardou os arquivos dela
      expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
      expect((await page.evaluate(() => caches.keys())).sort()).toEqual([versaoAntes, 'pilates-central-teste-versao-nova'].sort())
      await expect(page.getByRole('heading', { name: /Helena/ })).toBeVisible()

      await avisoNovo.getByRole('button', { name: 'Atualizar' }).click()
      // a versão nova assume e a página recarrega sozinha, já com o cache antigo fora
      await expect(page.getByRole('heading', { name: /Helena/ })).toBeVisible()
      await expect
        .poll(async () => page.evaluate(async () => (await caches.keys()).filter((c) => c.startsWith('pilates-central-'))), { timeout: 15_000 })
        .toEqual(['pilates-central-teste-versao-nova'])
    } finally {
      await servidor.fechar()
    }
  })

  test('o service worker guarda tudo o que o app precisa para abrir', async ({ page }) => {
    await entrarComoAdministracao(page)
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
    expect(resultado.guardados).toContain(BASE)
    expect(resultado.guardados).toContain(`${BASE}manifest.webmanifest`)
    expect(resultado.faltando).toEqual([])
  })

  test('depois da primeira visita, abre sem internet no modo demonstração', async ({ page, context, browserName }) => {
    // o WebKit do Playwright não passa a navegação pelo service worker com a rede desligada
    // ("internal error" no recarregar); lá vale o teste com o servidor desligado de verdade,
    // em celular.spec.ts
    test.skip(browserName === 'webkit', 'simulação de rede desligada sem service worker no WebKit do Playwright')
    await entrarComoAdministracao(page)
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
