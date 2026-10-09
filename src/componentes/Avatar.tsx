import { iniciais } from '../dominio/texto'

export function Avatar({ nome, tamanho = 40 }: { nome: string; tamanho?: number }) {
  return (
    <span class="avatar" aria-hidden="true" style={{ width: tamanho, height: tamanho }}>
      {iniciais(nome)}
    </span>
  )
}
