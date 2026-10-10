// Leitura do documento público pela API REST do Firestore: uma requisição GET, sem SDK (a
// página pública fica leve e não carrega nada de login). A API devolve cada valor com o tipo
// junto ({ stringValue: 'x' }); aqui vira objeto simples.
import { CONFIGURACAO_PADRAO, ehInstagramValido, ehLinkDoMapaValido, TAMANHOS } from '../dominio/configuracao'
import { decodificarHorario, decodificarUnidade, MAXIMO_DE_HORARIOS } from '../dominio/projecoes'
import type { PaginaPublica } from '../dominio/tipos'

export interface ValorDoFirestore {
  stringValue?: string
  integerValue?: string
  doubleValue?: number
  booleanValue?: boolean
  nullValue?: null
  timestampValue?: string
  mapValue?: { fields?: Record<string, ValorDoFirestore> }
  arrayValue?: { values?: ValorDoFirestore[] }
}

export function decodificar(v: ValorDoFirestore): unknown {
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue
  if ('mapValue' in v) return decodificarCampos(v.mapValue?.fields ?? {})
  if ('arrayValue' in v) return (v.arrayValue?.values ?? []).map(decodificar)
  return null
}

export function decodificarCampos(campos: Record<string, ValorDoFirestore>): Record<string, unknown> {
  const saida: Record<string, unknown> = {}
  for (const [chave, valor] of Object.entries(campos)) saida[chave] = decodificar(valor)
  return saida
}

const RE_WHATSAPP = /^[0-9]{10,15}$/

const texto = (v: unknown, max: number): string | null => (typeof v === 'string' && v.length <= max ? v : null)

/** As unidades do documento (mapa id -> 'nome|endereco'), em ordem de nome; o que não tem a forma fica de fora. */
function unidadesDe(v: unknown): PaginaPublica['unidades'] {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return []
  return Object.entries(v as Record<string, unknown>)
    .slice(0, 10)
    .map(([id, texto]) => decodificarUnidade(id, texto))
    .filter((u) => u !== null)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/**
 * O documento público como a página usa, conferido campo a campo. As regras do banco já conferem
 * cada horário e cada unidade quando a equipe grava, mas a página confere de novo: um documento
 * de antes das regras (ou um emulador sem elas) não pode derrubar a página de quem nunca viu o
 * estúdio. O que não tem a forma esperada fica de fora, com os mesmos tetos das regras.
 */
export function paginaPublicaDe(campos: Record<string, unknown>): PaginaPublica {
  const lista = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : [])
  const nome = texto(campos.nomeEstudio, TAMANHOS.nomeEstudio)
  const whatsapp = typeof campos.whatsapp === 'string' && RE_WHATSAPP.test(campos.whatsapp) ? campos.whatsapp : ''
  const linkDoMapa = texto(campos.linkDoMapa, TAMANHOS.linkDoMapa) ?? ''
  const instagram = texto(campos.instagram, TAMANHOS.instagram) ?? ''
  return {
    nomeEstudio: nome && nome.trim().length >= 2 ? nome : CONFIGURACAO_PADRAO.nomeEstudio,
    whatsapp,
    fraseCurta: texto(campos.fraseCurta, TAMANHOS.fraseCurta) ?? '',
    focos: lista(campos.focos, TAMANHOS.focos).filter((f): f is string => typeof f === 'string' && f.length > 0 && f.length <= TAMANHOS.foco),
    endereco: texto(campos.endereco, TAMANHOS.endereco) ?? '',
    // só um link https vira link na página; qualquer outra coisa é ignorada
    linkDoMapa: ehLinkDoMapaValido(linkDoMapa) ? linkDoMapa : '',
    instagram: ehInstagramValido(instagram) ? instagram : '',
    unidades: unidadesDe(campos.unidades),
    experimental: campos.experimental === true,
    horarios: lista(campos.horarios, MAXIMO_DE_HORARIOS)
      .map(decodificarHorario)
      .filter((h) => h !== null),
    atualizadoEm: texto(campos.atualizadoEm, 40) ?? '',
  }
}

/** Quanto tempo a leitura do documento público vale na sessão do navegador. */
export const VALIDADE_DO_CACHE_MS = 10 * 60_000

interface CacheDaPagina {
  projeto: string
  lidoEm: number
  campos: Record<string, unknown>
}

/** Os campos guardados na sessão, se forem deste projeto e ainda valerem; senão null. */
export function lerCacheDaPagina(texto: string | null, projeto: string, agora: number, validade = VALIDADE_DO_CACHE_MS): Record<string, unknown> | null {
  if (!texto) return null
  try {
    const c = JSON.parse(texto) as Partial<CacheDaPagina>
    if (c.projeto !== projeto || typeof c.lidoEm !== 'number' || typeof c.campos !== 'object' || c.campos === null) return null
    if (agora < c.lidoEm || agora - c.lidoEm > validade) return null
    return c.campos as Record<string, unknown>
  } catch {
    return null
  }
}

export function guardarCacheDaPagina(projeto: string, agora: number, campos: Record<string, unknown>): string {
  const c: CacheDaPagina = { projeto, lidoEm: agora, campos }
  return JSON.stringify(c)
}

/** Endereço REST de um documento (no emulador, http local; no projeto, a API do Google). */
export function enderecoDoDocumento(opcoes: { projeto: string; caminho: string; chave: string; emulador?: string }): string {
  const raiz = opcoes.emulador ?? 'https://firestore.googleapis.com'
  return `${raiz}/v1/projects/${opcoes.projeto}/databases/(default)/documents/${opcoes.caminho}?key=${encodeURIComponent(opcoes.chave)}`
}
