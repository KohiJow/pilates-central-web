// Gera as telas de abertura do app instalado no iPhone (apple-touch-startup-image), uma por
// tamanho de tela e por tema: o logo no centro, sobre o creme (ou o fundo escuro), do mesmo
// jeito que o app pinta antes de carregar (o espaço reservado em index.html).
// Uso: node scripts/gerar-abertura.mjs   (precisa do Chromium do Playwright instalado)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { arquivoDeAbertura, TAMANHOS_DE_ABERTURA } from './abertura.ts'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const logo = readFileSync(join(raiz, 'src/assets/marca/logo.svg'), 'utf8')

// as mesmas cores dos tokens (tokens.css): fundo e marca de cada tema
/** @type {Record<import('./abertura.ts').TemaDeAbertura, { fundo: string; marca: string }>} */
const TEMAS = {
  claro: { fundo: '#F5F1EE', marca: '#6B250E' },
  escuro: { fundo: '#1C120D', marca: '#E09A72' },
}
/** @type {import('./abertura.ts').TemaDeAbertura[]} */
const NOMES_DOS_TEMAS = ['claro', 'escuro']

/** O logo ocupa esta fração da largura da tela (o mesmo tamanho do espaço reservado no app). */
const FRACAO_DO_LOGO = 0.3

const navegador = await chromium.launch()
try {
  for (const t of TAMANHOS_DE_ABERTURA) {
    for (const tema of NOMES_DOS_TEMAS) {
      const cores = TEMAS[tema]
      const pagina = await navegador.newPage({ viewport: { width: t.largura, height: t.altura }, deviceScaleFactor: t.escala })
      const lado = Math.round(t.largura * FRACAO_DO_LOGO)
      const svg = logo.replace('<svg ', `<svg width="${lado}" height="${lado}" `)
      await pagina.setContent(
        `<html><body style="margin:0;width:${t.largura}px;height:${t.altura}px;display:grid;place-items:center;` +
          `background:${cores.fundo};color:${cores.marca}">${svg}</body></html>`,
      )
      const destino = join(raiz, 'public', arquivoDeAbertura(t, tema))
      mkdirSync(dirname(destino), { recursive: true })
      await pagina.screenshot({ path: destino })
      await pagina.close()
      console.log('gerado', arquivoDeAbertura(t, tema))
    }
  }
} finally {
  await navegador.close()
}

writeFileSync(
  join(raiz, 'public/abertura/LEIA-ME.txt'),
  'Telas de abertura do app instalado no iPhone, geradas por scripts/gerar-abertura.mjs (npm run abertura). Não edite à mão.\n',
)
