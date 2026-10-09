// Pequenas regras de texto da interface, testáveis e sem depender do navegador.

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? ''
}

/** "Ana Souza" -> "Ana S." (cabe na linha da aula sem expor o nome inteiro) */
export function nomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  if (partes.length < 2) return partes[0] ?? ''
  return `${partes[0]} ${(partes[partes.length - 1] ?? '').charAt(0)}.`
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const primeira = partes[0]?.charAt(0) ?? ''
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.charAt(0) ?? '') : ''
  return (primeira + ultima).toUpperCase()
}

/** Para busca: minúsculas e sem acento ("Conceição" acha "conceicao"). */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** "5511900000012" -> "(11) 90000-0012" */
export function telefoneLegivel(digitos: string): string {
  const d = digitos.replace(/\D/g, '').replace(/^55/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return digitos
}

export function linkDoWhatsApp(digitos: string, mensagem = ''): string {
  const numero = digitos.replace(/\D/g, '')
  return `https://wa.me/${numero}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`
}

/** plural(1, 'vaga') -> "1 vaga"; plural(2, 'vaga') -> "2 vagas" */
export function plural(n: number, singular: string, pluralDaPalavra = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralDaPalavra}`
}

/** Junta nomes como se fala: "Ana", "Ana e Bia", "Ana, Bia e Caio" */
export function listaFalada(itens: readonly string[]): string {
  if (itens.length <= 1) return itens[0] ?? ''
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}
