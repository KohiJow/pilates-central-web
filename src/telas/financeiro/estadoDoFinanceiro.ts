import { signal } from '@preact/signals'
import type { Competencia, Id } from '../../dominio/tipos'

/** Mês e unidade escolhidos no financeiro (null = mês atual, todas as unidades). */
export const competenciaDoFinanceiro = signal<Competencia | null>(null)
export const unidadeDoFinanceiro = signal<Id | null>(null)
