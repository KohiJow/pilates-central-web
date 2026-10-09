import type { JSX } from 'preact'
import { useState } from 'preact/hooks'
import { hoje } from '../../app/relogio'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { Card } from '../../componentes/Card'
import { Esqueleto, EsqueletoDeLista } from '../../componentes/Esqueleto'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { Icone } from '../../componentes/Icone'
import { Pilula } from '../../componentes/Pilula'
import { avisarAula, aulasDoAluno, creditosLivres, dadosDoAluno, desfazerAvisoDaAula, desistirDaAula, situacaoDoAluno } from '../../dados/aluno'
import { dataCurta, dataPorExtenso, diaRelativo, horaFalada, nomeCurtoDoDia } from '../../dominio/datas'
import type { MinhaAula } from '../../dominio/minhasAulas'
import { linkDoWhatsApp, maiuscula, plural } from '../../dominio/texto'
import { irParaAbaDoAluno } from './AppDoAluno'

function nomeDaUnidade(id: string): string {
  return dadosDoAluno.value?.unidades.find((u) => u.id === id)?.nome ?? ''
}

function quando(aula: MinhaAula): string {
  return `${maiuscula(diaRelativo(aula.data, hoje.value))}, ${horaFalada(aula.inicio)}`
}

function SituacaoDaAula({ aula }: { aula: MinhaAula }) {
  if (aula.situacao === 'cancelada') return <Pilula tom="alerta">Cancelada</Pilula>
  if (aula.situacao === 'avisou') return <Pilula tom="acento">Você avisou</Pilula>
  if (aula.origem === 'reposicao') return <Pilula tom="sucesso">Reposição</Pilula>
  return <Pilula>Confirmada</Pilula>
}

export function BotaoDoWhatsApp({ texto = 'Falar com o estúdio no WhatsApp', mensagem = '' }: { texto?: string; mensagem?: string }) {
  const numero = dadosDoAluno.value?.configuracao.whatsapp
  if (!numero) return null
  return (
    <a class="botao botao--secundario botao--largo tocavel" href={linkDoWhatsApp(numero, mensagem)} target="_blank" rel="noopener noreferrer">
      <Icone nome="mensagem" tamanho={20} />
      <span>{texto}</span>
    </a>
  )
}

