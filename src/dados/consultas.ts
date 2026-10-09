// Consultas derivadas para as telas de gestão: frequência, ausências seguidas e créditos de um
// aluno. Leem sinais (chamar dentro de componente ou de computed).
import { computed } from '@preact/signals'
import { hoje, momento } from '../app/relogio'
import { diasDoIntervalo, somarDias } from '../dominio/datas'
import { agruparPorAluno, ausenciasSeguidas, frequencia, participacoesNoPeriodo } from '../dominio/frequencia'
import type { Frequencia, Participacao } from '../dominio/frequencia'
import type { CreditoReposicao, DataISO, Id } from '../dominio/tipos'
import { aulasNoDia, base, creditos, janela } from './estado'

/** Participações nas aulas de `de` até `ate` (só as datas já carregadas fazem sentido). */
export function participacoesEntre(de: DataISO, ate: DataISO): Participacao[] {
  if (de > ate) return []
  return participacoesNoPeriodo(diasDoIntervalo(de, ate), (d) => aulasNoDia(d))
}

/** Quantas semanas para trás contam para as ausências seguidas. */
const DIAS_DE_AUSENCIA = 42

/** Ausências seguidas de cada aluno até hoje (só quem tem pelo menos uma). */
export const ausenciasPorAluno = computed(() => {
  const j = janela.value
  const ate = hoje.value
  if (!j || !base.value) return new Map<Id, number>()
  const de = somarDias(ate, -DIAS_DE_AUSENCIA) > j.de ? somarDias(ate, -DIAS_DE_AUSENCIA) : j.de
  const mapa = new Map<Id, number>()
  for (const [alunoId, lista] of agruparPorAluno(participacoesEntre(de, ate))) {
    const n = ausenciasSeguidas(lista, momento.value)
    if (n > 0) mapa.set(alunoId, n)
  }
  return mapa
})

export function frequenciaDoAluno(alunoId: Id, de: DataISO, ate: DataISO): { frequencia: Frequencia; participacoes: Participacao[] } {
  const participacoes = participacoesEntre(de, ate).filter((p) => p.participante.alunoId === alunoId)
  return { frequencia: frequencia(participacoes, momento.value), participacoes }
}

export function frequenciaDaTurma(turmaId: Id, de: DataISO, ate: DataISO): Frequencia {
  return frequencia(
    participacoesEntre(de, ate).filter((p) => p.aula.turmaId === turmaId),
    momento.value,
  )
}

export function creditosDoAluno(alunoId: Id): CreditoReposicao[] {
  return [...creditos.value.values()].filter((c) => c.alunoId === alunoId)
}
