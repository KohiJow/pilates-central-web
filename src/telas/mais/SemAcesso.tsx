import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { EstadoVazio } from '../../componentes/EstadoVazio'

export function SemAcesso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section class="tela">
      <CabecalhoDeSubtela voltarPara="Mais" titulo={titulo} />
      <EstadoVazio icone="info" rotulo="Sem acesso" texto={texto} />
    </section>
  )
}
