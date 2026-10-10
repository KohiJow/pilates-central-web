// Ajuda dentro do app (Mais, Ajuda): cards curtos, sem jargão, do instalar ao que cada papel vê.
// O texto mora em conteudoDaAjuda.ts (o mesmo de docs/guia-da-equipe.md).
import type { JSX } from 'preact'
import { pode } from '../../app/perfil'
import { Card } from '../../componentes/Card'
import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { CARTOES_DE_AJUDA } from './conteudoDaAjuda'

/**
 * O caminho do iPhone em traço: a barra do Safari com o Compartilhar marcado e, ao lado, a lista
 * que abre com "Adicionar à Tela de Início". Decorativa: os passos estão escritos ao lado.
 */
function DesenhoDoIPhone() {
  return (
    <svg class="ajuda-desenho" viewBox="0 0 320 180" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      {/* o celular com a barra do Safari embaixo */}
      <rect x="18" y="8" width="112" height="164" rx="18" />
      <path d="M58 18h32" />
      <path d="M30 142h88" />
      <path d="M40 158h6M102 158h6" />
      {/* Compartilhar: quadrado com a seta para cima, marcado */}
      <circle class="ajuda-desenho-marca" cx="74" cy="158" r="12" />
      <path d="M69 156v6h10v-6M74 151v8M71 154l3-3 3 3" />
      {/* a seta até a lista */}
      <path d="M92 126c40-26 70-30 98-28" stroke-dasharray="4 6" />
      <path d="M184 92l8 6-9 4" />
      {/* a lista que abre, com a linha certa marcada */}
      <rect x="196" y="40" width="112" height="112" rx="14" />
      <path d="M210 64h60M210 86h48" />
      <rect class="ajuda-desenho-marca" x="204" y="102" width="96" height="30" rx="8" />
      <rect x="212" y="110" width="14" height="14" rx="3" />
      <path d="M219 113v8M215 117h8M234 117h52" />
    </svg>
  )
}

export function Ajuda() {
  const daAdministracao = pode('editar-configuracao')
  const cartoes = CARTOES_DE_AJUDA.filter((c) => daAdministracao || !c.soAdministracao)
  return (
    <section class="tela" aria-labelledby="titulo-ajuda">
      <CabecalhoDeSubtela voltarPara="Mais" rotulo="Mais" titulo="Ajuda" idTitulo="titulo-ajuda" />
      <p class="texto-secundario">O essencial do dia a dia, em poucas linhas.</p>
      {cartoes.map((c, i) => (
        <Card key={c.id} class="ajuda-cartao" style={{ '--i': i } as JSX.CSSProperties}>
          <article aria-labelledby={`ajuda-${c.id}`} class="pilha">
            <h2 id={`ajuda-${c.id}`} class="subtitulo">
              {c.titulo}
            </h2>
            {c.paragrafos.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {c.id === 'instalar' && <DesenhoDoIPhone />}
            {c.passos && (
              <ol class="passos">
                {c.passos.map((p, n) => (
                  <li key={p} class="passo">
                    <span class="passo-numero">{n + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            )}
            {c.depois?.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </article>
        </Card>
      ))}
    </section>
  )
}
