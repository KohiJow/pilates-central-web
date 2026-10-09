import { dataCurta, horaFalada, nomeDoDia } from '../../dominio/datas'
import { primeiroNome } from '../../dominio/texto'
import type { Aula, Marcacao } from '../../dominio/tipos'

export function tituloDaAula(aula: Pick<Aula, 'inicio' | 'data'>): string {
  return `${horaFalada(aula.inicio)} de ${nomeDoDia(aula.data)}, ${dataCurta(aula.data)}`
}

export function textoDaMarcacao(nome: string, marcacao: Marcacao | null): string {
  const quem = primeiroNome(nome)
  switch (marcacao) {
    case 'presente':
      return `${quem}: presente.`
    case 'faltou':
      return `${quem}: falta registrada.`
    case 'avisou':
      return `${quem} avisou que não vem.`
    default:
      return `Marcação de ${quem} apagada.`
  }
}
