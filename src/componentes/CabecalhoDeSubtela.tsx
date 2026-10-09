import type { ComponentChildren } from 'preact'
import { voltar } from '../app/navegacao'
import { Icone } from './Icone'

interface Props {
  /** para onde o "Voltar" leva, dito com todas as letras ("Alunos", "Turmas") */
  voltarPara: string
  rotulo?: string
  titulo: ComponentChildren
  idTitulo?: string
  children?: ComponentChildren
}

/**
 * Topo de uma tela aberta dentro de uma aba (ficha, formulário): "Voltar" sempre visível, porque
 * o app instalado no iPhone não tem o botão de voltar do navegador.
 */
export function CabecalhoDeSubtela({ voltarPara, rotulo, titulo, idTitulo, children }: Props) {
  return (
    <header class="cabecalho-de-tela">
      <button type="button" class="voltar tocavel" onClick={voltar}>
        <Icone nome="voltar" tamanho={22} traco={2} />
        <span>{voltarPara}</span>
      </button>
      {rotulo && <p class="micro">{rotulo}</p>}
      <h1 id={idTitulo} class="titulo">
        {titulo}
      </h1>
      {children}
    </header>
  )
}
