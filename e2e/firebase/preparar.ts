// Prepara os emuladores para os testes de ponta a ponta com o SDK de verdade: limpa tudo, cria
// as contas (e-mail já confirmado) e grava o estúdio da demonstração no Firestore, com as datas
// de hoje (as regras medem o prazo pelo relógio do servidor). Só roda com EMULADOR=1.
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { gerarSemente } from '../../src/dados/demonstracao/semente'
import { documentoDoMembro } from '../../src/dados/firebase/conversao'
import { momentoDe } from '../../src/dominio/datas'
import { paginaPublica, portaisDosAlunos, vagasDaJanela } from '../../src/dominio/projecoes'
import type { MembroEquipe } from '../../src/dominio/tipos'
import { AUTH, CHAVE_DO_EMULADOR, CONTAS, contaDeSenhaDoMotor, convidadoDoMotor, EXCLUIDO_DO_MOTOR, FIRESTORE, MOTORES, PROJETO, projetoVazio, SENHA } from './contas'

async function pedir(url: string, corpo?: unknown, metodo = 'POST') {
  const r = await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
  if (!r.ok) throw new Error(`${metodo} ${url}: ${r.status} ${await r.text()}`)
  return (await r.json().catch(() => ({}))) as Record<string, unknown>
}

async function criarConta(email: string): Promise<string> {
  const r = await pedir(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${CHAVE_DO_EMULADOR}`, {
    email,
    password: SENHA,
    returnSecureToken: true,
  })
  const uid = String(r.localId)
  await pedir(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJETO}/accounts:update`, { localId: uid, emailVerified: true })
  return uid
}

/** sem undefined (o Firestore recusa), como objeto simples */
const limpo = (valor: object): Record<string, unknown> => JSON.parse(JSON.stringify(valor)) as Record<string, unknown>

