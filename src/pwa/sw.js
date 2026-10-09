// @ts-check
/// <reference lib="webworker" />

// Modelo do service worker. No build, o plugin em scripts/plugin-offline.ts troca os dois
// marcadores abaixo pela versão e pela lista de arquivos do app.
const VERSAO = /*VERSAO*/ 'dev'
const ARQUIVOS = /** @type {string[]} */ (/*ARQUIVOS*/ [])

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self))
const PREFIXO = 'pilates-central-'
const CACHE = PREFIXO + VERSAO
const ESPERA_DA_REDE_MS = 4000

/** @param {string} caminho */
const noEscopo = (caminho) => new URL(caminho, sw.registration.scope).href

sw.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await cache.addAll(ARQUIVOS.map(noEscopo))
      await sw.skipWaiting()
    })(),
  )
})

sw.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      for (const nome of await caches.keys()) {
        if (nome.startsWith(PREFIXO) && nome !== CACHE) await caches.delete(nome)
      }
      await sw.clients.claim()
    })(),
  )
})

sw.addEventListener('fetch', (evento) => {
  const pedido = evento.request
  if (pedido.method !== 'GET') return
  const url = new URL(pedido.url)
  // Firebase, fontes de terceiros e afins seguem direto para a rede
  if (url.origin !== sw.location.origin || !pedido.url.startsWith(sw.registration.scope)) return
  if (pedido.mode === 'navigate') {
    evento.respondWith(navegar(pedido))
    return
  }
  evento.respondWith(primeiroCache(pedido))
})

/**
 * Página: tenta a rede (para pegar versão nova) e cai na cópia guardada quando não há internet
 * ou a rede demora demais.
 * @param {Request} pedido
 */
async function navegar(pedido) {
  const indice = noEscopo('./')
  try {
    const resposta = await comPrazo(fetch(pedido), ESPERA_DA_REDE_MS)
    if (resposta.ok) {
      const cache = await caches.open(CACHE)
      await cache.put(indice, resposta.clone())
    }
    return resposta
  } catch {
    const guardada = await caches.match(indice)
    return guardada ?? Response.error()
  }
}

/**
 * Arquivos com hash no nome nunca mudam: cache primeiro, rede depois (e guarda o que vier).
 * @param {Request} pedido
 */
async function primeiroCache(pedido) {
  const guardada = await caches.match(pedido)
  if (guardada) return guardada
  const resposta = await fetch(pedido)
  if (resposta.ok && resposta.type === 'basic') {
    const cache = await caches.open(CACHE)
    await cache.put(pedido, resposta.clone())
  }
  return resposta
}

/**
 * @template T
 * @param {Promise<T>} promessa
 * @param {number} ms
 * @returns {Promise<T>}
 */
function comPrazo(promessa, ms) {
  return new Promise((resolver, rejeitar) => {
    const relogio = setTimeout(() => rejeitar(new Error('rede lenta')), ms)
    promessa.then(
      (valor) => {
        clearTimeout(relogio)
        resolver(valor)
      },
      (erro) => {
        clearTimeout(relogio)
        rejeitar(erro)
      },
    )
  })
}
