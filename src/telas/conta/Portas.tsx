import { iniciar } from '../../app/conta'
import { escolherModo } from '../../app/modo'
import type { Modo } from '../../app/modo'
import { Card } from '../../componentes/Card'
import { Chevrons } from '../../componentes/Icone'
import { ENDERECO_DA_PAGINA_PUBLICA, TelaDeEntrada } from './TelaDeEntrada'

function escolher(m: Modo) {
  escolherModo(m)
  iniciar(m)
}

/** As duas portas: o estúdio de verdade (com login) ou a demonstração (dados fictícios). */
export function Portas() {
  return (
    <TelaDeEntrada
      rotulo="Pilates Central"
      logo={168}
      titulo={
        <>
          A agenda do estúdio, <em>no seu celular</em>.
        </>
      }
      texto="Entre com o seu e-mail ou conheça o app com dados de exemplo."
    >
      <Card variante="marca" class="escolha" rotulo="Entrar" aoTocar={() => escolher('firebase')}>
        <span class="escolha-texto">
          <span class="escolha-titulo">Entrar</span>
          <span class="escolha-desc">Equipe e alunos do estúdio, com e-mail e senha.</span>
        </span>
        <Chevrons tamanho={22} />
      </Card>
      <Card class="escolha" rotulo="Ver demonstração" aoTocar={() => escolher('demonstracao')}>
        <span class="escolha-texto">
          <span class="escolha-titulo">Ver demonstração</span>
          <span class="escolha-desc">Dados fictícios, guardados só neste aparelho. Sem conta.</span>
        </span>
        <Chevrons tamanho={22} />
      </Card>
      <a class="botao botao--terciario botao--largo tocavel" href={ENDERECO_DA_PAGINA_PUBLICA}>
        <span>Quero conhecer o estúdio</span>
      </a>
    </TelaDeEntrada>
  )
}
