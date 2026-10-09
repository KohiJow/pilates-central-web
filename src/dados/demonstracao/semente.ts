// Dados fictícios de um estúdio pequeno: 2 unidades, a responsável, uma pessoa na administração e
// 3 professores, 40 alunos, turmas de manhã, tarde e noite com 4 a 6 lugares, histórico desde o
// começo do mês anterior (presenças, faltas, avisos com crédito, reposições) e seis meses de
// mensalidades, com algumas em aberto.
// Tudo é montado com as mesmas regras do domínio que o app usa, então os dados nunca
// contradizem as regras (lotação, validade do crédito, reposição só com vaga).
import { aulasDoDia, idDaAula, montarAula } from '../../dominio/agenda'
import { CONFIGURACAO_PADRAO } from '../../dominio/configuracao'
import { deslocarCompetencia, FORMAS, ultimasCompetencias, ultimoDiaDaCompetencia } from '../../dominio/pagamentos'
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
  FinanceiroDoAluno,
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

// 2: papéis da administração, financeiro separado do aluno, seis meses de mensalidades
// 3: acesso do aluno e página pública ligados, alguns alunos com acesso liberado
export const VERSAO_DO_BANCO = 3

export interface BancoDeDemonstracao {
  versao: typeof VERSAO_DO_BANCO
  criadoEm: Instante
  base: DadosBase
  registros: Record<string, RegistroAula>
  creditos: Record<Id, CreditoReposicao>
  financeiro: Record<Id, FinanceiroDoAluno>
  pagamentos: Record<Id, Pagamento>
}

const CONFIGURACAO: Configuracao = {
  ...CONFIGURACAO_PADRAO,
  whatsapp: '5511900000000',
  acessoDoAluno: true,
  paginaExperimental: true,
}

/** Alunos que já receberam acesso ao app (posição na lista de nomes). */
const COM_ACESSO = [1, 4, 11, 16, 22, 27]

const UNIDADES: Unidade[] = [
  // o endereço do Centro é o do estúdio (público); o resto da demonstração é fictício
  { id: 'u-centro', nome: 'Centro', endereco: 'Av. Dr. Thomáz Alves, 148, sala 2, Centro, Campinas/SP', ativa: true },
  { id: 'u-jardim', nome: 'Jardim', endereco: 'Avenida Exemplo, 200, Jardim', ativa: true },
]

const EQUIPE: MembroEquipe[] = [
  {
    id: 'e-helena',
    nome: 'Helena Prado',
    papel: 'titular',
    email: 'helena@example.com',
    telefone: '5511900000001',
    unidades: ['u-centro', 'u-jardim'],
    ativo: true,
  },
  {
    id: 'e-marcos',
    nome: 'Marcos Teles',
    papel: 'administrador',
    email: 'marcos@example.com',
    telefone: '5511900000005',
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
  { unidadeId: 'u-centro', dias: [2, 4], inicio: '12:00', duracaoMin: 50, capacidade: 4, professorId: 'e-helena', procura: 1 },
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

// feriados nacionais de data fixa (os móveis a administração marca à mão)
const FERIADOS_FIXOS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25']

// as três semanas que os testes de ponta a ponta conhecem; antes delas, até o começo do mês anterior
const DIAS_RECENTES = 21
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
  }
}

// mensalidade por plano; quem vem pelo Gympass ou TotalPass entra com o repasse da plataforma
const MENSALIDADE: Record<number, number> = { 1: 18_000, 2: 28_000, 3: 36_000 }
const REPASSE_DE_PLATAFORMA = 15_000

