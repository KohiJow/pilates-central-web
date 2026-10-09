// Quem é a conta que entrou: equipe, aluno, convidado ou o primeiro acesso do estúdio.
// O papel nunca vem do aparelho: vem de acessos/{uid}, que só a própria pessoa cria e só a
// partir de um convite para o e-mail dela (as regras conferem).
import { deleteField, doc, getDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore/lite'
import { CONFIGURACAO_PADRAO } from '../../dominio/configuracao'
import { ehEmailValido } from '../../dominio/texto'
import type { Id } from '../../dominio/tipos'
import type { Usuario } from './autenticacao'
import { ErroDeConta } from './autenticacao'
import type { DocumentoDeAcesso, DocumentoDeConvite } from './conversao'
import type { Sdk } from './sdk'

export type Acesso =
  | { tipo: 'equipe'; membroId: Id }
  | { tipo: 'aluno'; alunoId: Id }
  /** ninguém reivindicou o estúdio ainda */
  | { tipo: 'primeiroAcesso' }
  | { tipo: 'semConvite' }

function codigoDe(erro: unknown): string {
  return typeof erro === 'object' && erro !== null && 'code' in erro ? String((erro as { code: unknown }).code) : ''
}

/** Lê o acesso da conta; se não houver, aceita o convite do e-mail dela (quando existe). */
export async function resolverAcesso(sdk: Sdk, u: Usuario): Promise<Acesso> {
  const acesso = await getDoc(doc(sdk.db, 'acessos', u.uid))
  if (acesso.exists()) {
    const a = acesso.data() as DocumentoDeAcesso
    return a.tipo === 'aluno' ? { tipo: 'aluno', alunoId: a.pessoaId } : { tipo: 'equipe', membroId: a.pessoaId }
  }
  const convite = await getDoc(doc(sdk.db, 'convites', u.email))
  if (convite.exists()) {
    const c = convite.data() as DocumentoDeConvite
    await aceitarConvite(sdk, u, c)
    return c.papel === 'aluno' ? { tipo: 'aluno', alunoId: c.pessoaId } : { tipo: 'equipe', membroId: c.pessoaId }
  }
  const posse = await getDoc(doc(sdk.db, 'estudio', 'posse'))
  return posse.exists() ? { tipo: 'semConvite' } : { tipo: 'primeiroAcesso' }
}

async function aceitarConvite(sdk: Sdk, u: Usuario, c: DocumentoDeConvite): Promise<void> {
  const lote = writeBatch(sdk.db)
  const acesso: DocumentoDeAcesso = {
    tipo: c.papel === 'aluno' ? 'aluno' : 'equipe',
    pessoaId: c.pessoaId,
    email: u.email,
    criadoEm: new Date().toISOString(),
  }
  lote.set(doc(sdk.db, 'acessos', u.uid), acesso)
  if (c.papel !== 'aluno') lote.update(doc(sdk.db, 'equipe', c.pessoaId), { uid: u.uid, convite: deleteField() })
  lote.delete(doc(sdk.db, 'convites', u.email))
  try {
    await lote.commit()
  } catch (erro) {
    if (codigoDe(erro) === 'permission-denied') {
      throw new ErroDeConta('O convite para este e-mail não vale mais. Peça um convite novo à administração do estúdio.')
    }
    throw erro
  }
}

export interface DadosDoPrimeiroAcesso {
  nome: string
  telefone: string
  nomeEstudio: string
}

/**
 * Primeiro acesso: a conta vira responsável pelo estúdio. Posse, cadastro e acesso vão juntos
 * (as regras só aceitam os três de uma vez, e só se ninguém reivindicou antes).
 */
export async function reivindicarEstudio(sdk: Sdk, u: Usuario, d: DadosDoPrimeiroAcesso): Promise<Id> {
  if (!ehEmailValido(u.email)) throw new ErroDeConta('Conta sem e-mail válido.')
  const membroId = `e-${u.uid.slice(0, 10)}`
  const lote = writeBatch(sdk.db)
  lote.set(doc(sdk.db, 'estudio', 'posse'), { titularUid: u.uid, titularMembroId: membroId, criadoEm: serverTimestamp() })
  lote.set(doc(sdk.db, 'equipe', membroId), {
    id: membroId,
    nome: d.nome.trim(),
    papel: 'administrador',
    email: u.email,
    telefone: d.telefone,
    unidades: [],
    ativo: true,
    uid: u.uid,
  })
  const acesso: DocumentoDeAcesso = { tipo: 'equipe', pessoaId: membroId, email: u.email, criadoEm: new Date().toISOString() }
  lote.set(doc(sdk.db, 'acessos', u.uid), acesso)
  try {
    await lote.commit()
  } catch (erro) {
    if (codigoDe(erro) === 'permission-denied') {
      throw new ErroDeConta(
        'Este e-mail não é o combinado para o primeiro acesso, ou o estúdio já tem responsável. Confira com quem criou o projeto.',
      )
    }
    throw erro
  }
  // já como administração: a configuração inicial do estúdio
  await setDoc(doc(sdk.db, 'configuracao', 'estudio'), { ...CONFIGURACAO_PADRAO, nomeEstudio: d.nomeEstudio.trim() || 'Pilates Central' })
  return membroId
}
