// Cenário dos testes de regras: um estúdio pequeno com cada papel representado, gravado com as
// regras desligadas. As datas das aulas saem do relógio de verdade, porque as regras comparam
// com request.time (o prazo de aviso é medido no servidor).
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { horaDe, momentoDe } from '../src/dominio/datas'

const configuracaoDoEmulador = JSON.parse(readFileSync(new URL('../firebase.json', import.meta.url), 'utf8')) as {
  emulators: { firestore: { host: string; port: number } }
}

export const PROJETO = 'demo-pilates'

export async function criarAmbiente(): Promise<RulesTestEnvironment> {
  const { host, port } = configuracaoDoEmulador.emulators.firestore
  return initializeTestEnvironment({
    projectId: PROJETO,
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host, port },
  })
}

/** Data e hora (no relógio de Campinas) daqui a `horas`, arredondada para a hora cheia seguinte. */
export function daquiA(horas: number): { data: string; inicio: string; fim: string } {
  const alvo = new Date(Date.now() + horas * 3_600_000)
  const m = momentoDe(alvo)
  const inicio = Math.min(Math.ceil(m.minutos / 60) * 60, 22 * 60)
  return { data: m.data, inicio: horaDe(inicio), fim: horaDe(inicio + 50) }
}

export const AMANHA = daquiA(26)
export const DEPOIS = daquiA(50)
/** aula que começa em menos de 3 horas: fora do prazo de aviso */
export const LOGO = daquiA(1)

export const EMAILS = {
  titular: 'responsavel@example.com',
  adm: 'adm@example.com',
  prof: 'prof@example.com',
  profJardim: 'jardim@example.com',
  aluno: 'aluno1@example.com',
  aluno2: 'aluno2@example.com',
  aluno3: 'aluno3@example.com',
  convidado: 'novo@example.com',
  convidadoAdm: 'novoadm@example.com',
  estranho: 'estranho@example.com',
}

const instante = '2026-10-01T12:00:00.000Z'

export const CONFIG = {
  nomeEstudio: 'Estúdio de Teste',
  whatsapp: '5511900000000',
  validadeCreditoDias: 30,
  antecedenciaAvisoHoras: 3,
  limiteReposicoesMes: 0,
  alertaAusenciasSeguidas: 3,
  capacidadePadrao: 5,
  acessoDoAluno: true,
  paginaExperimental: true,
}

function membro(id: string, papel: string, email: string, unidades: string[], extra: Record<string, unknown> = {}) {
  return { id, nome: `Pessoa ${id}`, papel, email, telefone: '5511900000001', unidades, ativo: true, ...extra }
}

function aluno(id: string, email: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    nome: `Aluno ${id}`,
    unidadeId: 'u-centro',
    telefone: '5511900000010',
    email,
    vezesPorSemana: 2,
    situacao: 'ativo',
    observacao: 'Prefere o aparelho perto da janela.',
    desde: '2026-01-10',
    ...extra,
  }
}

export function vagaDe(turmaId: string, quando: { data: string; inicio: string; fim: string }, capacidade: number, ocupadas: number) {
  return {
    turmaId,
    unidadeId: 'u-centro',
    data: quando.data,
    inicio: quando.inicio,
    fim: quando.fim,
    capacidade,
    ocupadas,
    cancelada: false,
    atualizadoEm: instante,
  }
}

export function turma(id: string, alunosFixos: string[], capacidade: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    unidadeId: 'u-centro',
    diaDaSemana: 2,
    inicio: '07:00',
    duracaoMin: 50,
    capacidade,
    professorId: 'e-prof',
    alunosFixos,
    ativa: true,
    desde: '2026-01-01',
    ...extra,
  }
}

export const aulaId = (turmaId: string, data: string) => `${turmaId}_${data}`

export function credito(id: string, alunoId: string, origem: { turmaId: string; data: string }, extra: Record<string, unknown> = {}) {
  return { id, alunoId, unidadeId: 'u-centro', motivo: 'aviso', origem, criadoEm: instante, validoAte: '2099-12-31', ...extra }
}

