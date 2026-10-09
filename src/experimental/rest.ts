// Leitura do documento público pela API REST do Firestore: uma requisição GET, sem SDK (a
// página pública fica leve e não carrega nada de login). A API devolve cada valor com o tipo
// junto ({ stringValue: 'x' }); aqui vira objeto simples.
import { CONFIGURACAO_PADRAO } from '../dominio/configuracao'
import { ehDataValida, ehHoraValida } from '../dominio/datas'
import { MAXIMO_DE_HORARIOS } from '../dominio/projecoes'
import type { HorarioPublico, PaginaPublica } from '../dominio/tipos'

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

const RE_ID = /^[A-Za-z0-9_-]{1,120}$/
const RE_WHATSAPP = /^[0-9]{10,15}$/

const texto = (v: unknown, max: number): string | null => (typeof v === 'string' && v.length <= max ? v : null)

function horarioDe(v: unknown): HorarioPublico | null {
  if (typeof v !== 'object' || v === null) return null
  const h = v as Record<string, unknown>
  const { data, inicio, fim, unidadeId, vagas } = h
  if (typeof data !== 'string' || !ehDataValida(data)) return null
  if (typeof inicio !== 'string' || !ehHoraValida(inicio) || typeof fim !== 'string' || !ehHoraValida(fim)) return null
  if (typeof unidadeId !== 'string' || !RE_ID.test(unidadeId)) return null
  if (typeof vagas !== 'number' || !Number.isInteger(vagas) || vagas < 0 || vagas > 30) return null
  return { data, inicio, fim, unidadeId, vagas }
}

function unidadeDe(v: unknown): PaginaPublica['unidades'][number] | null {
  if (typeof v !== 'object' || v === null) return null
  const u = v as Record<string, unknown>
  const nome = texto(u.nome, 60)
  const endereco = texto(u.endereco ?? '', 160)
  if (typeof u.id !== 'string' || !RE_ID.test(u.id) || !nome || endereco === null) return null
  return { id: u.id, nome, endereco }
}

/**
 * O documento público como a página usa, conferido campo a campo. Quem grava é a equipe (o
 * professor inclusive, só os horários), e as regras do banco não conseguem olhar cada item de
 * uma lista: um horário torto derrubaria a página inteira de quem nunca viu o estúdio. O que não
 * tem a forma esperada fica de fora, com os mesmos tetos das regras.
 */
export function paginaPublicaDe(campos: Record<string, unknown>): PaginaPublica {
  const lista = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : [])
  const nome = texto(campos.nomeEstudio, 80)
  const whatsapp = typeof campos.whatsapp === 'string' && RE_WHATSAPP.test(campos.whatsapp) ? campos.whatsapp : ''
  return {
    nomeEstudio: nome && nome.trim().length >= 2 ? nome : CONFIGURACAO_PADRAO.nomeEstudio,
    whatsapp,
    unidades: lista(campos.unidades, 10)
      .map(unidadeDe)
      .filter((u) => u !== null),
    experimental: campos.experimental === true,
    horarios: lista(campos.horarios, MAXIMO_DE_HORARIOS)
      .map(horarioDe)
      .filter((h) => h !== null),
    atualizadoEm: texto(campos.atualizadoEm, 40) ?? '',
  }
}

/** Endereço REST de um documento (no emulador, http local; no projeto, a API do Google). */
export function enderecoDoDocumento(opcoes: { projeto: string; caminho: string; chave: string; emulador?: string }): string {
  const raiz = opcoes.emulador ?? 'https://firestore.googleapis.com'
  return `${raiz}/v1/projects/${opcoes.projeto}/databases/(default)/documents/${opcoes.caminho}?key=${encodeURIComponent(opcoes.chave)}`
}
