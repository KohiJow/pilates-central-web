// Dados fictícios de um estúdio pequeno: 2 unidades, a dona e 3 professores, cerca de 40 alunos,
// turmas de manhã, tarde e noite com 4 a 6 lugares, três semanas de histórico (presenças,
// faltas, avisos com crédito, reposições) e mensalidades com algumas pendentes.
// Tudo é montado com as mesmas regras do domínio que o app usa, então os dados nunca
// contradizem as regras (lotação, validade do crédito, reposição só com vaga).
import { aulasDoDia, idDaAula, montarAula } from '../../dominio/agenda'
import { CONFIGURACAO_PADRAO } from '../../dominio/configuracao'
import {
  competenciaDe,
  diasEntre,
  horaDe,
  minutosDe,
  minutosEntre,
  momentoDaAula,
  momentoDe,
  somarDias,
} from '../../dominio/datas'
import type { Momento } from '../../dominio/datas'
import { marcar } from '../../dominio/presenca'
import type { Alteracoes, Contexto } from '../../dominio/presenca'
import { cancelarAula, encaixar, verificarEncaixe } from '../../dominio/reposicao'
import type {
  Aluno,
  Configuracao,
  CreditoReposicao,
  DataISO,
  DiaDaSemana,
  FormaPagamento,
  Id,
  Instante,
  MembroEquipe,
  Pagamento,
  RegistroAula,
  Turma,
  Unidade,
} from '../../dominio/tipos'
import type { DadosBase } from '../repositorio'
import { criarAleatorio } from './aleatorio'
import type { Aleatorio } from './aleatorio'

export const VERSAO_DO_BANCO = 1

export interface BancoDeDemonstracao {
  versao: typeof VERSAO_DO_BANCO
  criadoEm: Instante
  base: DadosBase
  registros: Record<string, RegistroAula>
  creditos: Record<Id, CreditoReposicao>
  pagamentos: Record<Id, Pagamento>
}

const CONFIGURACAO: Configuracao = {
  ...CONFIGURACAO_PADRAO,
  whatsapp: '5511900000000',
}

const UNIDADES: Unidade[] = [
  { id: 'u-centro', nome: 'Centro', endereco: 'Rua Exemplo, 100, Centro', ativa: true },
  { id: 'u-jardim', nome: 'Jardim', endereco: 'Avenida Exemplo, 200, Jardim', ativa: true },
]

const EQUIPE: MembroEquipe[] = [
  {
    id: 'e-dona',
    nome: 'Helena Prado',
    papel: 'dona',
    email: 'dona@example.com',
    telefone: '5511900000001',
    unidades: ['u-centro', 'u-jardim'],
    ativo: true,
  },
  {
    id: 'e-rafael',
    nome: 'Rafael Moreira',
    papel: 'professor',
    email: 'rafael@example.com',
    telefone: '5511900000002',
    unidades: ['u-centro'],
    ativo: true,
  },
  {
    id: 'e-camila',
    nome: 'Camila Nunes',
    papel: 'professor',
    email: 'camila@example.com',
    telefone: '5511900000003',
    unidades: ['u-centro'],
    ativo: true,
  },
  {
    id: 'e-tiago',
    nome: 'Tiago Martins',
    papel: 'professor',
    email: 'tiago@example.com',
    telefone: '5511900000004',
    unidades: ['u-centro', 'u-jardim'],
    ativo: true,
  },
]

