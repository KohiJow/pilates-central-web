import type { JSX } from 'preact'
import { useState } from 'preact/hooks'
import { hoje } from '../../app/relogio'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { EsqueletoDeLista } from '../../componentes/Esqueleto'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { Icone } from '../../componentes/Icone'
import { Chip } from '../../componentes/Pilula'
import { Vagas } from '../../componentes/Vagas'
import { creditosLivres, dadosDoAluno, opcoesDeReposicao, reporEm, situacaoDoAluno } from '../../dados/aluno'
import { dataCurta, dataPorExtenso, diaRelativo, horaFalada } from '../../dominio/datas'
import { maiuscula, plural } from '../../dominio/texto'
import type { CreditoReposicao, VagaDaAula } from '../../dominio/tipos'
import { irParaAbaDoAluno } from './AppDoAluno'

const idDaVaga = (v: VagaDaAula) => `${v.turmaId}_${v.data}`

function nomeDaUnidade(id: string): string {
  return dadosDoAluno.value?.unidades.find((u) => u.id === id)?.nome ?? ''
}

function descricaoDoCredito(c: CreditoReposicao): string {
  return `Falta de ${dataCurta(c.origem.data)}, vale até ${dataCurta(c.validoAte)}`
}

/** Escolher onde repor: só aulas da unidade, com vaga, no prazo e dentro da validade do crédito. */
export function ReposicaoDoAluno() {
  const livres = creditosLivres.value
  const [creditoId, setCreditoId] = useState<string | null>(null)
  const [escolhida, setEscolhida] = useState<VagaDaAula | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const credito = livres.find((c) => c.id === creditoId) ?? livres[0]
  const opcoes = credito ? opcoesDeReposicao(credito) : []
  const porDia = new Map<string, VagaDaAula[]>()
  for (const v of opcoes) porDia.set(v.data, [...(porDia.get(v.data) ?? []), v])
  const config = dadosDoAluno.value?.configuracao

  const confirmar = async () => {
    if (!credito || !escolhida) return
    setOcupado(true)
    const r = await reporEm(credito, escolhida)
    setOcupado(false)
    if (!r.ok) {
      setEscolhida(null)
      return avisar({ texto: r.mensagem, icone: 'info', duracao: 6000 })
    }
    const v = escolhida
    setEscolhida(null)
    irParaAbaDoAluno('aulas')
    avisar({
      texto: `Reposição marcada: ${diaRelativo(v.data, hoje.peek())}, ${dataCurta(v.data)}, às ${horaFalada(v.inicio)}.`,
      icone: 'reposicao',
      acao: r.valor.desfazer
        ? { rotulo: 'Desfazer', executar: () => void r.valor.desfazer?.().then((d) => !d.ok && avisar({ texto: d.mensagem, icone: 'info' })) }
        : undefined,
    })
  }

  return (
    <section class="tela" aria-labelledby="titulo-repor">
      <header class="cabecalho-de-tela">
        <p class="micro">Reposição</p>
        <h1 id="titulo-repor" class="titulo">
          Escolha onde repor
        </h1>
        {config && (
          <p class="texto-secundario">
            Avise a falta com {plural(config.antecedenciaAvisoHoras, 'hora')} de antecedência e ganhe uma reposição, que vale{' '}
            {plural(config.validadeCreditoDias, 'dia')}.
          </p>
        )}
      </header>

      {situacaoDoAluno.value !== 'pronto' ? (
        <EsqueletoDeLista itens={4} altura={72} />
      ) : !credito ? (
        <EstadoVazio
          icone="reposicao"
          rotulo="Nada para repor"
          texto="Quando você avisa a falta com antecedência, a reposição aparece aqui para você escolher o horário."
        />
      ) : (
        <>
          {livres.length > 1 && (
            <div class="chips chips--coluna" role="radiogroup" aria-label="Qual reposição">
              {livres.map((c) => (
                <Chip key={c.id} papel="radio" ativo={c.id === credito.id} aoTocar={() => setCreditoId(c.id)}>
                  {descricaoDoCredito(c)}
                </Chip>
              ))}
            </div>
          )}
          {livres.length === 1 && <p class="texto-secundario">{descricaoDoCredito(credito)}.</p>}

          {opcoes.length === 0 ? (
            <EstadoVazio
              icone="reposicao"
              rotulo="Sem vaga por enquanto"
              texto="Nenhuma aula com vaga da sua unidade dentro da validade. Volte mais tarde: as vagas abrem quando alguém avisa falta."
            />
          ) : (
            <div class="pilha" role="list" aria-label="Aulas com vaga">
              {[...porDia].map(([data, lista]) => (
                <div key={data} class="encaixe-dia" role="listitem">
                  <h2 class="micro">
                    {maiuscula(diaRelativo(data, hoje.value))}, {dataCurta(data)}
                  </h2>
                  {lista.map((v, i) => (
                    <button
                      key={idDaVaga(v)}
                      type="button"
                      class="opcao-aula tocavel"
                      style={{ '--i': i } as JSX.CSSProperties}
                      onClick={() => setEscolhida(v)}
                    >
                      <span class="opcao-aula-hora">{horaFalada(v.inicio)}</span>
                      <span class="opcao-aula-texto">
                        <span class="lista-item-titulo">{nomeDaUnidade(v.unidadeId)}</span>
                        <Vagas ocupadas={v.ocupadas} capacidade={v.capacidade} />
                      </span>
                      <Icone nome="avancar" tamanho={20} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <FolhaInferior
        aberta={escolhida !== null}
        aoFechar={() => setEscolhida(null)}
        rotulo="Confirmar reposição"
        titulo={escolhida ? maiuscula(dataPorExtenso(escolhida.data)) : ''}
        subtitulo={escolhida ? <span>{`${horaFalada(escolhida.inicio)} às ${horaFalada(escolhida.fim)}, ${nomeDaUnidade(escolhida.unidadeId)}`}</span> : undefined}
        rodape={
          <Botao variante="primario" largo icone="reposicao" disabled={ocupado} onClick={() => void confirmar()}>
            {ocupado ? 'Marcando...' : 'Confirmar reposição'}
          </Botao>
        }
      >
        <p>
          A reposição usa o crédito da {credito ? descricaoDoCredito(credito).toLowerCase() : ''}. Se mudar de ideia, dá para desistir até{' '}
          {plural(config?.antecedenciaAvisoHoras ?? 0, 'hora')} antes da aula.
        </p>
      </FolhaInferior>
    </section>
  )
}
