// Tentativas de quebrar as regras feitas na revisão de segurança, como cada papel e como
// anônimo. Cada furo achado virou um caso aqui (e a correção em firestore.rules); os casos que
// já eram recusados ficam para não voltarem a passar.
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, increment, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { AMANHA, aulaId, banco, credito, criarAmbiente, DEPOIS, EMAILS, LOGO, semear, vagaDe } from './cenario'
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

async function semRegras(acao: (db: Firestore) => Promise<unknown>) {
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    await acao(ctx.firestore() as unknown as Firestore)
  })
}

async function ler(caminho: string): Promise<Record<string, unknown> | undefined> {
  let dados: Record<string, unknown> | undefined
  await semRegras(async (db) => {
    dados = (await getDoc(doc(db, caminho))).data()
  })
  return dados
}

const AULA = aulaId('t-1', AMANHA.data)
const CREDITO_DO_AVISO = `cr_a-1_t-1_${AMANHA.data}`
const AULA_LIVRE = aulaId('t-livre', DEPOIS.data)

function validade(data: string, dias: number): string {
  const d = new Date(`${data}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** O aviso de falta de a-1 na aula de amanhã, como o app grava. */
function avisar(db: Firestore) {
  const b = writeBatch(db)
  b.set(
    doc(db, `registros/${AULA}`),
    { id: AULA, turmaId: 't-1', unidadeId: 'u-centro', data: AMANHA.data, marcacoes: { 'a-1': 'avisou' }, atualizadoEm: instante },
    { merge: true },
  )
  b.set(
    doc(db, `creditos/${CREDITO_DO_AVISO}`),
    credito(CREDITO_DO_AVISO, 'a-1', { turmaId: 't-1', data: AMANHA.data }, { validoAte: validade(AMANHA.data, 30) }),
  )
  b.update(doc(db, `vagas/${AULA}`), { ocupadas: increment(-1), atualizadoEm: instante })
  return b.commit()
}

/** Desfazer o aviso: a marcação sai e o lugar volta; o crédito sai só se `devolverCredito`. */
function desfazerAviso(db: Firestore, devolverCredito: boolean, aula = AULA, creditoId = CREDITO_DO_AVISO) {
  const b = writeBatch(db)
  b.update(doc(db, `registros/${aula}`), { 'marcacoes.a-1': deleteField(), atualizadoEm: instante })
  if (devolverCredito) b.delete(doc(db, `creditos/${creditoId}`))
  b.update(doc(db, `vagas/${aula}`), { ocupadas: increment(1), atualizadoEm: instante })
  return b.commit()
}

function encaixar(db: Firestore, creditoId: string, aula: string, turmaId: string, data: string) {
  const b = writeBatch(db)
  b.set(
    doc(db, `registros/${aula}`),
    { id: aula, turmaId, unidadeId: 'u-centro', data, reposicoes: { 'a-1': creditoId }, atualizadoEm: instante },
    { merge: true },
  )
  b.update(doc(db, `creditos/${creditoId}`), { usadoEm: { turmaId, data } })
  b.update(doc(db, `vagas/${aula}`), { ocupadas: increment(1), atualizadoEm: instante })
  return b.commit()
}

describe('aluno: desfazer o aviso devolve o crédito', () => {
  it('desfazer o aviso e ficar com a reposição é recusado', async () => {
    await assertSucceeds(avisar(como('aluno')))
    // antes: o lugar voltava e o crédito ficava, uma aula de graça
    await assertFails(desfazerAviso(como('aluno'), false))
    await assertSucceeds(desfazerAviso(como('aluno'), true))
  })

  it('com o crédito já usado em outra aula, o aviso não se desfaz (nem apagando o crédito)', async () => {
    await assertSucceeds(avisar(como('aluno')))
    await assertSucceeds(encaixar(como('aluno'), CREDITO_DO_AVISO, AULA_LIVRE, 't-livre', DEPOIS.data))
    await assertFails(desfazerAviso(como('aluno'), false))
    await assertFails(desfazerAviso(como('aluno'), true))
    const marcacoes = (await ler(`registros/${AULA}`))?.marcacoes as Record<string, string>
    if (marcacoes['a-1'] !== 'avisou') throw new Error('o aviso deveria continuar')
  })

  it('aviso sem crédito (limite do mês atingido) ainda se desfaz', async () => {
    const db = como('aluno')
    const b = writeBatch(db)
    b.set(
      doc(db, `registros/${AULA}`),
      { id: AULA, turmaId: 't-1', unidadeId: 'u-centro', data: AMANHA.data, marcacoes: { 'a-1': 'avisou' }, atualizadoEm: instante },
      { merge: true },
    )
    b.update(doc(db, `vagas/${AULA}`), { ocupadas: increment(-1), atualizadoEm: instante })
    await assertSucceeds(b.commit())
    await assertSucceeds(desfazerAviso(db, false))
  })

  it('crédito de cortesia da administração para a mesma aula não some no desfazer do aluno', async () => {
    await assertSucceeds(avisar(como('aluno')))
    await semRegras((db) => updateDoc(doc(db, `creditos/${CREDITO_DO_AVISO}`), { motivo: 'cortesia' }))
    await assertFails(desfazerAviso(como('aluno'), true))
    await assertFails(desfazerAviso(como('aluno'), false))
  })

  it('fora do prazo o aviso não se desfaz', async () => {
    const aula = aulaId('t-1', LOGO.data)
    const id = `cr_a-1_t-1_${LOGO.data}`
    await semRegras(async (db) => {
      await setDoc(doc(db, `registros/${aula}`), {
        id: aula,
        turmaId: 't-1',
        unidadeId: 'u-centro',
        data: LOGO.data,
        marcacoes: { 'a-1': 'avisou' },
        reposicoes: {},
        atualizadoEm: instante,
      })
      await setDoc(doc(db, `creditos/${id}`), credito(id, 'a-1', { turmaId: 't-1', data: LOGO.data }))
      await updateDoc(doc(db, `vagas/${aula}`), { ocupadas: 2 })
    })
    await assertFails(desfazerAviso(como('aluno'), true, aula, id))
  })

  it('o lugar que o aviso abriu e alguém ocupou não volta', async () => {
    await assertSucceeds(avisar(como('aluno')))
    await semRegras((db) => updateDoc(doc(db, `vagas/${AULA}`), { ocupadas: 4 }))
    await assertFails(desfazerAviso(como('aluno'), true))
  })
})

describe('aluno: mexer no que é dos outros', () => {
  it('não apaga o aviso nem a reposição de outro aluno', async () => {
    await semRegras(async (db) => {
      await setDoc(doc(db, `registros/${AULA}`), {
        id: AULA,
        turmaId: 't-1',
        unidadeId: 'u-centro',
        data: AMANHA.data,
        marcacoes: { 'a-2': 'avisou' },
        reposicoes: { 'a-5': 'cr-x' },
        atualizadoEm: instante,
      })
      await updateDoc(doc(db, `vagas/${AULA}`), { ocupadas: 2 })
    })
    const db = como('aluno')
    const b = writeBatch(db)
    b.update(doc(db, `registros/${AULA}`), { 'marcacoes.a-2': deleteField(), atualizadoEm: instante })
    b.update(doc(db, `vagas/${AULA}`), { ocupadas: increment(1), atualizadoEm: instante })
    await assertFails(b.commit())
    const c = writeBatch(db)
    c.update(doc(db, `registros/${AULA}`), { 'reposicoes.a-5': deleteField(), atualizadoEm: instante })
    c.update(doc(db, `vagas/${AULA}`), { ocupadas: increment(-1), atualizadoEm: instante })
    await assertFails(c.commit())
  })

  it('não apaga, não gasta e não devolve o crédito de outro aluno', async () => {
    const db = como('aluno')
    await assertFails(deleteDoc(doc(db, 'creditos/cr-a2')))
    await assertFails(updateDoc(doc(db, 'creditos/cr-a2'), { usadoEm: { turmaId: 't-livre', data: DEPOIS.data } }))
    await assertFails(updateDoc(doc(db, 'creditos/cr-a1'), { alunoId: 'a-2' }))
  })

  it('não troca a validade, a unidade nem a origem do próprio crédito', async () => {
    const db = como('aluno')
    await assertFails(updateDoc(doc(db, 'creditos/cr-a1'), { validoAte: '2199-12-31' }))
    await assertFails(updateDoc(doc(db, 'creditos/cr-a1'), { unidadeId: 'u-jardim' }))
    await assertFails(updateDoc(doc(db, 'creditos/cr-a1'), { origem: { turmaId: 't-1', data: AMANHA.data } }))
  })

  it('não lê o portal nem os créditos de outro aluno, nem a equipe e os convites', async () => {
    const db = como('aluno')
    await assertFails(getDoc(doc(db, 'portal/a-2')))
    await assertFails(getDoc(doc(db, 'creditos/cr-a2')))
    await assertFails(getDoc(doc(db, 'equipe/e-titular')))
    await assertFails(getDoc(doc(db, `convites/${EMAILS.aluno3}`)))
    await assertFails(getDoc(doc(db, 'acessos/uid-aluno2')))
  })
})

describe('aluno: aula cheia, fora da antecedência e campos que não existem', () => {
  it('não se encaixa na própria turma, onde já tem lugar (seriam dois lugares)', async () => {
    // antes passava: gastava o crédito e tirava a vaga de outra pessoa
    await assertFails(encaixar(como('aluno'), 'cr-a1', AULA, 't-1', AMANHA.data))
    // quem só entra na turma depois desta data ainda pode repor nela
    await semRegras((db) => updateDoc(doc(db, 'turmas/t-1'), { fixosDesde: { 'a-1': '2099-01-01' } }))
    await assertSucceeds(encaixar(como('aluno'), 'cr-a1', AULA, 't-1', AMANHA.data))
  })

  it('não encaixa numa aula que começa em menos de 3 horas', async () => {
    const aula = aulaId('t-livre', LOGO.data)
    await semRegras((db) => setDoc(doc(db, `vagas/${aula}`), vagaDe('t-livre', LOGO, 4, 1)))
    await assertFails(encaixar(como('aluno'), 'cr-a1', aula, 't-livre', LOGO.data))
  })

  it('não encaixa onde a vaga já está no limite, mesmo mexendo na capacidade', async () => {
    const db = como('aluno')
    const aula = aulaId('t-cheia', DEPOIS.data)
    const b = writeBatch(db)
    b.set(
      doc(db, `registros/${aula}`),
      { id: aula, turmaId: 't-cheia', unidadeId: 'u-centro', data: DEPOIS.data, reposicoes: { 'a-1': 'cr-a1' }, atualizadoEm: instante },
      { merge: true },
    )
    b.update(doc(db, 'creditos/cr-a1'), { usadoEm: { turmaId: 't-cheia', data: DEPOIS.data } })
    b.update(doc(db, `vagas/${aula}`), { ocupadas: increment(1), capacidade: 4, atualizadoEm: instante })
    await assertFails(b.commit())
  })

  it('campo a mais no registro, no crédito ou na vaga é recusado', async () => {
    const db = como('aluno')
    const b = writeBatch(db)
    b.set(
      doc(db, `registros/${AULA}`),
      {
        id: AULA,
        turmaId: 't-1',
        unidadeId: 'u-centro',
        data: AMANHA.data,
        marcacoes: { 'a-1': 'avisou' },
        atualizadoEm: instante,
        observacao: 'oi',
      },
      { merge: true },
    )
    b.set(
      doc(db, `creditos/${CREDITO_DO_AVISO}`),
      credito(CREDITO_DO_AVISO, 'a-1', { turmaId: 't-1', data: AMANHA.data }, { validoAte: validade(AMANHA.data, 30) }),
    )
    b.update(doc(db, `vagas/${AULA}`), { ocupadas: increment(-1), atualizadoEm: instante })
    await assertFails(b.commit())

    const c = writeBatch(db)
    c.set(
      doc(db, `registros/${AULA}`),
      { id: AULA, turmaId: 't-1', unidadeId: 'u-centro', data: AMANHA.data, marcacoes: { 'a-1': 'avisou' }, atualizadoEm: instante },
      { merge: true },
    )
    c.set(
      doc(db, `creditos/${CREDITO_DO_AVISO}`),
      credito(CREDITO_DO_AVISO, 'a-1', { turmaId: 't-1', data: AMANHA.data }, { validoAte: validade(AMANHA.data, 30), extra: 1 }),
    )
    c.update(doc(db, `vagas/${AULA}`), { ocupadas: increment(-1), atualizadoEm: instante, nota: 'x' })
    await assertFails(c.commit())
  })

  it('texto enorme ou tipo errado no que o aluno grava é recusado', async () => {
    const db = como('aluno')
    const b = writeBatch(db)
    b.set(
      doc(db, `registros/${AULA}`),
      { id: AULA, turmaId: 't-1', unidadeId: 'u-centro', data: AMANHA.data, marcacoes: { 'a-1': 'avisou' }, atualizadoEm: 'x'.repeat(5000) },
      { merge: true },
    )
    b.update(doc(db, `vagas/${AULA}`), { ocupadas: increment(-1), atualizadoEm: instante })
    await assertFails(b.commit())
    const c = writeBatch(db)
    c.set(
      doc(db, `registros/${AULA}`),
      { id: AULA, turmaId: 't-1', unidadeId: 'u-centro', data: AMANHA.data, marcacoes: { 'a-1': true }, atualizadoEm: instante },
      { merge: true },
    )
    c.update(doc(db, `vagas/${AULA}`), { ocupadas: increment(-1), atualizadoEm: instante })
    await assertFails(c.commit())
    await assertFails(updateDoc(doc(db, `vagas/${AULA}`), { ocupadas: '2', atualizadoEm: instante }))
  })
})

describe('equipe: tipos, tamanhos e campos a mais', () => {
  it('cadastro com tipo errado, texto enorme ou campo a mais é recusado', async () => {
    const aluno = {
      id: 'a-x',
      nome: 'Aluno X',
      unidadeId: 'u-centro',
      telefone: '5511900000098',
      email: '',
      vezesPorSemana: 2,
      situacao: 'ativo',
      observacao: '',
      desde: '2026-10-09',
    }
    const db = como('adm')
    await assertSucceeds(setDoc(doc(db, 'alunos/a-x'), aluno))
    await assertFails(setDoc(doc(db, 'alunos/a-y'), { ...aluno, id: 'a-y', nome: 'x'.repeat(81) }))
    await assertFails(setDoc(doc(db, 'alunos/a-y'), { ...aluno, id: 'a-y', vezesPorSemana: '2' }))
    await assertFails(setDoc(doc(db, 'alunos/a-y'), { ...aluno, id: 'a-y', telefone: '+55 (11) 9000' }))
    await assertFails(setDoc(doc(db, 'alunos/a-y'), { ...aluno, id: 'a-y', email: 'Maiuscula@Example.com' }))
    await assertFails(setDoc(doc(db, 'alunos/a-y'), { ...aluno, id: 'a-y', saude: 'hérnia de disco' }))
    await assertFails(setDoc(doc(db, 'alunos/outro-id'), aluno))
    await assertFails(updateDoc(doc(db, 'equipe/e-prof'), { ativo: 'sim' }))
    await assertFails(updateDoc(doc(db, 'equipe/e-prof'), { nome: 'x'.repeat(81) }))
    await assertFails(updateDoc(doc(db, 'turmas/t-1'), { capacidade: 4.5 }))
    await assertFails(updateDoc(doc(db, 'turmas/t-1'), { alunosFixos: Array.from({ length: 31 }, (_, i) => `a-${i}`) }))
  })

  it('página pública: horários demais, campo a mais ou WhatsApp com letras são recusados', async () => {
    const horario = `${DEPOIS.data} ${DEPOIS.inicio}-${DEPOIS.fim} u-centro 1`
    await assertFails(updateDoc(doc(como('prof'), 'publico/estudio'), { horarios: Array(101).fill(horario), atualizadoEm: instante }))
    await assertFails(updateDoc(doc(como('prof'), 'publico/estudio'), { nomeEstudio: 'Outro', atualizadoEm: instante }))
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { whatsapp: 'https://exemplo' }))
    await assertFails(setDoc(doc(como('prof'), 'publico/outro'), { a: 1 }))
  })

  it('professor não cria a página pública do zero nem apaga', async () => {
    await semRegras((db) => deleteDoc(doc(db, 'publico/estudio')))
    const p = {
      nomeEstudio: 'Estúdio de Teste',
      whatsapp: '5511900000000',
      unidades: {},
      experimental: true,
      horarios: [],
      atualizadoEm: instante,
    }
    await assertFails(setDoc(doc(como('prof'), 'publico/estudio'), p))
    await assertSucceeds(setDoc(doc(como('adm'), 'publico/estudio'), p))
    await assertFails(deleteDoc(doc(como('prof'), 'publico/estudio')))
  })
})

describe('posse: só quem precisa sabe quem é o titular', () => {
  it('conta qualquer, com e-mail confirmado, não lê a posse', async () => {
    await assertFails(getDoc(doc(como('estranho'), 'estudio/posse')))
    await assertFails(getDoc(doc(como('aluno'), 'estudio/posse')))
    await assertFails(getDoc(doc(como('convidado'), 'estudio/posse')))
    await assertFails(getDoc(doc(como('anonimo'), 'estudio/posse')))
  })

  it('a equipe lê a posse; o e-mail do primeiro acesso também (para saber se o estúdio já tem dono)', async () => {
    await assertSucceeds(getDoc(doc(como('adm'), 'estudio/posse')))
    await assertSucceeds(getDoc(doc(como('prof'), 'estudio/posse')))
    await assertSucceeds(getDoc(doc(como('titular'), 'estudio/posse')))
    // a conta do e-mail combinado, ainda sem acesso nenhum, antes de reivindicar
    await semRegras((db) => deleteDoc(doc(db, 'acessos/uid-titular')))
    await assertSucceeds(getDoc(doc(como('titular'), 'estudio/posse')))
    await assertFails(getDoc(doc(como('semConfirmar'), 'estudio/posse')))
  })
})

describe('exclusão a pedido do aluno (LGPD)', () => {
  const doAluno = (db: Firestore, alunoId: string) =>
    getDocs(query(collection(db, 'acessos'), where('tipo', '==', 'aluno'), where('pessoaId', '==', alunoId)))

  it('a administração acha e apaga o acesso (com o e-mail) de quem pediu a exclusão', async () => {
    const achados = await assertSucceeds(doAluno(como('adm'), 'a-1'))
    if (achados.docs.map((d) => d.id).join() !== 'uid-aluno') throw new Error('deveria achar o acesso do aluno')
    const db = como('adm')
    const b = writeBatch(db)
    b.delete(doc(db, 'alunos/a-1'))
    b.delete(doc(db, 'financeiroDosAlunos/a-1'))
    b.delete(doc(db, 'portal/a-1'))
    b.delete(doc(db, 'acessos/uid-aluno'))
    await assertSucceeds(b.commit())
    if (await ler('acessos/uid-aluno')) throw new Error('o acesso deveria ter saído')
  })

  it('o acesso da equipe não sai pela administração, nem o professor e o aluno acham acessos', async () => {
    await assertFails(deleteDoc(doc(como('adm'), 'acessos/uid-prof')))
    await assertFails(deleteDoc(doc(como('adm'), 'acessos/uid-titular')))
    await assertFails(getDocs(collection(como('adm'), 'acessos')))
    await assertFails(getDocs(query(collection(como('adm'), 'acessos'), where('tipo', '==', 'equipe'))))
    await assertFails(doAluno(como('prof'), 'a-1'))
    await assertFails(doAluno(como('aluno2'), 'a-1'))
    await assertFails(deleteDoc(doc(como('prof'), 'acessos/uid-aluno')))
    await assertFails(deleteDoc(doc(como('aluno2'), 'acessos/uid-aluno')))
  })
})

describe('anônimo e conta sem papel', () => {
  it('sem login, nada além do documento público; nem cria acesso', async () => {
    const db = como('anonimo')
    await assertSucceeds(getDoc(doc(db, 'publico/estudio')))
    await assertFails(getDoc(doc(db, 'configuracao/estudio')))
    await assertFails(getDoc(doc(db, 'unidades/u-centro')))
    await assertFails(setDoc(doc(db, 'acessos/qualquer'), { tipo: 'equipe', pessoaId: 'e-titular', email: EMAILS.titular, criadoEm: instante }))
    await assertFails(setDoc(doc(db, 'publico/estudio'), { nomeEstudio: 'x' }))
  })

  it('conta confirmada sem convite não cria acesso nem cadastro, nem se convida', async () => {
    const db = como('estranho')
    await assertFails(setDoc(doc(db, 'acessos/uid-estranho'), { tipo: 'aluno', pessoaId: 'a-4', email: EMAILS.estranho, criadoEm: instante }))
    await assertFails(
      setDoc(doc(db, 'equipe/e-eu'), {
        id: 'e-eu',
        nome: 'Eu',
        papel: 'administrador',
        email: EMAILS.estranho,
        telefone: '',
        unidades: [],
        ativo: true,
        uid: 'uid-estranho',
      }),
    )
    await assertFails(updateDoc(doc(db, 'equipe/e-convidado'), { uid: 'uid-estranho', convite: deleteField() }))
    await assertFails(getDoc(doc(db, 'vagas/' + AULA)))
  })
})

describe('administração: o que nem ela faz', () => {
  it('administrador não se promove, não se reativa por conta própria e não troca o próprio e-mail', async () => {
    const db = como('adm')
    await assertFails(updateDoc(doc(db, 'equipe/e-adm'), { uid: 'uid-titular' }))
    await assertFails(updateDoc(doc(db, 'equipe/e-adm'), { email: 'outro@example.com' }))
    await assertFails(updateDoc(doc(db, 'estudio/posse'), { titularUid: 'uid-adm', titularMembroId: 'e-adm' }))
  })

  it('administrador não sequestra o convite de administração que o titular fez', async () => {
    const db = como('adm')
    // trocar o e-mail do convidado para um seu, ou reescrever o convite, exige o titular
    await assertFails(updateDoc(doc(db, 'equipe/e-convidado-adm'), { email: 'meu-outro@example.com' }))
    await assertFails(
      setDoc(doc(db, 'convites/meu-outro@example.com'), {
        email: 'meu-outro@example.com',
        papel: 'administrador',
        pessoaId: 'e-convidado-adm',
        porId: 'e-adm',
        criadoEm: instante,
      }),
    )
    // nem por um cadastro de aluno com o mesmo id
    const b = writeBatch(db)
    b.set(doc(db, 'alunos/e-convidado-adm'), {
      id: 'e-convidado-adm',
      nome: 'Falso',
      unidadeId: 'u-centro',
      telefone: '',
      email: 'meu-outro@example.com',
      vezesPorSemana: 1,
      situacao: 'ativo',
      observacao: '',
      desde: '2026-10-09',
      acesso: { convidadoEm: instante, porId: 'e-adm' },
    })
    b.set(doc(db, 'convites/meu-outro@example.com'), {
      email: 'meu-outro@example.com',
      papel: 'aluno',
      pessoaId: 'e-convidado-adm',
      porId: 'e-adm',
      criadoEm: instante,
    })
    await assertSucceeds(b.commit())
    const outro = ambiente
      .authenticatedContext('uid-outro', { email: 'meu-outro@example.com', email_verified: true })
      .firestore() as unknown as Firestore
    const c = writeBatch(outro)
    c.set(doc(outro, 'acessos/uid-outro'), { tipo: 'equipe', pessoaId: 'e-convidado-adm', email: 'meu-outro@example.com', criadoEm: instante })
    c.update(doc(outro, 'equipe/e-convidado-adm'), { uid: 'uid-outro', convite: deleteField() })
    await assertFails(c.commit())
  })
})

// As correções acima não podem recusar o que o app faz de verdade. As regras do registro do
// aluno ficam perto do teto de 1000 expressões por pedido: estes casos pegam uma recusa por teto.
describe('o que o aluno faz de verdade continua passando', () => {
  async function registroExistente(aula: string, turmaId: string, data: string, extra: Record<string, unknown>) {
    await semRegras((db) =>
      setDoc(doc(db, `registros/${aula}`), { id: aula, turmaId, unidadeId: 'u-centro', data, atualizadoEm: instante, ...extra }),
    )
  }

  it('encaixa numa aula que já tem registro (vazio, com aviso de outro ou com outra reposição)', async () => {
    for (const extra of [{ marcacoes: {}, reposicoes: {} }, { marcacoes: { 'a-5': 'avisou' } }, { reposicoes: { 'a-2': 'cr-a2' } }]) {
      await semear(ambiente)
      await registroExistente(AULA_LIVRE, 't-livre', DEPOIS.data, extra)
      await assertSucceeds(encaixar(como('aluno'), 'cr-a1', AULA_LIVRE, 't-livre', DEPOIS.data))
    }
  })

  it('avisa, desfaz e avisa de novo quando entrou na turma com data (fixosDesde)', async () => {
    await semRegras((db) => updateDoc(doc(db, 'turmas/t-1'), { fixosDesde: { 'a-1': '2026-01-01' } }))
    await assertSucceeds(avisar(como('aluno')))
    await assertSucceeds(desfazerAviso(como('aluno'), true))
    await assertSucceeds(avisar(como('aluno')))
  })

  it('um crédito que já aponta para a aula não serve de novo sem ser tocado no lote', async () => {
    // o crédito ficou gasto nesta aula (estado torto: a reposição sumiu do registro); a regra do
    // registro só lê o crédito depois do lote, então a vaga confere que ele estava livre antes
    await semRegras((db) => updateDoc(doc(db, 'creditos/cr-a1'), { usadoEm: { turmaId: 't-livre', data: DEPOIS.data } }))
    const db = como('aluno')
    const b = writeBatch(db)
    b.set(
      doc(db, `registros/${AULA_LIVRE}`),
      { id: AULA_LIVRE, turmaId: 't-livre', unidadeId: 'u-centro', data: DEPOIS.data, reposicoes: { 'a-1': 'cr-a1' }, atualizadoEm: instante },
      { merge: true },
    )
    b.update(doc(db, `vagas/${AULA_LIVRE}`), { ocupadas: increment(1), atualizadoEm: instante })
    await assertFails(b.commit())
  })

  it('desiste da reposição e encaixa o mesmo crédito em outra aula', async () => {
    await assertSucceeds(encaixar(como('aluno'), 'cr-a1', AULA_LIVRE, 't-livre', DEPOIS.data))
    const db = como('aluno')
    const b = writeBatch(db)
    b.update(doc(db, `registros/${AULA_LIVRE}`), { 'reposicoes.a-1': deleteField(), atualizadoEm: instante })
    b.update(doc(db, 'creditos/cr-a1'), { usadoEm: deleteField() })
    b.update(doc(db, `vagas/${AULA_LIVRE}`), { ocupadas: increment(-1), atualizadoEm: instante })
    await assertSucceeds(b.commit())
    const outra = aulaId('t-cheia', DEPOIS.data)
    await semRegras((d) => updateDoc(doc(d, `vagas/${outra}`), { ocupadas: 2 }))
    await assertSucceeds(encaixar(como('aluno'), 'cr-a1', outra, 't-cheia', DEPOIS.data))
  })
})

describe('listas gravadas pela equipe: cada item conferido', () => {
  const horario = (dia: string, n = 1) => `${dia} ${DEPOIS.inicio}-${DEPOIS.fim} u-centro ${n}`

  it('página pública: cem horários passam; o centésimo primeiro, um torto ou um mapa não', async () => {
    const cem = Array.from({ length: 100 }, (_, i) => horario(DEPOIS.data, i % 31))
    await assertSucceeds(updateDoc(doc(como('prof'), 'publico/estudio'), { horarios: cem, atualizadoEm: instante }))
    await assertFails(updateDoc(doc(como('prof'), 'publico/estudio'), { horarios: [...cem, horario(DEPOIS.data)], atualizadoEm: instante }))
    await assertFails(updateDoc(doc(como('prof'), 'publico/estudio'), { horarios: [...cem.slice(0, 99), 'x'], atualizadoEm: instante }))
    await assertFails(updateDoc(doc(como('prof'), 'publico/estudio'), { horarios: [{ data: DEPOIS.data, inicio: '18:00', fim: '18:50', unidadeId: 'u-centro', vagas: 1 }], atualizadoEm: instante }))
    await assertFails(updateDoc(doc(como('prof'), 'publico/estudio'), { horarios: [`${DEPOIS.data} 18:00-18:50 u-centro 31`], atualizadoEm: instante }))
    await assertFails(updateDoc(doc(como('prof'), 'publico/estudio'), { horarios: [`${DEPOIS.data} 18:00-18:50 ${'u'.repeat(121)} 1`], atualizadoEm: instante }))
    await assertFails(updateDoc(doc(como('prof'), 'publico/estudio'), { horarios: [`${DEPOIS.data} 18:00-18:50 u-centro 1 <script>`], atualizadoEm: instante }))
  })

  it('página pública: dez unidades passam; a décima primeira, sem nome, com nome enorme, id torto ou como mapa não', async () => {
    const dez = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`u-${i}`, `Unidade ${i}|Rua Exemplo, ${i}`]))
    await assertSucceeds(updateDoc(doc(como('adm'), 'publico/estudio'), { unidades: dez }))
    await assertSucceeds(updateDoc(doc(como('adm'), 'publico/estudio'), { unidades: { 'u-centro': 'Centro|' } }))
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { unidades: { ...dez, 'u-10': 'Mais uma|' } }))
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { unidades: { 'u-centro': '|Rua sem nome' } }))
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { unidades: { 'u-centro': `${'x'.repeat(61)}|Rua` } }))
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { unidades: { 'u-centro': `Centro|${'x'.repeat(161)}` } }))
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { unidades: { 'u centro': 'Centro|Rua' } }))
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { unidades: { 'u-centro': { nome: 'Centro', endereco: 'Rua' } } }))
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { unidades: [{ id: 'u-centro', nome: 'Centro', endereco: 'Rua' }] }))
  })

  it('turma: trinta fixos com data passam; um id torto, uma data torta ou o trigésimo primeiro não', async () => {
    const fixos = Array.from({ length: 30 }, (_, i) => `a-${i}`)
    const desde = Object.fromEntries(fixos.map((id) => [id, '2026-01-01']))
    await assertSucceeds(updateDoc(doc(como('adm'), 'turmas/t-1'), { alunosFixos: fixos, fixosDesde: desde }))
    await assertFails(updateDoc(doc(como('adm'), 'turmas/t-1'), { alunosFixos: [...fixos.slice(0, 29), 'a 29'] }))
    await assertFails(updateDoc(doc(como('adm'), 'turmas/t-1'), { alunosFixos: [...fixos.slice(0, 29), 7] }))
    await assertFails(updateDoc(doc(como('adm'), 'turmas/t-1'), { alunosFixos: [...fixos, 'a-30'] }))
    await assertFails(updateDoc(doc(como('adm'), 'turmas/t-1'), { fixosDesde: { ...desde, 'a-1': '01/01/2026' } }))
    await assertFails(updateDoc(doc(como('adm'), 'turmas/t-1'), { fixosDesde: { ...desde, 'a 1': '2026-01-01' } }))
  })

  it('lista conferida pelo texto: item com o separador dentro, número, booleano, nulo ou vazio não passam por itens válidos', async () => {
    // a lista vira "a-1,a,2" e a expressão regular veria três ids; o número vira "7" no join
    for (const torto of ['a,2', 7, true, null, '', 'a-1,a-2']) {
      await assertFails(updateDoc(doc(como('adm'), 'turmas/t-1'), { alunosFixos: ['a-1', torto] }))
    }
    await assertFails(updateDoc(doc(como('adm'), 'turmas/t-1'), { fixosDesde: { 'a-1': '2026-01-01,2026-01-02' } }))
    await assertSucceeds(updateDoc(doc(como('adm'), 'turmas/t-1'), { alunosFixos: [], fixosDesde: {} }))
    const h = `${DEPOIS.data} ${DEPOIS.inicio}-${DEPOIS.fim} u-centro 2`
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { horarios: [`${h}|${h}`] }))
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { horarios: [7] }))
    await assertSucceeds(updateDoc(doc(como('adm'), 'publico/estudio'), { horarios: [] }))
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { unidades: { 'u,x': 'Centro|Rua' } }))
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { unidades: { 'u-a': 'A|Rua 1\nB|Rua 2' } }))
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { unidades: { 'u-a': 7 } }))
    await assertSucceeds(updateDoc(doc(como('adm'), 'publico/estudio'), { unidades: {} }))
  })

  it('equipe: unidades do professor conferidas uma a uma', async () => {
    await assertSucceeds(updateDoc(doc(como('adm'), 'equipe/e-prof'), { unidades: ['u-centro', 'u-jardim'] }))
    await assertFails(updateDoc(doc(como('adm'), 'equipe/e-prof'), { unidades: ['u-centro', ''] }))
    await assertFails(updateDoc(doc(como('adm'), 'equipe/e-prof'), { unidades: ['u-centro', { id: 'u-jardim' }] }))
    await assertFails(updateDoc(doc(como('adm'), 'equipe/e-prof'), { unidades: Array.from({ length: 21 }, (_, i) => `u-${i}`) }))
  })

  it('registro da aula: a chamada cheia (40 marcações e 30 reposições) passa; chave ou crédito torto não', async () => {
    const aula = aulaId('t-1', AMANHA.data)
    const marcacoes = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`a-${i}`, i % 2 ? 'presente' : 'faltou']))
    const reposicoes = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`r-${i}`, `cr_r-${i}_t-1_${AMANHA.data}`]))
    const base = { id: aula, turmaId: 't-1', unidadeId: 'u-centro', data: AMANHA.data, atualizadoEm: instante }
    await assertSucceeds(setDoc(doc(como('prof'), `registros/${aula}`), { ...base, marcacoes, reposicoes }))
    await assertFails(setDoc(doc(como('prof'), `registros/${aula}`), { ...base, marcacoes: { ...marcacoes, 'a 1': 'presente' }, reposicoes }))
    await assertFails(setDoc(doc(como('prof'), `registros/${aula}`), { ...base, marcacoes, reposicoes: { ...reposicoes, 'r-1': 'cr x' } }))
    await assertFails(setDoc(doc(como('prof'), `registros/${aula}`), { ...base, marcacoes, reposicoes: { ...reposicoes, 'r-1': 7 } }))
  })


  it('vaga: o início em milissegundos tem que bater com a data e a hora', async () => {
    const certa = vagaDe('t-1', DEPOIS, 4, 1)
    const id = `vagas/${aulaId('t-1', DEPOIS.data)}`
    await assertSucceeds(setDoc(doc(como('adm'), id), certa))
    await assertFails(setDoc(doc(como('adm'), id), { ...certa, comecaEm: certa.comecaEm + 60_000 }))
    await assertFails(setDoc(doc(como('adm'), id), { ...certa, comecaEm: String(certa.comecaEm) }))
    const { comecaEm: _fora, ...sem } = certa
    void _fora
    await assertFails(setDoc(doc(como('adm'), id), sem))
    // o aluno não mexe nele
    await assertFails(updateDoc(doc(como('aluno'), `vagas/${aulaId('t-1', AMANHA.data)}`), { comecaEm: 0, atualizadoEm: instante }))
  })
})