// grade da semana: unidade, dias, início, duração, capacidade, professor e procura (peso)
const GRADE: {
  unidadeId: Id
  dias: DiaDaSemana[]
  inicio: string
  duracaoMin: number
  capacidade: number
  professorId: Id
  procura: number
}[] = [
  { unidadeId: 'u-centro', dias: [1, 3, 5], inicio: '07:00', duracaoMin: 50, capacidade: 5, professorId: 'e-rafael', procura: 3 },
  { unidadeId: 'u-centro', dias: [1, 3, 5], inicio: '08:00', duracaoMin: 50, capacidade: 5, professorId: 'e-camila', procura: 2 },
  { unidadeId: 'u-centro', dias: [2, 4], inicio: '07:00', duracaoMin: 50, capacidade: 5, professorId: 'e-tiago', procura: 2 },
  { unidadeId: 'u-centro', dias: [2, 4], inicio: '12:00', duracaoMin: 50, capacidade: 4, professorId: 'e-dona', procura: 1 },
  { unidadeId: 'u-centro', dias: [1, 3, 5], inicio: '18:00', duracaoMin: 50, capacidade: 6, professorId: 'e-camila', procura: 4 },
  { unidadeId: 'u-centro', dias: [1, 3, 5], inicio: '19:00', duracaoMin: 50, capacidade: 5, professorId: 'e-rafael', procura: 3 },
  { unidadeId: 'u-centro', dias: [2, 4], inicio: '18:00', duracaoMin: 50, capacidade: 6, professorId: 'e-rafael', procura: 3 },
  { unidadeId: 'u-centro', dias: [2, 4], inicio: '19:00', duracaoMin: 50, capacidade: 5, professorId: 'e-camila', procura: 3 },
  { unidadeId: 'u-centro', dias: [6], inicio: '09:00', duracaoMin: 60, capacidade: 6, professorId: 'e-rafael', procura: 0 },
  { unidadeId: 'u-jardim', dias: [1, 3], inicio: '08:00', duracaoMin: 50, capacidade: 4, professorId: 'e-tiago', procura: 2 },
  { unidadeId: 'u-jardim', dias: [1, 3], inicio: '18:30', duracaoMin: 50, capacidade: 5, professorId: 'e-tiago', procura: 3 },
  { unidadeId: 'u-jardim', dias: [2, 4], inicio: '17:00', duracaoMin: 50, capacidade: 4, professorId: 'e-tiago', procura: 1 },
  { unidadeId: 'u-jardim', dias: [2, 4], inicio: '19:30', duracaoMin: 50, capacidade: 5, professorId: 'e-tiago', procura: 3 },
]

const NOMES = [
  'Ana', 'Beatriz', 'Carla', 'Daniela', 'Elisa', 'Fernanda', 'Gabriela', 'Isabela', 'Joana', 'Larissa',
  'Mariana', 'Natália', 'Olívia', 'Patrícia', 'Renata', 'Sílvia', 'Tânia', 'Vanessa', 'Carlos', 'Lúcia',
  'Marta', 'Cecília', 'Eduardo', 'Teresa', 'Paula', 'Regina', 'Fábio', 'Vera', 'Denise', 'Luana',
  'Bianca', 'Gustavo', 'Marcelo', 'Rosa', 'Sandra', 'Paulo', 'Yara', 'Roberto', 'Lívia', 'Sérgio',
]
const SOBRENOMES = [
  'Almeida', 'Barbosa', 'Cardoso', 'Dias', 'Esteves', 'Fonseca', 'Gomes', 'Lima', 'Macedo', 'Nogueira',
  'Oliveira', 'Pereira', 'Queiroz', 'Ribeiro', 'Santos', 'Toledo', 'Vieira', 'Xavier', 'Andrade', 'Bueno',
  'Campos', 'Duarte', 'Freitas', 'Garcia', 'Lopes', 'Mendes', 'Pires', 'Rocha', 'Siqueira', 'Tavares',
  'Valente', 'Moura', 'Leite', 'Porto', 'Rezende', 'Sales', 'Brito', 'Couto', 'Fontes', 'Ramos',
]
const OBSERVACOES = [
  'Prefere o aparelho perto da janela.',
  'Avisar pelo WhatsApp, não gosta de ligação.',
  'Paga sempre perto do dia 10.',
  'Desconto família (irmã também é aluna).',
  'Viaja a trabalho uma semana por mês.',
]

// feriados nacionais de data fixa (os móveis a dona marca à mão)
const FERIADOS_FIXOS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25']

const DIAS_DE_HISTORICO = 21
const DIAS_A_FRENTE = 7

