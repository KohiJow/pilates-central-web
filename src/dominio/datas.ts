import type { Competencia, DataISO, DiaDaSemana, Hora, Periodo } from './tipos'

// O estúdio fica em Campinas. Tudo que depende de "agora" passa pelo relógio do estúdio,
// então um celular com outro fuso (viagem, configuração errada) não embaralha a agenda.
export const FUSO_DO_ESTUDIO = 'America/Sao_Paulo'

/** Um ponto no tempo visto do estúdio: data de calendário + minutos desde a meia-noite. */
export interface Momento {
  data: DataISO
  minutos: number
}

const formatadores = new Map<string, Intl.DateTimeFormat>()
function formatadorDoFuso(fuso: string): Intl.DateTimeFormat {
  let f = formatadores.get(fuso)
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: fuso,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    formatadores.set(fuso, f)
  }
  return f
}

export function momentoDe(agora: Date, fuso: string = FUSO_DO_ESTUDIO): Momento {
  const partes: Record<string, string> = {}
  for (const p of formatadorDoFuso(fuso).formatToParts(agora)) partes[p.type] = p.value
  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  }
}

const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/
const RE_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/

export function ehDataValida(texto: string): boolean {
  const m = RE_DATA.exec(texto)
  if (!m) return false
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const d = new Date(Date.UTC(ano, mes - 1, dia))
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia
}

export function ehHoraValida(texto: string): boolean {
  return RE_HORA.test(texto)
}

function emUTC(data: DataISO): Date {
  const m = RE_DATA.exec(data)
  if (!m) throw new Error(`data inválida: ${data}`)
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

function deUTC(d: Date): DataISO {
  return d.toISOString().slice(0, 10)
}

export function somarDias(data: DataISO, dias: number): DataISO {
  const d = emUTC(data)
  d.setUTCDate(d.getUTCDate() + dias)
  return deUTC(d)
}

export function diasEntre(de: DataISO, ate: DataISO): number {
  return Math.round((emUTC(ate).getTime() - emUTC(de).getTime()) / 86_400_000)
}

export function diaDaSemana(data: DataISO): DiaDaSemana {
  return emUTC(data).getUTCDay() as DiaDaSemana
}

/** Segunda-feira da semana da data (a semana do estúdio começa na segunda). */
export function inicioDaSemana(data: DataISO): DataISO {
  const dia = diaDaSemana(data)
  return somarDias(data, dia === 0 ? -6 : 1 - dia)
}

export function diasDoIntervalo(de: DataISO, ate: DataISO): DataISO[] {
  const total = diasEntre(de, ate)
  const saida: DataISO[] = []
  for (let i = 0; i <= total; i++) saida.push(somarDias(de, i))
  return saida
}

export function minutosDe(hora: Hora): number {
  const m = RE_HORA.exec(hora)
  if (!m) throw new Error(`hora inválida: ${hora}`)
  return Number(m[1]) * 60 + Number(m[2])
}

export function horaDe(minutos: number): Hora {
  const m = ((minutos % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Minutos de `de` até `ate` (negativo se `ate` já passou). */
export function minutosEntre(de: Momento, ate: Momento): number {
  return diasEntre(de.data, ate.data) * 1440 + (ate.minutos - de.minutos)
}

export function momentoDaAula(data: DataISO, hora: Hora): Momento {
  return { data, minutos: minutosDe(hora) }
}

/** Manhã até 11h59, tarde até 17h59, noite a partir das 18h. */
export function periodoDe(hora: Hora): Periodo {
  const m = minutosDe(hora)
  if (m < 12 * 60) return 'manha'
  if (m < 18 * 60) return 'tarde'
  return 'noite'
}

export function competenciaDe(data: DataISO): Competencia {
  return data.slice(0, 7)
}

// ---------- texto para a interface (pt-BR) ----------

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const
const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const

export function nomeDoDia(data: DataISO): string {
  return DIAS[diaDaSemana(data)] ?? ''
}

export function nomeCurtoDoDia(data: DataISO): string {
  return DIAS_CURTOS[diaDaSemana(data)] ?? ''
}

export function nomeDoMes(data: DataISO): string {
  return MESES[Number(data.slice(5, 7)) - 1] ?? ''
}

/** "quinta, 9 de outubro" */
export function dataPorExtenso(data: DataISO): string {
  return `${nomeDoDia(data)}, ${Number(data.slice(8, 10))} de ${nomeDoMes(data)}`
}

/** "9/10" */
export function dataCurta(data: DataISO): string {
  return `${Number(data.slice(8, 10))}/${data.slice(5, 7)}`
}

/** "7h", "18h30" */
export function horaFalada(hora: Hora): string {
  const [h, m] = hora.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

/** "hoje", "amanhã", "ontem" ou o nome do dia */
export function diaRelativo(data: DataISO, hoje: DataISO): string {
  const d = diasEntre(hoje, data)
  if (d === 0) return 'hoje'
  if (d === 1) return 'amanhã'
  if (d === -1) return 'ontem'
  return nomeDoDia(data)
}
