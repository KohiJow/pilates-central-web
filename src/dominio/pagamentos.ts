// Financeiro preenchido à mão: mensalidade prevista por aluno, pagamentos lançados pela
// administração, o que está em aberto e o resumo do mês por unidade.
import { dataCurta, diasEntre, ehDataValida, nomeDoMes, somarDias } from './datas'
import type { ErrosDeCampo } from './resultado'
import { primeiroNome } from './texto'
import type { Aluno, Centavos, Competencia, DataISO, FinanceiroDoAluno, FormaPagamento, Id, Pagamento } from './tipos'

/** Na ordem em que aparecem para escolher (as mais usadas primeiro). */
export const FORMAS: readonly FormaPagamento[] = [
  'pix',
  'cartao_credito',
  'cartao_debito',
  'dinheiro',
  'transferencia',
  'gympass',
  'totalpass',
  'outro',
]

export const NOME_DA_FORMA: Record<FormaPagamento, string> = {
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  gympass: 'Gympass',
  totalpass: 'TotalPass',
  outro: 'Outro',
}

const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function emReais(valor: Centavos): string {
  // o Intl usa espaço não separável entre "R$" e o número; mantém assim para não quebrar linha
  return reais.format(valor / 100)
}

/** "280,00": para o campo de valor e para a planilha */
export function emDecimal(valor: Centavos): string {
  return decimal.format(valor / 100)
}

/** "R$ 1.280,50", "280", "280,5" -> centavos. null se não for um valor. */
export function lerValor(texto: string): Centavos | null {
  let limpo = texto.replace(/R\$|\s/g, '')
  // "280.50" com ponto e uma ou duas casas é centavo (teclado em inglês), não milhar
  if (/^\d+\.\d{1,2}$/.test(limpo)) limpo = limpo.replace('.', ',')
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(limpo)) return null
  const [inteiro = '0', fracao = ''] = limpo.replace(/\./g, '').split(',')
  return Number(inteiro) * 100 + Number(fracao.padEnd(2, '0'))
}

// ---------- competências (mês de referência) ----------

export function deslocarCompetencia(c: Competencia, meses: number): Competencia {
  const ano = Number(c.slice(0, 4))
  const mes = Number(c.slice(5, 7)) - 1 + meses
  const a = ano + Math.floor(mes / 12)
  const m = ((mes % 12) + 12) % 12
  return `${a}-${String(m + 1).padStart(2, '0')}`
}

/** As `n` competências que terminam em `c`, da mais antiga para a mais nova. */
export function ultimasCompetencias(c: Competencia, n: number): Competencia[] {
  return Array.from({ length: n }, (_, i) => deslocarCompetencia(c, i - n + 1))
}

/** "outubro de 2026" */
export function nomeDaCompetencia(c: Competencia): string {
  return `${nomeDoMes(`${c}-01`)} de ${c.slice(0, 4)}`
}

/** "out" */
export function nomeCurtoDaCompetencia(c: Competencia): string {
  return nomeDoMes(`${c}-01`).slice(0, 3)
}

export function ultimoDiaDaCompetencia(c: Competencia): DataISO {
  return somarDias(`${deslocarCompetencia(c, 1)}-01`, -1)
}

export function vencimentoNaCompetencia(c: Competencia, dia: number): DataISO {
  return `${c}-${String(Math.min(Math.max(dia, 1), 28)).padStart(2, '0')}`
}

// ---------- resumo do mês ----------

export interface SituacaoNoMes {
  alunoId: Id
  unidadeId: Id
  devido: Centavos
  pago: Centavos
  /** quanto falta pagar (zero se pagou tudo ou mais) */
  falta: Centavos
  vencimento: DataISO
  atrasado: boolean
}

export interface TotalPorForma {
  forma: FormaPagamento
  valor: Centavos
  quantidade: number
}

export interface ResumoDoMes {
  competencia: Competencia
  alunosAtivos: number
  /** soma das mensalidades de quem está ativo no mês */
  previsto: Centavos
  recebido: Centavos
  /** soma do que falta de cada aluno (pagamento a mais de um não cobre outro) */
  emAberto: Centavos
  porForma: TotalPorForma[]
  /** quem deve alguma coisa no mês: atrasados primeiro */
  abertos: SituacaoNoMes[]
  pagamentos: Pagamento[]
}

/** Deve mensalidade no mês quem está ativo e já era aluno em algum dia do mês. */
export function deveNoMes(aluno: Aluno, competencia: Competencia): boolean {
  return aluno.situacao === 'ativo' && aluno.desde <= ultimoDiaDaCompetencia(competencia)
}