function instanteDe(m: Momento): Instante {
  // Campinas está em UTC-3 o ano todo desde 2019
  return new Date(`${m.data}T${horaDe(m.minutos)}:00.000-03:00`).toISOString()
}

function idDaTurma(unidadeId: Id, dia: DiaDaSemana, inicio: string): Id {
  return `t-${unidadeId.replace('u-', '')}-${dia}-${inicio.replace(':', '')}`
}

function montarTurmas(desde: DataISO): Turma[] {
  return GRADE.flatMap((g) =>
    g.dias.map((dia) => ({
      id: idDaTurma(g.unidadeId, dia, g.inicio),
      unidadeId: g.unidadeId,
      diaDaSemana: dia,
      inicio: g.inicio,
      duracaoMin: g.duracaoMin,
      capacidade: g.capacidade,
      professorId: g.professorId,
      alunosFixos: [],
      ativa: true,
      desde,
    })),
  )
}

/** Combinações de dias possíveis para quem faz `vezes` aulas por semana num grupo da grade. */
function opcoesDeDias(dias: DiaDaSemana[], vezes: number, temSabado: boolean): DiaDaSemana[][] {
  if (dias.length === 3) {
    if (vezes >= 3) return [dias]
    return [
      [dias[0], dias[1]],
      [dias[1], dias[2]],
      [dias[0], dias[2]],
    ].filter((d): d is DiaDaSemana[] => d.every((x) => x !== undefined))
  }
  if (dias.length === 2 && vezes >= 3 && temSabado) return [[...dias, 6], dias]
  return [dias]
}

function distribuirAlunos(alunos: Aluno[], turmas: Turma[], aleatorio: Aleatorio): void {
  const turma = (unidadeId: Id, dia: DiaDaSemana, inicio: string) =>
    turmas.find((t) => t.unidadeId === unidadeId && t.diaDaSemana === dia && t.inicio === inicio)
  const sabadoDa = (unidadeId: Id) => turmas.find((t) => t.unidadeId === unidadeId && t.diaDaSemana === 6)
  const cabe = (t: Turma | undefined) => t !== undefined && t.alunosFixos.length < t.capacidade

  for (const aluno of alunos) {
    if (aluno.situacao !== 'ativo') continue
    const grupos = GRADE.filter((g) => g.unidadeId === aluno.unidadeId && g.procura > 0)
    const vezes = aluno.vezesPorSemana
    let escolhidas: Turma[] | undefined
    for (let tentativa = 0; tentativa < 16 && !escolhidas; tentativa++) {
      // horário procurado e com lugar sobrando atrai mais gente
      const folgaDoGrupo = (g: (typeof GRADE)[number]) =>
        g.dias.reduce<number>((s, d) => {
          const t = turma(g.unidadeId, d, g.inicio)
          return s + (t ? t.capacidade - t.alunosFixos.length : 0)
        }, 0)
      const grupo = aleatorio.escolherPonderado(grupos.map((g) => ({ item: g, peso: g.procura * g.procura * folgaDoGrupo(g) + 0.01 })))
      const sabado = sabadoDa(aluno.unidadeId)
      // entre as combinações de dias que cabem, fica a que deixa mais folga (espalha seg/qua/sex)
      let melhorFolga = -1
      for (const dias of opcoesDeDias(grupo.dias, vezes, cabe(sabado))) {
        const candidatas = dias.map((d) => (d === 6 ? sabado : turma(aluno.unidadeId, d, grupo.inicio)))
        if (!candidatas.every(cabe)) continue
        const certas = candidatas.filter((t): t is Turma => t !== undefined)
        const folga = Math.min(...certas.map((t) => t.capacidade - t.alunosFixos.length)) + aleatorio.proximo() * 0.5
        if (folga > melhorFolga) {
          melhorFolga = folga
          escolhidas = certas
        }
      }
    }
    if (!escolhidas) {
      // tudo cheio nos horários procurados: pega as duas primeiras turmas com lugar
      escolhidas = turmas.filter((t) => t.unidadeId === aluno.unidadeId && cabe(t)).slice(0, 2)
    }
    for (const t of escolhidas) t.alunosFixos.push(aluno.id)
    aluno.vezesPorSemana = escolhidas.length
    aluno.valorMensal = escolhidas.length >= 3 ? 36_000 : 28_000
  }
}

