// Prazo dos convites: todo convite nasce com expiraEm dentro da validade combinada nas
// configurações (7 dias por padrão), e o aceite depois do prazo é recusado, para a equipe e para
// o aluno. Mandar de novo é gravar o convite outra vez, com prazo novo.
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteField, doc, setDoc, writeBatch } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { banco, CONFIG, criarAmbiente, EMAILS, expiraEm, semear, uidDe } from './cenario'
import type { Quem } from './cenario'

let ambiente: RulesTestEnvironment

beforeAll(async () => {
  ambiente = await criarAmbiente()
})

afterAll(async () => {
  await ambiente?.cleanup()
})

beforeEach(async () => {
  await semear(ambiente)
})

const como = (quem: Quem): Firestore => banco(ambiente, quem)
const instante = '2026-10-09T12:00:00.000Z'
const DIA = 86_400_000

/** Um convite de professor para um cadastro novo, no mesmo lote (as regras conferem um contra o outro). */
function convidarProfessor(email: string, membroId: string, prazo: number | undefined) {
  const db = como('adm')
  const b = writeBatch(db)
  b.set(doc(db, `equipe/${membroId}`), {
    id: membroId,
    nome: 'Pessoa Nova',
    papel: 'professor',
    email,
    telefone: '',
    unidades: ['u-centro'],
    ativo: true,
    convite: { enviadoEm: instante, porId: 'e-adm' },
  })
  const convite: Record<string, unknown> = { email, papel: 'professor', pessoaId: membroId, porId: 'e-adm', criadoEm: instante }
  if (prazo !== undefined) convite.expiraEm = prazo
  b.set(doc(db, `convites/${email}`), convite)
  return b.commit()
}

/** O convidado aceita (cria o acesso, grava o uid e apaga o convite), como o app faz. */
function aceitar(quem: Quem, membroId: string, email: string) {
  const db = como(quem)
  const uid = uidDe(quem as Exclude<Quem, 'anonimo'>)
  const b = writeBatch(db)
  b.set(doc(db, `acessos/${uid}`), { tipo: 'equipe', pessoaId: membroId, email, criadoEm: instante })
  b.update(doc(db, `equipe/${membroId}`), { uid, convite: deleteField() })
  b.delete(doc(db, `convites/${email}`))
  return b.commit()
}

async function semRegras(acao: (db: Firestore) => Promise<void>) {
  await ambiente.withSecurityRulesDisabled(async (ctx) => acao(ctx.firestore() as unknown as Firestore))
}

describe('o convite nasce com prazo', () => {
  it('dentro da validade combinada passa; sem prazo, no passado ou além da validade, não', async () => {
    await assertSucceeds(convidarProfessor('p1@example.com', 'e-p1', expiraEm(7)))
    await assertSucceeds(convidarProfessor('p2@example.com', 'e-p2', expiraEm(1)))
    await assertFails(convidarProfessor('p3@example.com', 'e-p3', undefined))
    await assertFails(convidarProfessor('p4@example.com', 'e-p4', Date.now() - 60_000))
    // 7 dias combinados, mais um de folga para o relógio do aparelho: 9 passa do limite
    await assertFails(convidarProfessor('p5@example.com', 'e-p5', expiraEm(9)))
  })

  it('a validade vem da configuração: com 30 dias, um convite de 30 dias passa', async () => {
    await semRegras((db) => setDoc(doc(db, 'configuracao/estudio'), { ...CONFIG, validadeDoConviteDias: 30 }))
    await assertSucceeds(convidarProfessor('p6@example.com', 'e-p6', expiraEm(30)))
    await assertFails(convidarProfessor('p7@example.com', 'e-p7', expiraEm(32)))
  })

  it('o convite de aluno segue o mesmo prazo', async () => {
    const db = como('adm')
    const email = 'aluno4@example.com'
    const b = writeBatch(db)
    b.update(doc(db, 'alunos/a-4'), { acesso: { convidadoEm: instante, porId: 'e-adm' } })
    b.set(doc(db, `convites/${email}`), { email, papel: 'aluno', pessoaId: 'a-4', porId: 'e-adm', criadoEm: instante, expiraEm: expiraEm(7) })
    await assertSucceeds(b.commit())
    const c = writeBatch(db)
    c.set(doc(db, `convites/${email}`), { email, papel: 'aluno', pessoaId: 'a-4', porId: 'e-adm', criadoEm: instante })
    await assertFails(c.commit())
  })

  it('a configuração pede a validade entre 1 e 90 dias', async () => {
    const db = como('adm')
    await assertSucceeds(setDoc(doc(db, 'configuracao/estudio'), { ...CONFIG, validadeDoConviteDias: 90 }))
    await assertFails(setDoc(doc(db, 'configuracao/estudio'), { ...CONFIG, validadeDoConviteDias: 0 }))
    await assertFails(setDoc(doc(db, 'configuracao/estudio'), { ...CONFIG, validadeDoConviteDias: 91 }))
    const semValidade: Record<string, unknown> = { ...CONFIG }
    delete semValidade.validadeDoConviteDias
    await assertFails(setDoc(doc(db, 'configuracao/estudio'), semValidade))
  })
})