export default async function preparar(): Promise<void> {
  // as contas ficam todas no projeto padrão do emulador de login; os dados, por projeto
  await pedir(`${AUTH}/emulator/v1/projects/${PROJETO}/accounts`, undefined, 'DELETE')
  for (const projeto of [PROJETO, ...MOTORES.map(projetoVazio)]) {
    await pedir(`${FIRESTORE}/emulator/v1/projects/${projeto}/databases/(default)/documents`, undefined, 'DELETE')
  }

  const uids = new Map<string, string>()
  // um professor por motor só para os testes de senha (a senha dele muda no meio do teste); o
  // Hoje cumprimenta pelo primeiro nome, e o teste o procura no título
  const nomeDeSenha = { chromium: 'Olivia Senha', webkit: 'Otavio Senha' } as const
  const deSenha: MembroEquipe[] = MOTORES.map((motor) => ({
    id: contaDeSenhaDoMotor(motor).membroId,
    nome: nomeDeSenha[motor],
    papel: 'professor',
    email: contaDeSenhaDoMotor(motor).email,
    telefone: '',
    unidades: ['u-centro'],
    ativo: true,
  }))
  for (const conta of [CONTAS.responsavel, CONTAS.professor, ...deSenha.map((m) => ({ email: m.email, membroId: m.id }))]) {
    uids.set(conta.membroId, await criarConta(conta.email))
  }
  const alunos = new Map<string, string>()
  for (const conta of [CONTAS.alunoChromium, CONTAS.alunoWebkit]) alunos.set(conta.alunoId, await criarConta(conta.email))

  const agora = new Date()
  const instante = agora.toISOString()
  const banco = gerarSemente(agora)
  const b = banco.base
  const registros = new Map(Object.entries(banco.registros))
  const estado = { configuracao: b.configuracao, unidades: b.unidades, alunos: b.alunos, turmas: b.turmas, registro: (id: string) => registros.get(id) }

  // convites pendentes, um por motor, para o teste de criar a conta
  const convidados: MembroEquipe[] = MOTORES.map((motor) => ({
    id: convidadoDoMotor(motor).membroId,
    nome: `Convidado ${motor}`,
    papel: 'professor',
    email: convidadoDoMotor(motor).email,
    telefone: '',
    unidades: ['u-centro'],
    ativo: true,
    convite: { enviadoEm: instante, porId: CONTAS.responsavel.membroId },
  }))

  const documentos: [string, Record<string, unknown>][] = []
  const titularUid = uids.get(CONTAS.responsavel.membroId) ?? ''
  documentos.push(['estudio/posse', { titularUid, titularMembroId: CONTAS.responsavel.membroId, criadoEm: serverTimestamp() }])
  documentos.push(['configuracao/estudio', limpo(b.configuracao)])
  for (const u of b.unidades) documentos.push([`unidades/${u.id}`, limpo(u)])
  const equipe = [...b.equipe, ...deSenha]
  for (const m of [...equipe, ...convidados]) {
    const uid = uids.get(m.id)
    documentos.push([`equipe/${m.id}`, limpo({ ...documentoDoMembro(m), ...(uid ? { uid } : {}) })])
  }
  for (const c of convidados) {
    documentos.push([`convites/${c.email}`, { email: c.email, papel: 'professor', pessoaId: c.id, porId: CONTAS.responsavel.membroId, criadoEm: instante }])
  }
  for (const [membroId, uid] of uids) {
    const m = equipe.find((x) => x.id === membroId)
    documentos.push([`acessos/${uid}`, { tipo: 'equipe', pessoaId: membroId, email: m?.email ?? '', criadoEm: instante }])
  }
  for (const [alunoId, uid] of alunos) {
    const a = b.alunos.find((x) => x.id === alunoId)
    if (!a?.acesso) throw new Error(`${alunoId} não tem acesso liberado na semente`)
    documentos.push([`acessos/${uid}`, { tipo: 'aluno', pessoaId: alunoId, email: a.email, criadoEm: instante }])
  }
  // quem o teste da administração exclui (um por motor) tem a conta ligada, para conferir que o
  // acesso (com o e-mail) sai junto com o cadastro
  for (const alunoId of Object.values(EXCLUIDO_DO_MOTOR)) {
    documentos.push([`acessos/uid-${alunoId}`, { tipo: 'aluno', pessoaId: alunoId, email: `${alunoId}@example.com`, criadoEm: instante }])
  }
  for (const a of b.alunos) documentos.push([`alunos/${a.id}`, limpo(a)])
  for (const t of b.turmas) documentos.push([`turmas/${t.id}`, limpo(t)])
  for (const r of registros.values()) documentos.push([`registros/${r.id}`, limpo(r)])
  for (const c of Object.values(banco.creditos)) documentos.push([`creditos/${c.id}`, limpo(c)])
  for (const f of Object.values(banco.financeiro)) documentos.push([`financeiroDosAlunos/${f.alunoId}`, limpo(f)])
  for (const p of Object.values(banco.pagamentos)) documentos.push([`pagamentos/${p.id}`, limpo(p)])
  for (const [id, v] of vagasDaJanela(estado, momentoDe(agora).data, instante)) documentos.push([`vagas/${id}`, limpo(v)])
  for (const [id, p] of portaisDosAlunos(estado, instante)) documentos.push([`portal/${id}`, limpo(p)])
  documentos.push(['publico/estudio', limpo(paginaPublica(estado, momentoDe(agora), instante))])

  const ambiente = await initializeTestEnvironment({
    projectId: PROJETO,
    firestore: {
      host: '127.0.0.1',
      port: Number(new URL(FIRESTORE).port),
      rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'),
    },
  })
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore
    for (let i = 0; i < documentos.length; i += 400) {
      const lote = writeBatch(db)
      for (const [caminho, dados] of documentos.slice(i, i + 400)) lote.set(doc(db, caminho), dados)
      await lote.commit()
    }
  })
  await ambiente.cleanup()
}