function criarAlunos(hoje: DataISO, aleatorio: Aleatorio): Aluno[] {
  const formas: { item: FormaPagamento; peso: number }[] = [
    { item: 'pix', peso: 55 },
    { item: 'dinheiro', peso: 12 },
    { item: 'cartao_credito', peso: 20 },
    { item: 'cartao_debito', peso: 13 },
  ]
  return NOMES.map((nome, i) => {
    const numero = String(10 + i).padStart(2, '0')
    const situacao = i === 13 || i === 33 ? 'pausado' : i === 38 ? 'inativo' : 'ativo'
    return {
      id: `a-${numero}`,
      nome: `${nome} ${SOBRENOMES[i] ?? ''}`.trim(),
      unidadeId: i % 10 < 7 ? 'u-centro' : 'u-jardim',
      telefone: `55119000000${numero}`,
      email: `aluno${numero}@example.com`,
      vezesPorSemana: aleatorio.chance(0.3) ? 3 : 2,
      situacao,
      valorMensal: 28_000,
      formaPagamento: aleatorio.escolherPonderado(formas),
      observacao: i % 7 === 3 ? (OBSERVACOES[(i / 7) | 0] ?? '') : '',
      desde: somarDias(hoje, -aleatorio.inteiro(20, 1100)),
    }
  })
}

/** Banco em memória que aplica as alterações do domínio, como o repositório faria. */
class Montagem {
  readonly registros = new Map<string, RegistroAula>()
  readonly creditos = new Map<Id, CreditoReposicao>()
  private readonly ativos: Set<Id>

  constructor(
    readonly turmas: Turma[],
    alunos: Aluno[],
    readonly config: Configuracao,
  ) {
    this.ativos = new Set(alunos.filter((a) => a.situacao === 'ativo').map((a) => a.id))
  }

  contexto(agora: Momento): Contexto {
    return { agora, instante: instanteDe(agora), config: this.config }
  }

  aula(turma: Turma, data: DataISO) {
    return montarAula(turma, data, this.registros.get(idDaAula(turma.id, data)), {
      ehAtivo: (id) => this.ativos.has(id),
    })
  }

  aulasDoDia(data: DataISO) {
    return aulasDoDia(data, this.turmas, (id) => this.registros.get(id), {}, { ehAtivo: (id) => this.ativos.has(id) })
  }

  aplicar(a: Alteracoes): void {
    for (const r of a.registros) this.registros.set(r.id, r)
    for (const c of a.creditos) this.creditos.set(c.id, c)
    for (const id of a.creditosRemovidos) this.creditos.delete(id)
  }

  marcar(turma: Turma, data: DataISO, alunoId: Id, marcacao: 'presente' | 'faltou' | 'avisou', agora: Momento): boolean {
    const aula = this.aula(turma, data)
    const r = marcar(aula, this.registros.get(aula.id), alunoId, marcacao, (id) => this.creditos.get(id), this.contexto(agora))
    if (r.ok) this.aplicar(r.valor.alteracoes)
    return r.ok
  }

  encaixar(turma: Turma, data: DataISO, credito: CreditoReposicao, agora: Momento): boolean {
    const aula = this.aula(turma, data)
    const r = encaixar(aula, this.registros.get(aula.id), credito, this.contexto(agora))
    if (r.ok) this.aplicar(r.valor)
    return r.ok
  }
}

