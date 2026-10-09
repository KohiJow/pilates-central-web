import { gzipSync } from 'node:zlib'
import { expect, test } from './base'
import { entrarComoAdministracao, irParaAba } from './apoio'

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
})