export function resumoDoMes(
  alunos: readonly Aluno[],
  financeiro: ReadonlyMap<Id, FinanceiroDoAluno>,
  pagamentos: readonly Pagamento[],
  competencia: Competencia,
  hoje: DataISO,
  unidadeId?: Id,
): ResumoDoMes {
  const daUnidade = (u: Id) => unidadeId === undefined || u === unidadeId
  const doMes = pagamentos
    .filter((p) => p.competencia === competencia && daUnidade(p.unidadeId))
    .sort((a, b) => b.pagoEm.localeCompare(a.pagoEm) || a.id.localeCompare(b.id))
  const pagoPorAluno = new Map<Id, Centavos>()
  const formas = new Map<FormaPagamento, TotalPorForma>()
  let recebido = 0
  for (const p of doMes) {
    recebido += p.valor
    pagoPorAluno.set(p.alunoId, (pagoPorAluno.get(p.alunoId) ?? 0) + p.valor)
    const f = formas.get(p.forma) ?? { forma: p.forma, valor: 0, quantidade: 0 }
    f.valor += p.valor
    f.quantidade += 1
    formas.set(p.forma, f)
  }

  const ativos = alunos.filter((a) => daUnidade(a.unidadeId) && deveNoMes(a, competencia))
  const situacoes: SituacaoNoMes[] = ativos.map((a) => {
    const fin = financeiro.get(a.id)
    const devido = fin?.valorMensal ?? 0
    const pago = pagoPorAluno.get(a.id) ?? 0
    const falta = Math.max(0, devido - pago)
    const vencimento = vencimentoNaCompetencia(competencia, fin?.diaVencimento ?? 10)
    return { alunoId: a.id, unidadeId: a.unidadeId, devido, pago, falta, vencimento, atrasado: falta > 0 && hoje > vencimento }
  })
  const nomes = new Map(alunos.map((a) => [a.id, a.nome]))
  const abertos = situacoes
    .filter((s) => s.falta > 0)
    .sort(
      (a, b) =>
        Number(b.atrasado) - Number(a.atrasado) ||
        a.vencimento.localeCompare(b.vencimento) ||
        (nomes.get(a.alunoId) ?? '').localeCompare(nomes.get(b.alunoId) ?? '', 'pt-BR'),
    )

  return {
    competencia,
    alunosAtivos: ativos.length,
    previsto: situacoes.reduce((s, x) => s + x.devido, 0),
    recebido,
    emAberto: abertos.reduce((s, x) => s + x.falta, 0),
    porForma: [...formas.values()].sort((a, b) => b.valor - a.valor || FORMAS.indexOf(a.forma) - FORMAS.indexOf(b.forma)),
    abertos,
    pagamentos: doMes,
  }
}

export interface RecebidoNoMes {
  competencia: Competencia
  recebido: Centavos
}

/** Quanto entrou em cada mês (pela competência), para o gráfico dos últimos meses. */
export function historicoRecebido(
  pagamentos: readonly Pagamento[],
  competencias: readonly Competencia[],
  unidadeId?: Id,
): RecebidoNoMes[] {
  return competencias.map((competencia) => ({
    competencia,
    recebido: pagamentos
      .filter((p) => p.competencia === competencia && (unidadeId === undefined || p.unidadeId === unidadeId))
      .reduce((s, p) => s + p.valor, 0),
  }))
}

/** Valor que o lançamento rápido sugere: o que falta do mês, ou a mensalidade inteira. */
export function valorSugerido(fin: FinanceiroDoAluno | undefined, pagoNoMes: Centavos): Centavos {
  if (!fin) return 0
  const falta = fin.valorMensal - pagoNoMes
  return falta > 0 ? falta : fin.valorMensal
}

// ---------- lançar pagamento ----------

export interface RascunhoPagamento {
  valor: string
  forma: FormaPagamento | null
  pagoEm: DataISO
  competencia: Competencia
  observacao: string
}

export type CampoPagamento = 'valor' | 'forma' | 'pagoEm' | 'competencia' | 'observacao'

const VALOR_MAXIMO = 1_000_000 // R$ 10.000,00: acima disso é quase certo erro de digitação

