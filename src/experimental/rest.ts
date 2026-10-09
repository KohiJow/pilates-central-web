// Leitura do documento público pela API REST do Firestore: uma requisição GET, sem SDK (a
// página pública fica leve e não carrega nada de login). A API devolve cada valor com o tipo
// junto ({ stringValue: 'x' }); aqui vira objeto simples.

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

/** Endereço REST de um documento (no emulador, http local; no projeto, a API do Google). */
export function enderecoDoDocumento(opcoes: { projeto: string; caminho: string; chave: string; emulador?: string }): string {
  const raiz = opcoes.emulador ?? 'https://firestore.googleapis.com'
  return `${raiz}/v1/projects/${opcoes.projeto}/databases/(default)/documents/${opcoes.caminho}?key=${encodeURIComponent(opcoes.chave)}`
}