/** Grava o estúdio de teste do zero (o emulador é limpo antes). */
export async function semear(ambiente: RulesTestEnvironment): Promise<void> {
  await ambiente.clearFirestore()
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore
    const gravar = (caminho: string, dados: Record<string, unknown>) => setDoc(doc(db, caminho), dados)
    await gravar('estudio/posse', { titularUid: 'uid-titular', titularMembroId: 'e-titular', criadoEm: serverTimestamp() })
    await gravar('configuracao/estudio', CONFIG)
    await gravar('unidades/u-centro', { id: 'u-centro', nome: 'Centro', endereco: 'Rua Exemplo, 100', ativa: true })
    await gravar('unidades/u-jardim', { id: 'u-jardim', nome: 'Jardim', endereco: 'Avenida Exemplo, 200', ativa: true })

    await gravar('equipe/e-titular', membro('e-titular', 'administrador', EMAILS.titular, [], { uid: 'uid-titular' }))
    await gravar('equipe/e-adm', membro('e-adm', 'administrador', EMAILS.adm, [], { uid: 'uid-adm' }))
    await gravar('equipe/e-prof', membro('e-prof', 'professor', EMAILS.prof, ['u-centro'], { uid: 'uid-prof' }))
    await gravar('equipe/e-jardim', membro('e-jardim', 'professor', EMAILS.profJardim, ['u-jardim'], { uid: 'uid-jardim' }))
    const convite = { convite: { enviadoEm: instante, porId: 'e-titular' } }
    await gravar('equipe/e-convidado', membro('e-convidado', 'professor', EMAILS.convidado, ['u-centro'], convite))
    await gravar('equipe/e-convidado-adm', membro('e-convidado-adm', 'administrador', EMAILS.convidadoAdm, [], convite))

    const acesso = (tipo: string, pessoaId: string, email: string) => ({ tipo, pessoaId, email, criadoEm: instante })
    await gravar('acessos/uid-titular', acesso('equipe', 'e-titular', EMAILS.titular))
    await gravar('acessos/uid-adm', acesso('equipe', 'e-adm', EMAILS.adm))
    await gravar('acessos/uid-prof', acesso('equipe', 'e-prof', EMAILS.prof))
    await gravar('acessos/uid-jardim', acesso('equipe', 'e-jardim', EMAILS.profJardim))
    await gravar('acessos/uid-aluno', acesso('aluno', 'a-1', EMAILS.aluno))
    await gravar('acessos/uid-aluno2', acesso('aluno', 'a-2', EMAILS.aluno2))

    const conv = (email: string, papel: string, pessoaId: string) => ({ email, papel, pessoaId, porId: 'e-titular', criadoEm: instante })
    await gravar(`convites/${EMAILS.convidado}`, conv(EMAILS.convidado, 'professor', 'e-convidado'))
    await gravar(`convites/${EMAILS.convidadoAdm}`, conv(EMAILS.convidadoAdm, 'administrador', 'e-convidado-adm'))
    await gravar(`convites/${EMAILS.aluno3}`, conv(EMAILS.aluno3, 'aluno', 'a-3'))

    const liberado = { acesso: { convidadoEm: instante, porId: 'e-titular' } }
    await gravar('alunos/a-1', aluno('a-1', EMAILS.aluno, liberado))
    await gravar('alunos/a-2', aluno('a-2', EMAILS.aluno2, liberado))
    await gravar('alunos/a-3', aluno('a-3', EMAILS.aluno3, liberado))
    await gravar('alunos/a-4', aluno('a-4', 'aluno4@example.com'))
    await gravar('alunos/a-5', aluno('a-5', 'aluno5@example.com'))
    await gravar('financeiroDosAlunos/a-1', {
      alunoId: 'a-1',
      unidadeId: 'u-centro',
      valorMensal: 28000,
      formaPreferida: 'pix',
      diaVencimento: 10,
    })
    await gravar('pagamentos/pg-1', {
      id: 'pg-1',
      alunoId: 'a-1',
      unidadeId: 'u-centro',
      competencia: '2026-10',
      valor: 28000,
      forma: 'pix',
      pagoEm: '2026-10-05',
      observacao: '',
      registradoPorId: 'e-titular',
    })

    // t-1: turma de a-1 e a-2 (3 de 4 lugares); t-cheia: lotada; t-livre: com vaga para repor
    await gravar('turmas/t-1', turma('t-1', ['a-1', 'a-2', 'a-4'], 4))
    await gravar('turmas/t-cheia', turma('t-cheia', ['a-3', 'a-4', 'a-5'], 3))
    await gravar('turmas/t-livre', turma('t-livre', ['a-5'], 4))
    await gravar(`vagas/${aulaId('t-1', AMANHA.data)}`, vagaDe('t-1', AMANHA, 4, 3))
    await gravar(`vagas/${aulaId('t-1', LOGO.data)}`, vagaDe('t-1', LOGO, 4, 3))
    await gravar(`vagas/${aulaId('t-cheia', DEPOIS.data)}`, vagaDe('t-cheia', DEPOIS, 3, 3))
    await gravar(`vagas/${aulaId('t-livre', DEPOIS.data)}`, vagaDe('t-livre', DEPOIS, 4, 1))
    await gravar(`registros/${aulaId('t-1', '2026-09-01')}`, {
      id: aulaId('t-1', '2026-09-01'),
      turmaId: 't-1',
      unidadeId: 'u-centro',
      data: '2026-09-01',
      marcacoes: { 'a-1': 'presente', 'a-2': 'faltou' },
      reposicoes: {},
      atualizadoEm: instante,
    })

    await gravar('creditos/cr-a1', credito('cr-a1', 'a-1', { turmaId: 't-1', data: '2026-09-08' }))
    await gravar('creditos/cr-a2', credito('cr-a2', 'a-2', { turmaId: 't-1', data: '2026-09-08' }))

    const portal = (alunoId: string) => ({
      alunoId,
      nome: 'Aluno',
      unidadeId: 'u-centro',
      turmas: [{ turmaId: 't-1', diaDaSemana: 2, inicio: '07:00', fim: '07:50', desde: '2026-01-01' }],
      atualizadoEm: instante,
    })
    await gravar('portal/a-1', portal('a-1'))
    await gravar('portal/a-2', portal('a-2'))
    await gravar('publico/estudio', {
      nomeEstudio: 'Estúdio de Teste',
      whatsapp: '5511900000000',
      unidades: [{ id: 'u-centro', nome: 'Centro', endereco: 'Rua Exemplo, 100' }],
      experimental: true,
      horarios: [],
      atualizadoEm: instante,
    })
  })
}

