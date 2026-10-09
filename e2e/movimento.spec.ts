import { expect, test } from './base'
import type { CDPSession, Page, TestInfo } from '@playwright/test'
import { arrastar, entrarComoAdministracao, esperarFolhaParada, esperarParado, esperarTransicao, folha, irParaAba } from './apoio'

// Fluidez como requisito: durante cada transição, mede os intervalos entre quadros
// (requestAnimationFrame) e confere que só transform e opacity são animados.
// LENTO=1 liga a CPU 4x mais lenta no Chromium; GRAVAR=1 grava vídeo para olhar quadro a quadro.

const LENTO = process.env.LENTO === '1'
const GRAVAR = process.env.GRAVAR === '1'
const PROPRIEDADES_PERMITIDAS = new Set(['transform', 'opacity', 'offset', 'easing', 'composite', 'computedOffset'])

test.use({ video: GRAVAR ? { mode: 'on', size: { width: 390, height: 844 } } : 'off' })

interface Janela {
  __quadros: number[]
  __geracao: number
  __props: string[]
  __toque: number
}

async function comecarMedicao(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as Janela
    // cada medição tem a sua geração: o laço de uma medição anterior para sozinho
    const geracao = (w.__geracao ?? 0) + 1
    w.__geracao = geracao
    w.__quadros = []
    w.__props = []
    w.__toque = Infinity
    // momento do primeiro toque ou tecla depois que a medição começou
    const marcar = () => {
      if (w.__geracao === geracao && w.__toque === Infinity) w.__toque = performance.now()
    }
    for (const tipo of ['pointerdown', 'click', 'keydown']) document.addEventListener(tipo, marcar, { capture: true, once: true })
    const quadro = (t: number) => {
      if (w.__geracao !== geracao) return
      w.__quadros.push(t)
      for (const anim of document.getAnimations()) {
        const efeito = anim.effect as KeyframeEffect | null
        for (const k of efeito?.getKeyframes() ?? []) for (const p of Object.keys(k)) w.__props.push(p)
      }
      requestAnimationFrame(quadro)
    }
    requestAnimationFrame(quadro)
  })
}

function percentil(valores: number[], p: number): number {
  const ordenados = [...valores].sort((a, b) => a - b)
  return ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * p))] ?? 0
}

async function terminarMedicao(page: Page, nome: string, info: TestInfo) {
  const { intervalos, props, primeiroDepoisDoToque } = await page.evaluate(() => {
    const w = window as unknown as Janela
    w.__geracao += 1
    const q = w.__quadros
    const k = q.findIndex((t) => t > w.__toque)
    return {
      intervalos: q.slice(1).map((t, i) => t - (q[i] ?? t)),
      props: [...new Set(w.__props)],
      // índice (em intervalos) do primeiro quadro que termina depois do toque
      primeiroDepoisDoToque: k < 1 ? 0 : k - 1,
    }
  })
  // Um dos primeiros quadros depois do toque inclui montar e pintar a tela nova (custo de
  // render, antes de a animação começar); os outros são a animação. Os dois são relatados;
  // o p95 é o da animação.
  const janelaDoRender = intervalos.slice(primeiroDepoisDoToque, primeiroDepoisDoToque + 3)
  const indiceDoMaior =
    primeiroDepoisDoToque + janelaDoRender.reduce((m, v, i, a) => (v > (a[m] ?? 0) ? i : m), 0)
  const animacao = intervalos.filter((_, i) => i !== indiceDoMaior)
  const resultado = {
    nome,
    navegador: info.project.name,
    cpuLenta: LENTO,
    quadros: intervalos.length,
    quadroDeRender: Number((intervalos[indiceDoMaior] ?? 0).toFixed(1)),
    p95: Number(percentil(animacao, 0.95).toFixed(1)),
    mediana: Number(percentil(animacao, 0.5).toFixed(1)),
    maior: Number(Math.max(0, ...animacao).toFixed(1)),
    propriedades: props,
  }
  await info.attach(`quadros-${nome}`, { body: JSON.stringify(resultado, null, 2), contentType: 'application/json' })
  console.log(JSON.stringify(resultado))
  return resultado
}

