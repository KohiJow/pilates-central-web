import { signal } from '@preact/signals'
import { gravarLocal, lerLocal } from '../../app/armazenamento'
import { hoje } from '../../app/relogio'
import type { DataISO, Id } from '../../dominio/tipos'

const CHAVE_UNIDADE = 'pc-unidade'

export const diaEscolhido = signal<DataISO>(hoje.peek())
export const unidadeEscolhida = signal<Id | null>(lerLocal(CHAVE_UNIDADE))
/** professor: mostrar só as próprias aulas (padrão) ou a agenda toda da unidade */
export const soMinhas = signal(true)

export function escolherUnidade(id: Id): void {
  unidadeEscolhida.value = id
  gravarLocal(CHAVE_UNIDADE, id)
}
