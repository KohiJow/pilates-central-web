// Entre o domínio e os documentos do Firestore. Sem nada do SDK: dá para testar sem emulador.
// Os documentos são quase iguais aos tipos do domínio; as diferenças moram aqui:
//  - o titular fica gravado como "administrador" na equipe; quem é titular diz o documento
//    estudio/posse (assim a passagem da conta mexe num documento só);
//  - o cadastro da equipe guarda o uid de quem aceitou o convite, que o domínio não conhece;
//  - marcações e reposições podem faltar no registro (o aluno grava só a dele).
import { completarConfiguracao } from '../../dominio/configuracao'
import type { Configuracao, Id, MembroEquipe, RegistroAula } from '../../dominio/tipos'

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

export function registroDoDocumento(d: Documento): RegistroAula {
  const r = d as Partial<RegistroAula>
  return { ...(r as RegistroAula), marcacoes: { ...(r.marcacoes ?? {}) }, reposicoes: { ...(r.reposicoes ?? {}) } }
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

function aplicarMapa<V extends string>(fresco: Record<string, V>, antes: Record<string, V>, depois: Record<string, V>) {
  const saida = { ...fresco }
  const chaves = new Set([...Object.keys(antes), ...Object.keys(depois)])
  for (const chave of chaves) {
    if (antes[chave] === depois[chave]) continue
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
  const base = fresco ?? { ...depois, marcacoes: {}, reposicoes: {} }
  const de = antes ?? { ...depois, marcacoes: {}, reposicoes: {} }
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

/** Convite gravado em convites/{email}: quem foi convidado lê o seu e aceita. */
export interface DocumentoDeConvite {
  email: string
  papel: 'administrador' | 'professor' | 'aluno'
  pessoaId: Id
  porId: Id
  criadoEm: string
}

/** Ligação da conta (uid) com a pessoa, em acessos/{uid}. */
export interface DocumentoDeAcesso {
  tipo: 'equipe' | 'aluno'
  pessoaId: Id
  email: string
  criadoEm: string
}