describe('o aceite respeita o prazo', () => {
  it('convite vencido não entra: nem a equipe, nem o aluno; mandado de novo, entra', async () => {
    await semRegras((db) => setDoc(doc(db, `convites/${EMAILS.convidado}`), { email: EMAILS.convidado, papel: 'professor', pessoaId: 'e-convidado', porId: 'e-titular', criadoEm: instante, expiraEm: Date.now() - DIA }))
    await assertFails(aceitar('convidado', 'e-convidado', EMAILS.convidado))

    await semRegras((db) => setDoc(doc(db, `convites/${EMAILS.aluno3}`), { email: EMAILS.aluno3, papel: 'aluno', pessoaId: 'a-3', porId: 'e-titular', criadoEm: instante, expiraEm: Date.now() - DIA }))
    const aluno = como('aluno3')
    const b = writeBatch(aluno)
    b.set(doc(aluno, 'acessos/uid-aluno3'), { tipo: 'aluno', pessoaId: 'a-3', email: EMAILS.aluno3, criadoEm: instante })
    b.delete(doc(aluno, `convites/${EMAILS.aluno3}`))
    await assertFails(b.commit())

    // a administração manda de novo (o mesmo documento, com prazo novo) e o aceite passa
    await assertSucceeds(
      setDoc(doc(como('adm'), `convites/${EMAILS.convidado}`), { email: EMAILS.convidado, papel: 'professor', pessoaId: 'e-convidado', porId: 'e-adm', criadoEm: instante, expiraEm: expiraEm(7) }),
    )
    await assertSucceeds(aceitar('convidado', 'e-convidado', EMAILS.convidado))
  })

  it('um convite antigo, sem prazo, não vale mais', async () => {
    await semRegras((db) => setDoc(doc(db, `convites/${EMAILS.convidado}`), { email: EMAILS.convidado, papel: 'professor', pessoaId: 'e-convidado', porId: 'e-titular', criadoEm: instante }))
    await assertFails(aceitar('convidado', 'e-convidado', EMAILS.convidado))
  })

  it('revogado (acesso desligado e convite apagado), a pessoa não entra; convidada de novo, entra', async () => {
    const adm = como('adm')
    const b = writeBatch(adm)
    b.update(doc(adm, 'equipe/e-convidado'), { ativo: false })
    b.delete(doc(adm, `convites/${EMAILS.convidado}`))
    await assertSucceeds(b.commit())
    await assertFails(aceitar('convidado', 'e-convidado', EMAILS.convidado))
    const c = writeBatch(adm)
    c.update(doc(adm, 'equipe/e-convidado'), { ativo: true, convite: { enviadoEm: instante, porId: 'e-adm' } })
    c.set(doc(adm, `convites/${EMAILS.convidado}`), { email: EMAILS.convidado, papel: 'professor', pessoaId: 'e-convidado', porId: 'e-adm', criadoEm: instante, expiraEm: expiraEm(7) })
    await assertSucceeds(c.commit())
    await assertSucceeds(aceitar('convidado', 'e-convidado', EMAILS.convidado))
  })
})
