// Gera os ícones do app (PWA, iPhone e favicon) a partir do logo vetorizado.
// Uso: npm run icones   (precisa do Chromium do Playwright instalado)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chromium } from '@playwright/test'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const logo = readFileSync(join(raiz, 'src/assets/marca/logo.svg'), 'utf8')
// em 32px as letras do logo somem; o favicon usa o monograma (o P do logo dentro do anel)
const monograma = readFileSync(join(raiz, 'src/assets/marca/monograma.svg'), 'utf8')

const CREME = '#F5F1EE'
const TERRACOTA = '#6B250E'
const TERRACOTA_CLARA = '#F0C4A8'

// escala = fração do lado ocupada pelo círculo do logo.
// No ícone "maskable" o Android pode recortar em círculo: o logo fica dentro da zona segura (80%).
const ICONES = [
  { arquivo: 'icones/icone-192.png', lado: 192, escala: 0.86 },
  { arquivo: 'icones/icone-512.png', lado: 512, escala: 0.86 },
  { arquivo: 'icones/icone-mascaravel-512.png', lado: 512, escala: 0.7 },
  { arquivo: 'icones/apple-touch-icon.png', lado: 180, escala: 0.84 },
  { arquivo: 'icones/favicon-32.png', lado: 32, escala: 1, fundo: 'transparent', svg: monograma },
]

const navegador = await chromium.launch()
try {
  for (const { arquivo, lado, escala, fundo = CREME, svg: origem = logo } of ICONES) {
    const pagina = await navegador.newPage({ viewport: { width: lado, height: lado } })
    const tamanho = Math.round(lado * escala)
    const svg = origem.replace('<svg ', `<svg width="${tamanho}" height="${tamanho}" `)
    await pagina.setContent(
      `<html><body style="margin:0;width:${lado}px;height:${lado}px;display:grid;place-items:center;` +
        `background:${fundo};color:${TERRACOTA}">${svg}</body></html>`,
    )
    const destino = join(raiz, 'public', arquivo)
    mkdirSync(dirname(destino), { recursive: true })
    await pagina.screenshot({ path: destino, omitBackground: fundo === 'transparent' })
    await pagina.close()
    console.log('gerado', arquivo)
  }
} finally {
  await navegador.close()
}

// favicon vetorial: terracota no tema claro, terracota clara na aba escura
const favicon = monograma
  .replace(/fill="currentColor"/g, `fill="${TERRACOTA}"`)
  .replace(
    /(<svg[^>]*>)/,
    `$1<style>@media (prefers-color-scheme: dark){path{fill:${TERRACOTA_CLARA}}}</style>`,
  )
writeFileSync(join(raiz, 'public/favicon.svg'), favicon)
console.log('gerado favicon.svg')
