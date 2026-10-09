import { faseDaAula } from './agenda'
import type { Momento } from './datas'
import type { Aula, Id } from './tipos'

export interface PessoaNaAula {
  alunoId: Id
  aula: Aula
}

export interface ResumoDoDia {
  totalDeAulas: number
  canceladas: number
  /** lugares ocupados nas aulas do dia que vão acontecer (fixos sem aviso + reposições) */
  alunosEsperados: number
  presentes: number
  /** aula em andamento agora, se houver */
  emAndamento?: Aula
  /** aulas que ainda não terminaram, em ordem de horário */
  proximas: Aula[]
  faltasAvisadas: PessoaNaAula[]
  reposicoes: PessoaNaAula[]
}

export function resumoDoDia(aulas: readonly Aula[], agora: Momento): ResumoDoDia {
  const validas = aulas.filter((a) => !a.cancelamento)
  const proximas = validas.filter((a) => faseDaAula(a, agora) !== 'encerrada')
  const emAndamento = proximas.find((a) => faseDaAula(a, agora) === 'agora')
  const faltasAvisadas: PessoaNaAula[] = []
  const reposicoes: PessoaNaAula[] = []
  let presentes = 0
  for (const aula of validas) {
    for (const p of aula.participantes) {
      if (p.marcacao === 'avisou') faltasAvisadas.push({ alunoId: p.alunoId, aula })
      if (p.marcacao === 'presente') presentes++
      if (p.origem === 'reposicao') reposicoes.push({ alunoId: p.alunoId, aula })
    }
  }
  const resumo: ResumoDoDia = {
    totalDeAulas: aulas.length,
    canceladas: aulas.length - validas.length,
    alunosEsperados: validas.reduce((soma, a) => soma + a.ocupadas, 0),
    presentes,
    proximas,
    faltasAvisadas,
    reposicoes,
  }
  if (emAndamento) resumo.emAndamento = emAndamento
  return resumo
}