/**
 * Régua do ambiente: uma camada do tamanho da tela animando só transform e opacity, sem nada
 * do app. É o melhor que este navegador, nesta máquina, consegue fazer.
 */
async function medirReferencia(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const camada = document.createElement('div')
    Object.assign(camada.style, { position: 'fixed', inset: '0', background: '#f5f1ee', zIndex: '999', pointerEvents: 'none' })
    camada.textContent = 'referência '.repeat(300)
    document.body.append(camada)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const animacao = camada.animate(
      [
        { transform: 'translateX(24px)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      { duration: 600 },
    )
    const q: number[] = []
    await new Promise<void>((fim) => {
      const quadro = (t: number) => {
        q.push(t)
        if (animacao.playState === 'running') requestAnimationFrame(quadro)
        else fim()
      }
      requestAnimationFrame(quadro)
    })
    camada.remove()
    const intervalos = q
      .slice(1)
      .map((t, i) => t - (q[i] ?? t))
      .sort((a, b) => a - b)
    return intervalos[Math.min(intervalos.length - 1, Math.floor(intervalos.length * 0.95))] ?? 0
  })
}

/**
 * Limite do p95 no Chromium: 60 Hz = 16,7 ms, então dois quadros perdidos (34 ms) reprova; com
 * a CPU 4x mais lenta, 50 ms. Se a régua do ambiente já perde quadros (máquina disputada), o
 * limite passa a ser a régua mais dois quadros.
 * No WebKit do contêiner não há GPU: tudo é pintado e composto na CPU, dividida com outros
 * processos, e até a régua (uma camada só, sem nada do app) fica longe de 60 Hz e varia muito
 * de uma rodada para outra (p95 da régua entre 50 e 190 ms nas medições). Lá os tempos ficam
 * registrados (anexo e console) para comparar com a régua, sem reprovar; o que reprova no
 * WebKit é animação de outra propriedade que não transform e opacity.
 */
function limiteDoP95(info: TestInfo, referencia: number): number | undefined {
  if (info.project.name === 'webkit') return undefined
  // com a máquina disputada, a própria régua perde quadros: a transição pode perder até dois
  // quadros a mais que ela
  return Math.max(LENTO ? 50 : 34, referencia + 2 * 16.7)
}

async function medir(
  page: Page,
  info: TestInfo,
  referencia: number,
  nome: string,
  acao: () => Promise<void>,
  esperaMs = 450,
) {
  await comecarMedicao(page)
  await acao()
  await page.waitForTimeout(esperaMs)
  const r = await terminarMedicao(page, nome, info)
  const proibidas = r.propriedades.filter((p) => !PROPRIEDADES_PERMITIDAS.has(p))
  expect(proibidas, `${nome}: só transform e opacity`).toEqual([])
  expect(r.quadros, `${nome}: houve quadros`).toBeGreaterThan(2)
  const limite = limiteDoP95(info, referencia)
  if (limite !== undefined) {
    expect.soft(r.p95, `${nome}: p95 dos intervalos entre quadros (régua ${referencia.toFixed(1)} ms)`).toBeLessThan(limite)
    expect.soft(Math.max(r.maior, r.quadroDeRender), `${nome}: nenhum quadro travado`).toBeLessThan(250)
  }
  return r
}

