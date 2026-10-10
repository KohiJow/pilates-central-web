// Entre o domínio e os documentos do Firestore. Sem nada do SDK: dá para testar sem emulador.
// Os documentos são quase iguais aos tipos do domínio; as diferenças moram aqui:
//  - o titular fica gravado como "administrador" na equipe; quem é titular diz o documento
//    estudio/posse (assim a passagem da conta mexe num documento só);
//  - o cadastro da equipe guarda o uid de quem aceitou o convite, que o domínio não conhece;
//  - marcações e reposições podem faltar no registro (o aluno grava só a dele).
import { completarConfiguracao } from '../../dominio/configuracao'
import type { Configuracao, Experimental, Id, MembroEquipe, RegistroAula } from '../../dominio/tipos'

/** Marca de "apagar este campo" (vira deleteField() na hora de gravar). */
export const APAGAR = Symbol('apagar')
export type Campos = Record<string, unknown>

type Documento = Record<string, unknown>

export function membroDoDocumento(d: Documento, titularMembroId: Id | undefined): MembroEquipe {
  const resto = { ...d }
  delete resto.uid
  const m = resto as unknown as MembroEquipe
  return { ...m, unidades: [...(m.unidades ?? [])], papel: m.id === titularMembroId ? 'titular' : m.papel }
}

/** O cadastro como vai para o banco: sem o papel de titular (ele mora na posse). */
export function documentoDoMembro(m: MembroEquipe): Documento {
  return semIndefinidos({ ...m, papel: m.papel === 'titular' ? 'administrador' : m.papel })
}

// ---------- quem vem experimentar, no registro da aula ----------
// No banco, cada pessoa vai numa linha de texto ('Nome|telefone' ou 'Nome|telefone|alunoId'):
// as regras conferem o mapa inteiro com uma expressão, como fazem com a página pública.

export function codificarExperimental(e: Experimental): string {
  const nome = e.nome.replace(/[|\n\r]/g, ' ')
  return e.alunoId ? `${nome}|${e.telefone}|${e.alunoId}` : `${nome}|${e.telefone}`
}

export function decodificarExperimental(v: unknown): Experimental | null {
  if (typeof v !== 'string') return null
  const [nome, telefone, alunoId] = v.split('|')
  if (!nome || telefone === undefined) return null
  return alunoId ? { nome, telefone, alunoId } : { nome, telefone }
}

function experimentaisDoDocumento(v: unknown): Record<Id, Experimental> | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const saida: Record<Id, Experimental> = {}
  for (const [id, texto] of Object.entries(v as Record<string, unknown>)) {
    const e = decodificarExperimental(texto)
    if (e) saida[id] = e
  }
  return Object.keys(saida).length ? saida : undefined
}

export function registroDoDocumento(d: Documento): RegistroAula {
  const r = d as Partial<RegistroAula>
  const experimentais = experimentaisDoDocumento(d.experimentais)
  const saida: RegistroAula = { ...(r as RegistroAula), marcacoes: { ...(r.marcacoes ?? {}) }, reposicoes: { ...(r.reposicoes ?? {}) } }
  if (experimentais) saida.experimentais = experimentais
  else delete saida.experimentais
  return saida
}

/** O registro como vai para o banco: sem undefined e com quem vem experimentar em texto. */
export function documentoDoRegistro(r: RegistroAula): Documento {
  const d = semIndefinidos(r)
  if (r.experimentais && Object.keys(r.experimentais).length) {
    d.experimentais = Object.fromEntries(Object.entries(r.experimentais).map(([id, e]) => [id, codificarExperimental(e)]))
  } else delete d.experimentais
  return d
}

export function configuracaoDoDocumento(d: Documento | undefined): Configuracao {
  return completarConfiguracao((d ?? {}) as Partial<Configuracao>)
}

/** Tira chaves com undefined (o Firestore recusa undefined). */
export function semIndefinidos<T extends object>(objeto: T): Documento {
  const saida: Documento = {}
  for (const [chave, valor] of Object.entries(objeto)) if (valor !== undefined) saida[chave] = valor
  return saida
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Campos de primeiro nível que mudaram de `antes` para `depois` (o que sumiu vira APAGAR).
 * Gravar só isso evita apagar o que outra pessoa mudou em outro campo no mesmo documento.
 */
export function camposAlterados(antes: Documento | undefined, depois: Documento): Campos {
  const saida: Campos = {}
  for (const [chave, valor] of Object.entries(depois)) {
    if (valor === undefined) continue
    if (!antes || !igual(antes[chave], valor)) saida[chave] = valor
  }
  if (antes) for (const chave of Object.keys(antes)) if (depois[chave] === undefined) saida[chave] = APAGAR
  return saida
}

function aplicarMapa<V>(fresco: Record<string, V>, antes: Record<string, V>, depois: Record<string, V>) {
  const saida = { ...fresco }
  const chaves = new Set([...Object.keys(antes), ...Object.keys(depois)])
  for (const chave of chaves) {
    if (igual(antes[chave], depois[chave])) continue
    const novo = depois[chave]
    if (novo === undefined) delete saida[chave]
    else saida[chave] = novo
  }
  return saida
}

/**
 * Leva para a versão mais nova do registro (`fresco`, lida agora do banco) só o que esta ação
 * mudou (de `antes` para `depois`), aluno por aluno. Duas pessoas fazendo a chamada da mesma
 * aula ao mesmo tempo não apagam a marcação uma da outra.
 */
export function mesclarRegistro(fresco: RegistroAula | undefined, antes: RegistroAula | undefined, depois: RegistroAula): RegistroAula {
  const base = fresco ?? { ...depois, marcacoes: {}, reposicoes: {}, experimentais: {} }
  const de = antes ?? { ...depois, marcacoes: {}, reposicoes: {}, experimentais: {} }
  const saida: RegistroAula = {
    ...base,
    id: depois.id,
    turmaId: depois.turmaId,
    unidadeId: depois.unidadeId,
    data: depois.data,
    marcacoes: aplicarMapa(base.marcacoes, de.marcacoes, depois.marcacoes),
    reposicoes: aplicarMapa(base.reposicoes, de.reposicoes, depois.reposicoes),
    atualizadoEm: depois.atualizadoEm,
  }
  const experimentais = aplicarMapa(base.experimentais ?? {}, de.experimentais ?? {}, depois.experimentais ?? {})
  if (Object.keys(experimentais).length) saida.experimentais = experimentais
  else delete saida.experimentais
  if (!igual(de.cancelamento, depois.cancelamento)) {
    if (depois.cancelamento) saida.cancelamento = depois.cancelamento
    else delete saida.cancelamento
  }
  return saida
}

export interface MudancaDeLista {
  adicionados: string[]
  removidos: string[]
}

export function mudancaDeLista(antes: readonly string[], depois: readonly string[]): MudancaDeLista {
  return {
    adicionados: depois.filter((x) => !antes.includes(x)),
    removidos: antes.filter((x) => !depois.includes(x)),
  }
}

/**
 * Convite gravado em convites/{email}: quem foi convidado lê o seu e aceita, até `expiraEm`
 * (milissegundos desde 1970; as regras do Firestore recusam o aceite depois disso).
 */
export interface DocumentoDeConvite {
  email: string
  papel: 'administrador' | 'professor' | 'aluno'
  pessoaId: Id
  porId: Id
  criadoEm: string
  expiraEm: number
}

/** Ligação da conta (uid) com a pessoa, em acessos/{uid}. */
export interface DocumentoDeAcesso {
  tipo: 'equipe' | 'aluno'
  pessoaId: Id
  email: string
  criadoEm: string
}