export function gerarSemente(agora: Date, semente = 20261009): BancoDeDemonstracao {
  const aleatorio = criarAleatorio(semente)
  const momento = momentoDe(agora)
  const hoje = momento.data
  const inicio = somarDias(hoje, -DIAS_DE_HISTORICO)
  const fim = somarDias(hoje, DIAS_A_FRENTE)

  const alunos = criarAlunos(hoje, aleatorio)
  const turmas = montarTurmas(somarDias(hoje, -400))
  distribuirAlunos(alunos, turmas, aleatorio)
  const m = new Montagem(turmas, alunos, CONFIGURACAO)
  const turmaPorId = new Map(turmas.map((t) => [t.id, t]))
  const jaPassou = (data: DataISO, hora: string) => minutosEntre(momento, momentoDaAula(data, hora)) <= 0

  // feriados no período: aulas canceladas pela dona alguns dias antes, sem reposição
  for (let d = inicio; d <= somarDias(hoje, 28); d = somarDias(d, 1)) {
    if (!FERIADOS_FIXOS.includes(d.slice(5))) continue
    for (const aula of m.aulasDoDia(d)) {
      const quando = { data: somarDias(d, -3), minutos: 12 * 60 }
      const r = cancelarAula(
        aula,
        m.registros.get(aula.id),
        { motivo: 'feriado', observacao: 'Feriado nacional', gerarCreditos: false },
        (id) => m.creditos.get(id),
        m.contexto(quando),
      )
      if (r.ok) m.aplicar(r.valor.alteracoes)
    }
  }

  // histórico e próximos dias: avisos de falta (quase sempre na véspera), faltas e presenças
  const agoraAntes = { data: hoje, minutos: Math.max(0, momento.minutos - 30) }
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) {
    for (const aula of m.aulasDoDia(d)) {
      if (aula.cancelamento) continue
      const turma = turmaPorId.get(aula.turmaId)
      if (!turma) continue
      const encerrada = jaPassou(d, aula.fim)
      for (const p of aula.participantes) {
        const sorte = aleatorio.proximo()
        if (sorte < 0.08) {
          // aviso na véspera à noite; um em cada oito avisa em cima da hora (fica sem crédito)
          let quando: Momento = aleatorio.chance(0.125)
            ? { data: d, minutos: Math.max(0, minutosDe(aula.inicio) - 60) }
            : { data: somarDias(d, -1), minutos: 19 * 60 }
          // se essa hora ainda não chegou, o aviso foi agora há pouco
          if (minutosEntre(momento, quando) > 0) quando = agoraAntes
          m.marcar(turma, d, p.alunoId, 'avisou', quando)
        } else if (encerrada) {
          const marcacao = sorte < 0.12 ? 'faltou' : 'presente'
          m.marcar(turma, d, p.alunoId, marcacao, { data: d, minutos: minutosDe(aula.fim) })
        }
      }
    }
  }

  // reposições: parte dos créditos já foi usada, em aulas da mesma unidade com vaga
  const creditosPorData = [...m.creditos.values()].sort((a, b) => a.origem.data.localeCompare(b.origem.data))
  for (const credito of creditosPorData) {
    if (!aleatorio.chance(0.6)) continue
    const primeiroDia = somarDias(credito.origem.data, aleatorio.inteiro(1, 6))
    for (let d = primeiroDia; d <= fim && d <= credito.validoAte; d = somarDias(d, 1)) {
      const destino = m
        .aulasDoDia(d)
        .find((a) => a.unidadeId === credito.unidadeId && a.vagas > 0 && !a.cancelamento)
      if (!destino) continue
      const turma = turmaPorId.get(destino.turmaId)
      if (!turma) continue
      const quando = { data: d, minutos: Math.max(0, minutosDe(destino.inicio) - 120) }
      if (minutosEntre(momento, quando) > 0) break // não encaixa "no futuro": quem encaixou foi alguém antes de agora
      if (!verificarEncaixe(destino, m.creditos.get(credito.id) ?? credito, quando).ok) continue
      if (m.encaixar(turma, d, m.creditos.get(credito.id) ?? credito, quando)) {
        if (jaPassou(d, destino.fim)) {
          const veio = aleatorio.chance(0.9) ? 'presente' : 'faltou'
          m.marcar(turma, d, credito.alunoId, veio, { data: d, minutos: minutosDe(destino.fim) })
        }
        break
      }
    }
  }

  // garante movimento hoje: pelo menos duas reposições e dois avisos nas aulas que ainda vão acontecer
  const aulasDeHojeAFrente = () => m.aulasDoDia(hoje).filter((a) => !a.cancelamento && !jaPassou(hoje, a.inicio))
  const livres = () => [...m.creditos.values()].filter((c) => !c.usadoEm && c.origem.data < hoje)
  let reposicoesHoje = m.aulasDoDia(hoje).flatMap((a) => a.participantes.filter((p) => p.origem === 'reposicao')).length
  for (const aula of aulasDeHojeAFrente()) {
    if (reposicoesHoje >= 2) break
    const turma = turmaPorId.get(aula.turmaId)
    if (!turma) continue
    const atual = m.aula(turma, hoje)
    const credito = livres().find((c) => verificarEncaixe(atual, c, agoraAntes).ok)
    if (credito && m.encaixar(turma, hoje, credito, agoraAntes)) reposicoesHoje++
  }
  let avisosHoje = m.aulasDoDia(hoje).flatMap((a) => a.participantes.filter((p) => p.marcacao === 'avisou')).length
  for (const aula of aulasDeHojeAFrente().reverse()) {
    if (avisosHoje >= 2) break
    const turma = turmaPorId.get(aula.turmaId)
    const fixo = aula.participantes.find((p) => p.origem === 'fixo' && p.marcacao === undefined)
    if (turma && fixo && m.marcar(turma, hoje, fixo.alunoId, 'avisou', agoraAntes)) avisosHoje++
  }

  return {
    versao: VERSAO_DO_BANCO,
    criadoEm: agora.toISOString(),
    base: {
      configuracao: CONFIGURACAO,
      unidades: UNIDADES.map((u) => ({ ...u })),
      equipe: EQUIPE.map((e) => ({ ...e, unidades: [...e.unidades] })),
      alunos,
      turmas,
    },
    registros: Object.fromEntries(m.registros),
    creditos: Object.fromEntries(m.creditos),
    pagamentos: gerarPagamentos(alunos, hoje, aleatorio),
  }
}

