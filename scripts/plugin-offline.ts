import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { createHash } from 'node:crypto'
import type { Plugin } from 'vite'

// Do que vai em public/, só o essencial para abrir o app sem internet.
// As fotos do espaço ficam de fora: são da página pública e entram no cache quando usadas.
const PUBLICOS = /^(manifest\.webmanifest|favicon\.svg|icones\/[^/]+\.png)$/

// Fontes: só o subconjunto latino (português). Os outros só baixam se a página pedir.
const FONTE_DE_OUTRO_ALFABETO = /(latin-ext|cyrillic|vietnamese|greek)/

function listar(pasta: string): string[] {
  const saida: string[] = []
  const andar = (atual: string) => {
    for (const nome of readdirSync(atual)) {
      const caminho = join(atual, nome)
      if (statSync(caminho).isDirectory()) andar(caminho)
      else saida.push(relative(pasta, caminho).split(sep).join('/'))
    }
  }
  andar(pasta)
  return saida
}

export function precachear(nome: string): boolean {
  if (nome.endsWith('.map')) return false
  if (nome === 'sw.js') return false
  // o SDK do Firebase só é baixado quando o app tem projeto configurado
  if (/firebase/i.test(nome)) return false
  if (/\.woff2?$/.test(nome) && FONTE_DE_OUTRO_ALFABETO.test(nome)) return false
  return true
}

export function servicoOffline(): Plugin {
  let pastaPublica = ''
  let raiz = ''
  return {
    name: 'servico-offline',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      pastaPublica = config.publicDir
      raiz = config.root
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return []
        // pré-carrega as duas fontes latinas para o texto não "pular" na primeira visita
        return Object.keys(ctx.bundle)
          .filter((nome) => /latin-wght-normal.*\.woff2$/.test(nome) && !FONTE_DE_OUTRO_ALFABETO.test(nome))
          .map((nome) => ({
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: nome, crossorigin: '' },
            injectTo: 'head' as const,
          }))
      },
    },
    generateBundle(_opcoes, bundle) {
      const doBundle = Object.keys(bundle).filter(precachear)
      const publicos = listar(pastaPublica).filter((nome) => PUBLICOS.test(nome))
      const arquivos = ['./', ...doBundle.filter((n) => n !== 'index.html'), ...publicos].sort()
      const hash = createHash('sha256')
      for (const nome of doBundle) {
        const item = bundle[nome]
        if (!item) continue
        hash.update(nome)
        hash.update(item.type === 'chunk' ? item.code : item.source)
      }
      for (const nome of publicos) hash.update(readFileSync(join(pastaPublica, nome)))
      const versao = hash.digest('hex').slice(0, 12)
      const modelo = readFileSync(join(raiz, 'src/pwa/sw.js'), 'utf8')
      const fonte = modelo
        .replace("/*VERSAO*/ 'dev'", JSON.stringify(versao))
        .replace('/*ARQUIVOS*/ []', JSON.stringify(arquivos))
      if (fonte === modelo) this.error('modelo do service worker sem os marcadores esperados')
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: fonte })
    },
  }
}

// Política de segurança de conteúdo para o site publicado. O GitHub Pages não deixa mandar
// cabeçalhos, então ela vai numa <meta>. O único script embutido (o que aplica o tema antes
// da primeira pintura) entra pelo hash; qualquer outro script embutido fica bloqueado.
export function politicaDeSeguranca(): Plugin {
  return {
    name: 'politica-de-seguranca',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          (m) => `'sha256-${createHash('sha256').update(m[1] ?? '').digest('base64')}'`,
        )
        const regras = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`.trim(),
          "style-src 'self'",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "connect-src 'self'",
          "manifest-src 'self'",
          "worker-src 'self'",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
        ]
        return [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: regras.join('; ') },
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  }
}