export function AulasDoAluno() {
  const d = dadosDoAluno.value
  const aulas = aulasDoAluno.value
  const [aberta, setAberta] = useState<MinhaAula | null>(null)
  const proxima = aulas.find((a) => a.situacao === 'confirmada') ?? aulas[0]
  const outras = aulas.filter((a) => a !== proxima)
  const livres = creditosLivres.value.length

  return (
    <section class="tela" aria-labelledby="titulo-aulas-aluno">
      <header class="cabecalho-de-tela">
        <p class="micro">{dataPorExtenso(hoje.value)}</p>
        <h1 id="titulo-aulas-aluno" class="titulo">
          Olá, {d?.portal.nome ?? ''}
        </h1>
      </header>

      {situacaoDoAluno.value !== 'pronto' || !d ? (
        <>
          <Esqueleto altura={188} raio={16} />
          <EsqueletoDeLista itens={3} altura={72} />
        </>
      ) : aulas.length === 0 ? (
        <EstadoVazio icone="folga" rotulo="Sem aulas" texto="Nenhuma aula sua nos próximos 14 dias. Fale com o estúdio se algo estiver errado.">
          <BotaoDoWhatsApp />
        </EstadoVazio>
      ) : (
        <>
          {proxima && (
            <Card variante="marca" class="destaque">
              <p class="micro">{proxima.fase === 'agora' ? 'Aula agora' : 'Sua próxima aula'}</p>
              <p class="titulo">{quando(proxima)}</p>
              <p>
                {dataCurta(proxima.data)}, {nomeDaUnidade(proxima.unidadeId)}. Termina às {horaFalada(proxima.fim)}.
                {proxima.origem === 'reposicao' ? ' É uma reposição.' : ''}
              </p>
              <div class="destaque-linha">
                <SituacaoDaAula aula={proxima} />
                <button type="button" class="botao botao--sobre-marca tocavel" onClick={() => setAberta(proxima)}>
                  {proxima.situacao === 'confirmada' && proxima.noPrazo ? 'Não vou poder ir' : 'Ver detalhes'}
                </button>
              </div>
            </Card>
          )}

          {livres > 0 && (
            <button type="button" class="lista-item lista-item--cartao tocavel" onClick={() => irParaAbaDoAluno('repor')}>
              <span class="item-icone" aria-hidden="true">
                <Icone nome="reposicao" tamanho={22} />
              </span>
              <span class="lista-item-texto">
                <span class="lista-item-titulo">{plural(livres, 'reposição para marcar', 'reposições para marcar')}</span>
                <span class="lista-item-sub">Escolha um horário com vaga</span>
              </span>
              <Icone nome="avancar" tamanho={20} />
            </button>
          )}

          {outras.length > 0 && (
            <section class="secao" aria-labelledby="titulo-proximas-aluno">
              <h2 id="titulo-proximas-aluno" class="micro">
                Próximas aulas
              </h2>
              <ul class="lista cascata">
                {outras.map((a, i) => (
                  <li key={`${a.id}-${a.origem}`} style={{ '--i': i } as JSX.CSSProperties}>
                    <button type="button" class="lista-item tocavel" onClick={() => setAberta(a)}>
                      <span class="dia-da-aula" aria-hidden="true">
                        <span class="dia-da-aula-semana">{nomeCurtoDoDia(a.data)}</span>
                        <span class="dia-da-aula-numero">{dataCurta(a.data)}</span>
                      </span>
                      <span class="lista-item-texto">
                        <span class="lista-item-titulo">
                          <span class="so-leitor">{dataPorExtenso(a.data)}, </span>
                          {horaFalada(a.inicio)}
                        </span>
                        <span class="lista-item-sub">{nomeDaUnidade(a.unidadeId)}</span>
                      </span>
                      <SituacaoDaAula aula={a} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <BotaoDoWhatsApp />
        </>
      )}

      <FolhaDaMinhaAula aula={aberta} aoFechar={() => setAberta(null)} />
    </section>
  )
}

function FolhaDaMinhaAula({ aula, aoFechar }: { aula: MinhaAula | null; aoFechar: () => void }) {
  // a folha anima a saída com o último conteúdo
  const [ultima, setUltima] = useState<MinhaAula | null>(aula)
  const [ocupado, setOcupado] = useState(false)
  if (aula && aula !== ultima) setUltima(aula)
  const a = aula ?? ultima
  const config = dadosDoAluno.value?.configuracao
  if (!a || !config) return null
  const horas = config.antecedenciaAvisoHoras

  const fazer = async (acao: () => Promise<void>) => {
    setOcupado(true)
    try {
      await acao()
    } finally {
      setOcupado(false)
    }
  }

  const avisarFalta = () =>
    fazer(async () => {
      const r = await avisarAula(a)
      if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info', duracao: 6000 })
      aoFechar()
      avisar({
        texto: r.valor.semCredito
          ? 'Falta avisada. Você já usou as reposições do mês, então esta fica sem reposição.'
          : 'Falta avisada. Você ganhou uma reposição.',
        icone: 'avisou',
        acao: { rotulo: 'Desfazer', executar: () => void r.valor.desfazer().then((d) => !d.ok && avisar({ texto: d.mensagem, icone: 'info' })) },
      })
    })

  const voltarAtras = () =>
    fazer(async () => {
      const r = await desfazerAvisoDaAula(a)
      if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info', duracao: 6000 })
      aoFechar()
      avisar({ texto: 'Aviso desfeito. Seu lugar na aula está guardado.', icone: 'presente' })
    })

  const desistir = () =>
    fazer(async () => {
      const r = await desistirDaAula(a)
      if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info', duracao: 6000 })
      aoFechar()
      avisar({ texto: 'Reposição desmarcada. O crédito voltou para você.', icone: 'reposicao' })
    })

  const mensagemDoWhats = `Olá! Aqui é ${dadosDoAluno.value?.portal.nome ?? ''}. Sobre a aula de ${dataPorExtenso(a.data)}, às ${horaFalada(a.inicio)}: `

  return (
    <FolhaInferior
      aberta={aula !== null}
      aoFechar={aoFechar}
      rotulo={a.origem === 'reposicao' ? 'Reposição' : 'Aula'}
      titulo={maiuscula(dataPorExtenso(a.data))}
      subtitulo={
        <span>
          {horaFalada(a.inicio)} às {horaFalada(a.fim)}, {nomeDaUnidade(a.unidadeId)}
        </span>
      }
    >
      <div class="pilha">
        {a.situacao === 'cancelada' ? (
          <p>Esta aula foi cancelada pelo estúdio.</p>
        ) : a.situacao === 'avisou' ? (
          <>
            <p>Você avisou que não vem. {a.creditoId ? 'A reposição está na aba Reposição.' : ''}</p>
            {a.noPrazo && (
              <Botao variante="secundario" largo icone="desfazer" disabled={ocupado} onClick={() => void voltarAtras()}>
                Desfazer o aviso, eu vou
              </Botao>
            )}
          </>
        ) : a.origem === 'reposicao' ? (
          <>
            <p>Esta é uma reposição que você marcou.</p>
            {a.noPrazo ? (
              <Botao variante="secundario" largo disabled={ocupado} onClick={() => void desistir()}>
                Desistir da reposição
              </Botao>
            ) : (
              <p class="texto-secundario">Faltam menos de {plural(horas, 'hora')}: para desmarcar, fale com o estúdio.</p>
            )}
          </>
        ) : a.noPrazo ? (
          <>
            <p>
              Se não puder vir, avise por aqui: você ganha uma reposição para usar em até {plural(config.validadeCreditoDias, 'dia')}, e o seu
              lugar fica livre para outra pessoa.
            </p>
            <Botao variante="primario" largo icone="avisou" disabled={ocupado} onClick={() => void avisarFalta()}>
              {ocupado ? 'Avisando...' : 'Avisar que não vou'}
            </Botao>
          </>
        ) : (
          <p>Faltam menos de {plural(horas, 'hora')} para a aula. Para avisar agora, fale com o estúdio.</p>
        )}
        <BotaoDoWhatsApp mensagem={mensagemDoWhats} />
      </div>
    </FolhaInferior>
  )
}
