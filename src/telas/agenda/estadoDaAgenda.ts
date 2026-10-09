import { signal } from '@preact/signals'
import { gravarLocal, lerLocal } from '../../app/armazenamento'
import type { DataISO, Id } from '../../dominio/tipos'

const CHAVE_UNIDADE = 'pc-unidade'

/** null = acompanha o dia de hoje (inclusive quando vira a meia-noite com o app aberto) */
export const diaEscolhido = signal<DataISO | null>(null)
export const unidadeEscolhida = signal<Id | null>(lerLocal(CHAVE_UNIDADE))
/** professor: mostrar só as próprias aulas (padrão) ou a agenda toda da unidade */
export const soMinhas = signal(true)

export function escolherUnidade(id: Id): void {
  unidadeEscolhida.value = id
  gravarLocal(CHAVE_UNIDADE, id)
}