export function validarPagamento(r: RascunhoPagamento, hoje: DataISO): ErrosDeCampo<CampoPagamento> {
  const erros: ErrosDeCampo<CampoPagamento> = {}
  const valor = lerValor(r.valor)
  if (valor === null) erros.valor = 'Digite o valor, por exemplo 280 ou 280,50.'
  else if (valor <= 0) erros.valor = 'O valor tem que ser maior que zero.'
  else if (valor > VALOR_MAXIMO) erros.valor = 'Valor alto demais. Confira os zeros.'
  if (!r.forma) erros.forma = 'Escolha a forma de pagamento.'
  if (!ehDataValida(r.pagoEm)) erros.pagoEm = 'Escolha a data do pagamento.'
  else if (r.pagoEm > hoje) erros.pagoEm = 'A data não pode ser depois de hoje.'
  else if (diasEntre(r.pagoEm, hoje) > 400) erros.pagoEm = 'Data antiga demais. Confira o ano.'
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.competencia)) erros.competencia = 'Escolha o mês da mensalidade.'
  if (r.observacao.length > 200) erros.observacao = 'Use no máximo 200 letras.'
  return erros
}

export function novoPagamento(r: RascunhoPagamento, aluno: Aluno, id: Id, registradoPorId: Id): Pagamento | null {
  const valor = lerValor(r.valor)
  if (valor === null || !r.forma) return null
  return {
    id,
    alunoId: aluno.id,
    unidadeId: aluno.unidadeId,
    competencia: r.competencia,
    valor,
    forma: r.forma,
    pagoEm: r.pagoEm,
    observacao: r.observacao.trim(),
    registradoPorId,
  }
}

// ---------- lembrete e planilha ----------

/** Mensagem educada para o WhatsApp do aluno, pronta para a administração só tocar em enviar. */
export function mensagemDeLembrete(opcoes: {
  nomeAluno: string
  nomeEstudio: string
  competencia: Competencia
  valor: Centavos
  vencimento: DataISO
  atrasado: boolean
}): string {
  const { nomeAluno, nomeEstudio, competencia, valor, vencimento, atrasado } = opcoes
  const mes = nomeDoMes(`${competencia}-01`)
  const quando = atrasado ? `que venceu em ${dataCurta(vencimento)}` : `que vence em ${dataCurta(vencimento)}`
  return (
    `Oi, ${primeiroNome(nomeAluno)}! Tudo bem? Aqui é do ${nomeEstudio}. ` +
    `Passando para lembrar da mensalidade de ${mes} (${emReais(valor).replace(/\s/g, ' ')}), ${quando}. ` +
    'Se já pagou, pode desconsiderar. Obrigado!'
  )
}

/** Célula de planilha: aspas quando preciso e nada que o Excel leia como fórmula. */
function celula(texto: string): string {
  let t = texto
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

function dataBrasileira(data: DataISO): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`
}

/**
 * Planilha do mês (CSV com ponto e vírgula e BOM, que o Excel em português abre direto):
 * uma linha por pagamento e uma por mensalidade em aberto.
 */
export function planilhaDoMes(
  resumo: ResumoDoMes,
  nomeDoAluno: (id: Id) => string,
  nomeDaUnidade: (id: Id) => string,
): string {
  const linhas: string[][] = [['Aluno', 'Unidade', 'Mês', 'Situação', 'Valor', 'Forma', 'Data', 'Observação']]
  const mes = resumo.competencia.split('-').reverse().join('/')
  const porNome = <T extends { alunoId: Id }>(a: T, b: T) => nomeDoAluno(a.alunoId).localeCompare(nomeDoAluno(b.alunoId), 'pt-BR')
  for (const p of [...resumo.pagamentos].sort(porNome)) {
    linhas.push([
      nomeDoAluno(p.alunoId),
      nomeDaUnidade(p.unidadeId),
      mes,
      'pago',
      emDecimal(p.valor),
      NOME_DA_FORMA[p.forma],
      dataBrasileira(p.pagoEm),
      p.observacao,
    ])
  }
  for (const s of [...resumo.abertos].sort(porNome)) {
    linhas.push([
      nomeDoAluno(s.alunoId),
      nomeDaUnidade(s.unidadeId),
      mes,
      s.atrasado ? 'atrasado' : 'em aberto',
      emDecimal(s.falta),
      '',
      dataBrasileira(s.vencimento),
      s.pago > 0 ? `pagou ${emDecimal(s.pago)} de ${emDecimal(s.devido)}` : '',
    ])
  }
  return `\uFEFF${linhas.map((l) => l.map(celula).join(';')).join('\r\n')}\r\n`
}
