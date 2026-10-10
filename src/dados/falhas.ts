// O que dizer quando uma gravação não entra no banco. Sem rede, a mudança fica na fila (ver
// estado.ts) e a pessoa é avisada; recusada pelas regras, a frase diz se é a conta que não tem
// o acesso ou se as regras publicadas estão velhas para esta versão do app (a tela só oferece o
// que a tabela de permissões deixa, então uma recusa do banco com a conta em dia é regra
// desatualizada). Puro: testável sem o SDK.

export type TipoDeFalha = 'rede' | 'permissao' | 'conta' | 'outra'

function codigoDe(erro: unknown): string {
  if (typeof erro !== 'object' || erro === null) return ''
  const codigo = (erro as { code?: unknown }).code
  return typeof codigo === 'string' ? codigo.replace(/^firestore\//, '') : ''
}

function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message : typeof erro === 'string' ? erro : ''
}

/** Erro que já nasce com a frase para a pessoa (ErroDeConta, do adaptador do Firebase). */
function temFrasePronta(erro: unknown): erro is Error {
  return erro instanceof Error && erro.name === 'ErroDeConta' && erro.message.length > 0
}

/** Classifica a falha de uma gravação: sem rede, recusada pelas regras, com frase pronta ou outra coisa. */
export function tipoDaFalha(erro: unknown, online = typeof navigator === 'undefined' ? true : navigator.onLine): TipoDeFalha {
  const codigo = codigoDe(erro)
  if (codigo === 'permission-denied') return 'permissao'
  if (temFrasePronta(erro)) return 'conta'
  if (!online) return 'rede'
  if (codigo === 'unavailable' || codigo === 'deadline-exceeded') return 'rede'
  // o Firestore "lite" fala por fetch: sem rede ele lança TypeError ("Failed to fetch", "Load failed")
  if (erro instanceof TypeError) return 'rede'
  if (/failed to fetch|load failed|networkerror|network request failed|fetch failed/i.test(mensagemDe(erro))) return 'rede'
  return 'outra'
}

export const FRASE_SEM_REDE = 'Sem internet agora. A mudança ficou na fila e entra no banco sozinha quando a conexão voltar.'
export const FRASE_FILA_GRAVADA = 'Conexão de volta: o que estava na fila foi gravado.'
export const FRASE_SEM_ACESSO = 'Sua conta não tem esse acesso. Fale com a administração do estúdio.'
export const FRASE_REGRAS_VELHAS =
  'O banco recusou a gravação: as regras do Firebase estão desatualizadas para esta versão do app. Peça para a administração publicar as regras novas.'
export const FRASE_OUTRA = 'Não deu para salvar. Tente de novo.'

/**
 * A frase para a pessoa. `acessoMudou` diz se, relendo o banco, o papel, o acesso ou as unidades
 * de quem gravou já não são os mesmos (ou nem a leitura passa): aí a recusa é da conta, não das regras.
 */
export function fraseDaFalha(tipo: Exclude<TipoDeFalha, 'conta'>, acessoMudou = false): string {
  if (tipo === 'rede') return FRASE_SEM_REDE
  if (tipo === 'permissao') return acessoMudou ? FRASE_SEM_ACESSO : FRASE_REGRAS_VELHAS
  return FRASE_OUTRA
}

/** A frase de um erro qualquer, quando não dá para reler o banco: a frase pronta, ou a do tipo. */
export function fraseDoErro(erro: unknown, acessoMudou = false): string {
  const tipo = tipoDaFalha(erro)
  return tipo === 'conta' ? mensagemDe(erro) : fraseDaFalha(tipo, acessoMudou)
}

/** O que importa para saber se o acesso de quem grava mudou entre a tela e o banco. */
export interface RetratoDoAcesso {
  ativo: boolean
  papel: string
  unidades: readonly string[]
}

export function acessoMudou(antes: RetratoDoAcesso | undefined, depois: RetratoDoAcesso | undefined): boolean {
  if (!antes || !depois) return true
  return antes.ativo !== depois.ativo || antes.papel !== depois.papel || [...antes.unidades].sort().join(',') !== [...depois.unidades].sort().join(',')
}