test.describe('fluidez das transições', () => {
  let cdp: CDPSession | undefined

  test.beforeEach(async ({ page, browserName }) => {
    if (LENTO && browserName === 'chromium') {
      cdp = await page.context().newCDPSession(page)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    }
  })

  test('folha, troca de dia, troca de aba e aviso', async ({ page }, info) => {
    test.setTimeout(90_000)
    await entrarComoAdministracao(page)
    await page.waitForTimeout(500)
    const referencia = await medirReferencia(page)
    await info.attach('regua-do-ambiente', { body: JSON.stringify({ navegador: info.project.name, cpuLenta: LENTO, p95: referencia }), contentType: 'application/json' })
    console.log(JSON.stringify({ regua: info.project.name, cpuLenta: LENTO, p95: referencia }))

    await medir(page, info, referencia, 'troca-de-aba', async () => {
      await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Agenda' }).click()
    })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sexta, 9 de outubro')
    await esperarTransicao(page)

    await medir(page, info, referencia, 'dia-pela-faixa', async () => {
      await page.locator('[data-dia="2026-10-10"]').click()
    })
    await medir(page, info, referencia, 'dia-pelo-dedo', async () => {
      const caixa = await page.locator('.agenda-dia').boundingBox()
      if (!caixa) throw new Error('sem lista')
      const y = caixa.y + 60
      await arrastar(page, { x: caixa.x + caixa.width * 0.15, y }, { x: caixa.x + caixa.width * 0.85, y: y + 4 }, 14)
    })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sexta, 9 de outubro')

    await medir(page, info, referencia, 'abrir-folha', async () => {
      await page.locator('.cartao-aula').nth(2).click()
    })
    await esperarFolhaParada(page)

    await medir(page, info, referencia, 'marcar-e-aviso', async () => {
      await folha(page).locator('[data-aluno]').nth(1).getByRole('button', { name: 'Presente' }).click()
    })

    await medir(page, info, referencia, 'fechar-folha-arrastando', async () => {
      const alca = await page.locator('.folha-alca').boundingBox()
      if (!alca) throw new Error('sem alça')
      await arrastar(page, { x: alca.x + 10, y: alca.y + 2 }, { x: alca.x + 10, y: alca.y + 380 }, 10)
    })
    await expect(folha(page)).toHaveCount(0)

    await irParaAba(page, 'Mais')
    await medir(page, info, referencia, 'troca-de-tema', async () => {
      await page.getByRole('radio', { name: 'Escuro' }).click()
    })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('telas de gestão: ficha, voltar, seção, folha de encaixe e troca de mês', async ({ page }, info) => {
    test.setTimeout(90_000)
    await entrarComoAdministracao(page)
    await irParaAba(page, 'Alunos')
    await page.waitForTimeout(500)
    const referencia = await medirReferencia(page)
    console.log(JSON.stringify({ regua: info.project.name, cpuLenta: LENTO, p95: referencia, teste: 'gestao' }))

    await medir(page, info, referencia, 'abrir-ficha', async () => {
      await page.locator('[data-aluno]').first().click()
    })
    await esperarParado(page, '.tela-quadro')
    await medir(page, info, referencia, 'voltar-da-ficha', async () => {
      await page.locator('.voltar').click()
    })
    await esperarParado(page, '.tela-quadro')
    await medir(page, info, referencia, 'troca-de-secao', async () => {
      await page.getByRole('navigation', { name: 'Seções' }).getByRole('button', { name: 'Reposições' }).click()
    })
    await esperarParado(page, '.tela-quadro')
    await medir(page, info, referencia, 'abrir-folha-de-encaixe', async () => {
      await page.locator('[data-credito]').first().getByRole('button', { name: 'Encaixar' }).click()
    })
    await esperarFolhaParada(page)
    await medir(page, info, referencia, 'escolher-aula', async () => {
      await folha(page).getByRole('radio').first().click()
    })
    await page.keyboard.press('Escape')
    await expect(folha(page)).toHaveCount(0)
    await irParaAba(page, 'Financeiro')
    await expect(page.locator('.grafico')).toBeVisible()
    await medir(page, info, referencia, 'troca-de-mes', async () => {
      await page.getByRole('button', { name: 'Mês anterior' }).click()
    })
  })
})
