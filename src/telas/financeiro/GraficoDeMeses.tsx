import { useState } from 'preact/hooks'
import { emReais, nomeCurtoDaCompetencia, nomeDaCompetencia } from '../../dominio/pagamentos'
import type { RecebidoNoMes } from '../../dominio/pagamentos'

const ALTURA = 140
/** colunas finas (até 24 px), com o resto da faixa como ar */
const LARGURA_DA_COLUNA = 24

/** Topo da escala em número redondo (7.840 vira 8.000): as colunas ficam comparáveis entre meses. */
function tetoRedondo(maximo: number): number {
  if (maximo <= 0) return 100_00
  const reais = maximo / 100
  const passo = 10 ** Math.floor(Math.log10(reais))
  return Math.ceil(reais / (passo / 2)) * (passo / 2) * 100
}

/**
 * Quanto entrou em cada um dos últimos meses: uma série só, então sem legenda; o mês escolhido
 * fica em destaque (cor da marca) e os outros no tom de apoio. Tocar numa coluna mostra o valor
 * dela; a tabela com todos os valores fica logo abaixo para leitor de tela e para quem preferir.
 */
export function GraficoDeMeses({ meses, destaque }: { meses: RecebidoNoMes[]; destaque: string }) {
  const [tocado, setTocado] = useState<string | null>(null)
  const teto = tetoRedondo(Math.max(...meses.map((m) => m.recebido)))
  const selecionado = meses.find((m) => m.competencia === (tocado ?? destaque)) ?? meses[meses.length - 1]
  const resumo = meses.map((m) => `${nomeDaCompetencia(m.competencia)}: ${emReais(m.recebido)}`).join('; ')

  return (
    <figure class="grafico">
      <figcaption class="grafico-leitura" aria-live="polite">
        <span class="micro">{selecionado ? nomeDaCompetencia(selecionado.competencia) : ''}</span>
        <span class="grafico-valor">{selecionado ? emReais(selecionado.recebido) : ''}</span>
      </figcaption>
      <div class="grafico-area" role="group" aria-label={`Recebido por mês. ${resumo}`}>
        <div class="grafico-colunas">
          {meses.map((m) => {
            const altura = Math.max(m.recebido > 0 ? 4 : 0, Math.round((m.recebido / teto) * ALTURA))
            const ativo = m.competencia === selecionado?.competencia
            return (
              <button
                key={m.competencia}
                type="button"
                class={`grafico-faixa tocavel${m.competencia === destaque ? ' grafico-faixa--destaque' : ''}`}
                aria-pressed={ativo}
                aria-label={`${nomeDaCompetencia(m.competencia)}: ${emReais(m.recebido)}`}
                onClick={() => setTocado(m.competencia)}
              >
                <span class="grafico-trilho" style={{ height: `${ALTURA}px` }}>
                  {/* a chave muda com o valor: a coluna nova cresce de novo (só transform) */}
                  <span
                    key={`${m.competencia}-${m.recebido}`}
                    class="grafico-coluna"
                    style={{ height: `${altura}px`, width: `${LARGURA_DA_COLUNA}px` }}
                  />
                </span>
                <span class="grafico-mes">{nomeCurtoDaCompetencia(m.competencia)}</span>
              </button>
            )
          })}
        </div>
      </div>
      <table class="so-leitor">
        <caption>Recebido nos últimos meses</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">Recebido</th>
          </tr>
        </thead>
        <tbody>
          {meses.map((m) => (
            <tr key={m.competencia}>
              <th scope="row">{nomeDaCompetencia(m.competencia)}</th>
              <td>{emReais(m.recebido)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