function criarAlunos(hoje: DataISO, aleatorio: Aleatorio): { alunos: Aluno[]; formas: FormaPagamento[] } {
  const pesos: { item: FormaPagamento; peso: number }[] = [
    { item: 'pix', peso: 55 },
    { item: 'dinheiro', peso: 12 },
    { item: 'cartao_credito', peso: 20 },
    { item: 'cartao_debito', peso: 13 },
  ]
  const formas: FormaPagamento[] = []
  // a ordem dos sorteios (plano, forma, data de início) é a mesma desde a primeira versão:
  // mudar a ordem mudaria a demonstração inteira
  const alunos = NOMES.map((nome, i): Aluno => {
    const numero = String(10 + i).padStart(2, '0')
    const situacao = i === 13 || i === 33 ? 'pausado' : i === 38 ? 'inativo' : 'ativo'
    const vezesPorSemana = aleatorio.chance(0.3) ? 3 : 2
    const sorteada = aleatorio.escolherPonderado(pesos)
    formas.push(i === 5 ? 'gympass' : i === 21 ? 'totalpass' : sorteada)
    return {
      id: `a-${numero}`,
      nome: `${nome} ${SOBRENOMES[i] ?? ''}`.trim(),
      unidadeId: i % 10 < 7 ? 'u-centro' : 'u-jardim',
      telefone: `55119000000${numero}`,
      email: `aluno${numero}@example.com`,
      vezesPorSemana,
      situacao,
      observacao: i % 7 === 3 ? (OBSERVACOES[(i / 7) | 0] ?? '') : '',
      desde: somarDias(hoje, -aleatorio.inteiro(20, 1100)),
    }
  })
  return { alunos, formas }
}

