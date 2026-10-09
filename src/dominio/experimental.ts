// Aula experimental: os horários que ainda valem (o documento público é gravado pela equipe e
// pode ter algumas horas) e a mensagem pronta para o WhatsApp do estúdio.
import { dataPorExtenso, horaFalada } from './datas'
import type { Momento } from './datas'
import { antecedenciaEmMinutos } from './presenca'
import { ANTECEDENCIA_EXPERIMENTAL_HORAS } from './projecoes'
import type { HorarioPublico } from './tipos'

/** Horários com vaga que começam daqui a pelo menos duas horas, em ordem. */
export function horariosAindaAbertos(horarios: readonly HorarioPublico[], agora: Momento): HorarioPublico[] {
  return horarios
    .filter((h) => h.vagas > 0 && antecedenciaEmMinutos(h, agora) >= ANTECEDENCIA_EXPERIMENTAL_HORAS * 60)
    .sort((a, b) => a.data.localeCompare(b.data) || a.inicio.localeCompare(b.inicio))
}

/** Mensagem do pedido. Com mais de uma unidade, a unidade vai junto. */
export function mensagemDaExperimental(h: (HorarioPublico & { unidade: string }) | null): string {
  if (!h) return 'Olá! Vi a página do estúdio e quero marcar uma aula experimental. Quais horários vocês têm?'
  const onde = h.unidade ? `, na unidade ${h.unidade}` : ''
  return `Olá! Vi a página do estúdio e quero marcar uma aula experimental: ${dataPorExtenso(h.data)}, às ${horaFalada(h.inicio)}${onde}. Meu nome é `
}