export type Quem =
  | 'anonimo'
  | 'semConfirmar'
  | 'estranho'
  | 'titular'
  | 'adm'
  | 'prof'
  | 'profJardim'
  | 'aluno'
  | 'aluno2'
  | 'aluno3'
  | 'convidado'
  | 'convidadoAdm'

const CONTAS: Record<Exclude<Quem, 'anonimo'>, { uid: string; email: string; confirmado: boolean }> = {
  // a conta tem o e-mail da responsável, mas ainda não confirmou o e-mail
  semConfirmar: { uid: 'uid-titular', email: EMAILS.titular, confirmado: false },
  estranho: { uid: 'uid-estranho', email: EMAILS.estranho, confirmado: true },
  titular: { uid: 'uid-titular', email: EMAILS.titular, confirmado: true },
  adm: { uid: 'uid-adm', email: EMAILS.adm, confirmado: true },
  prof: { uid: 'uid-prof', email: EMAILS.prof, confirmado: true },
  profJardim: { uid: 'uid-jardim', email: EMAILS.profJardim, confirmado: true },
  aluno: { uid: 'uid-aluno', email: EMAILS.aluno, confirmado: true },
  aluno2: { uid: 'uid-aluno2', email: EMAILS.aluno2, confirmado: true },
  aluno3: { uid: 'uid-aluno3', email: EMAILS.aluno3, confirmado: true },
  convidado: { uid: 'uid-convidado', email: EMAILS.convidado, confirmado: true },
  convidadoAdm: { uid: 'uid-convidado-adm', email: EMAILS.convidadoAdm, confirmado: true },
}

export function banco(ambiente: RulesTestEnvironment, quem: Quem): Firestore {
  if (quem === 'anonimo') return ambiente.unauthenticatedContext().firestore() as unknown as Firestore
  const conta = CONTAS[quem]
  return ambiente
    .authenticatedContext(conta.uid, { email: conta.email, email_verified: conta.confirmado })
    .firestore() as unknown as Firestore
}

export function uidDe(quem: Exclude<Quem, 'anonimo'>): string {
  return CONTAS[quem].uid
}
