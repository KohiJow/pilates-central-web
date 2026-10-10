// Trusted Types: com a política de segurança pedindo "require-trusted-types-for 'script'", o
// navegador só aceita HTML, script ou endereço de script vindos de uma política. O app nunca
// escreve HTML por texto (nada de innerHTML nem dangerouslySetInnerHTML), então a política padrão
// recusa tudo isso e libera só os endereços de script que o app usa de propósito: o service
// worker do próprio site e, com o App Check ligado, o reCAPTCHA. Navegador sem Trusted Types
// ignora a diretiva e segue como antes.

interface PoliticaDeConfianca {
  createHTML?: (texto: string) => string
  createScript?: (texto: string) => string
  createScriptURL?: (url: string) => string
}

interface FabricaDePoliticas {
  createPolicy(nome: string, regras: PoliticaDeConfianca): unknown
}

/** De onde um script pode ser carregado por endereço (prefixos). */
export function enderecosDeScriptPermitidos(origem: string, base: string, comRecaptcha: boolean): string[] {
  const proprios = [`${origem}${base}sw.js`]
  return comRecaptcha ? [...proprios, 'https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/'] : proprios
}

/**
 * O endereço chega como foi escrito no código (o service worker é registrado por um caminho
 * relativo, "/pilates-central-web/sw.js"): resolve contra a página antes de comparar.
 */
export function enderecoDeScriptPermitido(url: string, permitidos: readonly string[], pagina: string): boolean {
  let absoluto: string
  try {
    absoluto = new URL(url, pagina).href
  } catch {
    return false
  }
  return permitidos.some((p) => (p.endsWith('/') ? absoluto.startsWith(p) : absoluto === p || absoluto.startsWith(`${p}?`)))
}

export function instalarPoliticaDeConfianca(comRecaptcha: boolean): void {
  const fabrica = (window as Window & { trustedTypes?: FabricaDePoliticas }).trustedTypes
  if (!fabrica) return
  const permitidos = enderecosDeScriptPermitidos(location.origin, import.meta.env.BASE_URL, comRecaptcha)
  try {
    fabrica.createPolicy('default', {
      createHTML: () => {
        throw new TypeError('o app não escreve HTML por texto')
      },
      createScript: () => {
        throw new TypeError('o app não executa script por texto')
      },
      createScriptURL: (url) => {
        if (enderecoDeScriptPermitido(url, permitidos, location.href)) return url
        throw new TypeError('endereço de script fora da política')
      },
    })
  } catch {
    // a política padrão já existe (a página foi montada duas vezes): vale a primeira
  }
}