function criarFinanceiro(alunos: readonly Aluno[], formas: readonly FormaPagamento[]): Record<Id, FinanceiroDoAluno> {
  const financeiro: Record<Id, FinanceiroDoAluno> = {}
  alunos.forEach((aluno, i) => {
    const forma = formas[i] ?? 'pix'
    const plataforma = forma === 'gympass' || forma === 'totalpass'
    financeiro[aluno.id] = {
      alunoId: aluno.id,
      unidadeId: aluno.unidadeId,
      valorMensal: plataforma ? REPASSE_DE_PLATAFORMA : (MENSALIDADE[aluno.vezesPorSemana] ?? 28_000),
      formaPreferida: forma,
      diaVencimento: [5, 10, 15][i % 3] ?? 10,
    }
  })
  return financeiro
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

/** Marcações de um trecho do calendário: avisos (quase sempre na véspera), faltas e presenças. */
function marcarHistorico(
  m: Montagem,
  turmaPorId: ReadonlyMap<Id, Turma>,
  aleatorio: Aleatorio,
  de: DataISO,
  ate: DataISO,
  momento: Momento,
): void {
  const jaPassou = (data: DataISO, hora: string) => minutosEntre(momento, momentoDaAula(data, hora)) <= 0
  const agoraAntes = { data: momento.data, minutos: Math.max(0, momento.minutos - 30) }
  for (let d = de; d <= ate; d = somarDias(d, 1)) {
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
}

/** Parte dos créditos já foi usada, em aulas da mesma unidade com vaga, até `ultimoDia`. */
function encaixarReposicoes(
  m: Montagem,
  turmaPorId: ReadonlyMap<Id, Turma>,
  aleatorio: Aleatorio,
  creditos: readonly CreditoReposicao[],
  ultimoDia: DataISO,
  momento: Momento,
): void {
  const jaPassou = (data: DataISO, hora: string) => minutosEntre(momento, momentoDaAula(data, hora)) <= 0
  const porData = [...creditos].sort((a, b) => a.origem.data.localeCompare(b.origem.data))
  for (const credito of porData) {
    if (!aleatorio.chance(0.6)) continue
    const primeiroDia = somarDias(credito.origem.data, aleatorio.inteiro(1, 6))
    for (let d = primeiroDia; d <= ultimoDia && d <= credito.validoAte; d = somarDias(d, 1)) {
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
}

/** Primeiro dia do mês anterior ao de `hoje`: a frequência do mês passado fica completa. */
function inicioDoHistorico(hoje: DataISO): DataISO {
  return `${deslocarCompetencia(competenciaDe(hoje), -1)}-01`
}

export function gerarSemente(agora: Date, semente = 20261009): BancoDeDemonstracao {
  const aleatorio = criarAleatorio(semente)
  // o trecho mais antigo do histórico usa outro sorteio: assim as três semanas recentes (as que
  // os testes de ponta a ponta conhecem) saem iguais às da primeira versão da demonstração
  const aleatorioAntigo = criarAleatorio(semente + 1)
  const momento = momentoDe(agora)
  const hoje = momento.data
  const inicio = somarDias(hoje, -DIAS_RECENTES)
  const inicioAntigo = inicioDoHistorico(hoje)
  const fim = somarDias(hoje, DIAS_A_FRENTE)

  const { alunos, formas } = criarAlunos(hoje, aleatorio)
  const turmas = montarTurmas(somarDias(hoje, -400))
  distribuirAlunos(alunos, turmas, aleatorio)
  // sem sorteio: não muda o resto da demonstração
  for (const i of COM_ACESSO) {
    const aluno = alunos[i]
    if (aluno?.situacao === 'ativo') aluno.acesso = { convidadoEm: instanteDe({ data: somarDias(hoje, -20), minutos: 10 * 60 }), porId: 'e-helena' }
  }
  const m = new Montagem(turmas, alunos, CONFIGURACAO)
  const turmaPorId = new Map(turmas.map((t) => [t.id, t]))
  const jaPassou = (data: DataISO, hora: string) => minutosEntre(momento, momentoDaAula(data, hora)) <= 0

  // feriados no período: aulas canceladas pela administração alguns dias antes, sem reposição
  for (let d = inicioAntigo; d <= somarDias(hoje, 28); d = somarDias(d, 1)) {
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

  // trecho antigo: do começo do mês anterior até três semanas atrás, com reposições só nele
  const fimAntigo = somarDias(inicio, -1)
  if (inicioAntigo <= fimAntigo) {
    marcarHistorico(m, turmaPorId, aleatorioAntigo, inicioAntigo, fimAntigo, momento)
    const antigos = [...m.creditos.values()].filter((c) => c.origem.data < inicio)
    encaixarReposicoes(m, turmaPorId, aleatorioAntigo, antigos, fimAntigo, momento)
  }

  // três semanas recentes e próximos dias
  marcarHistorico(m, turmaPorId, aleatorio, inicio, fim, momento)
  const recentes = [...m.creditos.values()].filter((c) => c.origem.data >= inicio)
  encaixarReposicoes(m, turmaPorId, aleatorio, recentes, fim, momento)

  // garante movimento hoje: pelo menos duas reposições e dois avisos nas aulas que ainda vão acontecer
  const agoraAntes = { data: hoje, minutos: Math.max(0, momento.minutos - 30) }
  const aulasDeHojeAFrente = () => m.aulasDoDia(hoje).filter((a) => !a.cancelamento && !jaPassou(hoje, a.inicio))
  const livres = () => [...m.creditos.values()].filter((c) => !c.usadoEm && c.origem.data >= inicio && c.origem.data < hoje)
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

  sumirDasUltimasAulas(m, turmaPorId, alunos, inicio, hoje)

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
    financeiro: criarFinanceiro(alunos, formas),
    pagamentos: gerarPagamentos(alunos, criarFinanceiro(alunos, formas), hoje, aleatorio),
  }
}

/**
 * Um aluno que veio sempre e faltou as três últimas aulas: o caso que a lista de alunos destaca
 * (sem sorteio, para não mexer no resto da demonstração).
 */
function sumirDasUltimasAulas(m: Montagem, turmaPorId: ReadonlyMap<Id, Turma>, alunos: readonly Aluno[], de: DataISO, hoje: DataISO) {
  const passadas = new Map<Id, { turma: Turma; data: DataISO; marcacao?: string; origem: string }[]>()
  for (let d = de; d < hoje; d = somarDias(d, 1)) {
    for (const aula of m.aulasDoDia(d)) {
      if (aula.cancelamento) continue
      const turma = turmaPorId.get(aula.turmaId)
      if (!turma) continue
      for (const p of aula.participantes) {
        const lista = passadas.get(p.alunoId) ?? []
        lista.push(p.marcacao ? { turma, data: d, marcacao: p.marcacao, origem: p.origem } : { turma, data: d, origem: p.origem })
        passadas.set(p.alunoId, lista)
      }
    }
  }
  for (const aluno of alunos) {
    if (aluno.situacao !== 'ativo') continue
    const ultimas = (passadas.get(aluno.id) ?? []).slice(-3)
    if (ultimas.length < 3 || !ultimas.every((u) => u.marcacao === 'presente' && u.origem === 'fixo')) continue
    for (const u of ultimas) m.marcar(u.turma, u.data, aluno.id, 'faltou', { data: u.data, minutos: 23 * 60 })
    return
  }
}

function gerarPagamentos(
  alunos: readonly Aluno[],
  financeiro: Record<Id, FinanceiroDoAluno>,
  hoje: DataISO,
  aleatorio: Aleatorio,
): Record<Id, Pagamento> {
  const pagamentos: Record<Id, Pagamento> = {}
  const atual = competenciaDe(hoje)
  const anterior = deslocarCompetencia(atual, -1)
  const diaDeHoje = Number(hoje.slice(8, 10))
  const quemLanca = ['e-helena', 'e-marcos'] as const
  let n = 0
  for (const competencia of ultimasCompetencias(atual, 6)) {
    for (const aluno of alunos) {
      const fin = financeiro[aluno.id]
      if (!fin || aluno.desde > ultimoDiaDaCompetencia(competencia)) continue
      // pausados e arquivados pagaram os meses mais antigos (ainda vinham)
      if (aluno.situacao !== 'ativo' && competencia >= anterior) continue
      const ehAtual = competencia === atual
      const probabilidade = ehAtual ? (diaDeHoje >= fin.diaVencimento ? 0.8 : 0.35) : competencia === anterior ? 0.93 : 0.97
      if (!aleatorio.chance(probabilidade)) continue
      const ultimoDia = ehAtual ? Math.min(diaDeHoje, fin.diaVencimento + 3) : fin.diaVencimento + 3
      // quem entrou no meio do mês paga a partir do dia em que entrou
      const primeiroDia = aluno.desde.startsWith(competencia) ? Number(aluno.desde.slice(8, 10)) : 1
      const sorteado = aleatorio.inteiro(1, Math.max(1, ultimoDia))
      const dia = String(Math.max(sorteado, primeiroDia)).padStart(2, '0')
      // de vez em quando paga de outro jeito ou só uma parte
      const forma = aleatorio.chance(0.1) ? (FORMAS[aleatorio.inteiro(0, 4)] ?? fin.formaPreferida) : fin.formaPreferida
      const parcial = ehAtual && aleatorio.chance(0.06)
      const id = `pg_${aluno.id}_${competencia}`
      pagamentos[id] = {
        id,
        alunoId: aluno.id,
        unidadeId: aluno.unidadeId,
        competencia,
        valor: parcial ? fin.valorMensal / 2 : fin.valorMensal,
        forma,
        pagoEm: `${competencia}-${dia}`,
        observacao: parcial ? 'Metade agora, o resto no fim do mês.' : '',
        registradoPorId: quemLanca[n++ % 2] ?? 'e-helena',
      }
    }
  }
  return pagamentos
}

/** Quantos dias o banco cobre a partir do dia em que foi gerado (usado pelos testes). */
export function coberturaDaSemente(criadoEm: DataISO): { de: DataISO; ate: DataISO; dias: number } {
  const de = inicioDoHistorico(criadoEm)
  const ate = somarDias(criadoEm, DIAS_A_FRENTE)
  return { de, ate, dias: diasEntre(de, ate) + 1 }
}
