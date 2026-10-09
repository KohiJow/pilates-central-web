import { signal } from '@preact/signals'

/** Aula com a folha de chamada aberta (id `${turmaId}_${data}`), compartilhada por Hoje e Agenda. */
export const aulaAberta = signal<string | null>(null)

export function abrirAula(id: string): void {
  aulaAberta.value = id
}

export function fecharAula(): void {
  aulaAberta.value = null
}