function gerarPagamentos(alunos: Aluno[], hoje: DataISO, aleatorio: Aleatorio): Record<Id, Pagamento> {
  const pagamentos: Record<Id, Pagamento> = {}
  const atual = competenciaDe(hoje)
  const anterior = competenciaDe(somarDias(`${atual}-01`, -1))
  const diaDeHoje = Number(hoje.slice(8, 10))
  for (const aluno of alunos) {
    if (aluno.situacao !== 'ativo') continue
    for (const competencia of [anterior, atual]) {
      const ehAtual = competencia === atual
      // no mês anterior quase todo mundo pagou; no atual, depende de que dia é hoje
      const probabilidade = ehAtual ? (diaDeHoje >= 10 ? 0.72 : 0.4) : 0.95
      if (!aleatorio.chance(probabilidade)) continue
      const ultimoDia = ehAtual ? Math.min(diaDeHoje, 12) : 12
      const dia = String(aleatorio.inteiro(1, Math.max(1, ultimoDia))).padStart(2, '0')
      const id = `pg_${aluno.id}_${competencia}`
      pagamentos[id] = {
        id,
        alunoId: aluno.id,
        unidadeId: aluno.unidadeId,
        competencia,
        valor: aluno.valorMensal,
        forma: aluno.formaPagamento,
        pagoEm: `${competencia}-${dia}`,
        observacao: '',
      }
    }
  }
  return pagamentos
}

/** Quantos dias o banco cobre a partir do dia em que foi gerado (usado pelos testes). */
export function coberturaDaSemente(criadoEm: DataISO): { de: DataISO; ate: DataISO; dias: number } {
  const de = somarDias(criadoEm, -DIAS_DE_HISTORICO)
  const ate = somarDias(criadoEm, DIAS_A_FRENTE)
  return { de, ate, dias: diasEntre(de, ate) + 1 }
}

