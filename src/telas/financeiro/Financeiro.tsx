import type { JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { abrirEm } from '../../app/navegacao'
import { pode } from '../../app/perfil'
import { hoje } from '../../app/relogio'
import { Avatar } from '../../componentes/Avatar'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { Card } from '../../componentes/Card'
import { Dinheiro } from '../../componentes/Dinheiro'
import { Esqueleto, EsqueletoDeLista } from '../../componentes/Esqueleto'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { Icone } from '../../componentes/Icone'
import { Numero } from '../../componentes/Numero'
import { Chip, Pilula } from '../../componentes/Pilula'
import {
  alunosPorId,
  base,
  carregarFinanceiro,
  financeiro,
  nomeDaEquipe,
  nomeDaUnidade,
  pagamentos,
  situacaoFinanceira,
  unidades,
} from '../../dados/estado'
import { apagarPagamento } from '../../dados/gestao'
import { dataCurta } from '../../dominio/datas'
import {
  deslocarCompetencia,
  emReais,
  historicoRecebido,
  mensagemDeLembrete,
  NOME_DA_FORMA,
  nomeDaCompetencia,
  planilhaDoMes,
  resumoDoMes,
  ultimasCompetencias,
} from '../../dominio/pagamentos'
import type { SituacaoNoMes } from '../../dominio/pagamentos'
import { linkDoWhatsApp, maiuscula, plural, primeiroNome } from '../../dominio/texto'
import type { Competencia, Id, Pagamento } from '../../dominio/tipos'
import { FolhaDePagamento } from './FolhaDePagamento'
import { GraficoDeMeses } from './GraficoDeMeses'
import { competenciaDoFinanceiro, unidadeDoFinanceiro } from './estadoDoFinanceiro'

const MESES_NO_GRAFICO = 6
/** listas longas mostram os primeiros e um "Mostrar todos" (uma mão só, sem rolar sem fim) */
const LIMITE_DA_LISTA = 6


/** Baixa a planilha do mês (no iPhone abre a prévia, de onde dá para salvar ou mandar). */
function baixar(nome: string, conteudo: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Aba Financeiro (só a administração): o mês por unidade, quem está em aberto e os últimos meses. */
export function Financeiro() {
  const mesAtual = hoje.value.slice(0, 7)
  const competencia = competenciaDoFinanceiro.value ?? mesAtual
  const unidadeId = unidades.value.find((u) => u.id === unidadeDoFinanceiro.value)?.id
  const [pagando, setPagando] = useState<{ alunoId: Id | null } | null>(null)
  const [detalhe, setDetalhe] = useState<Pagamento | null>(null)
  const [todosAbertos, setTodosAbertos] = useState(false)
  const [todosLancamentos, setTodosLancamentos] = useState(false)
  const meses = ultimasCompetencias(competencia, MESES_NO_GRAFICO)

  useEffect(() => {
    void carregarFinanceiro(ultimasCompetencias(competencia, MESES_NO_GRAFICO))
  }, [competencia])

  if (!pode('ver-financeiro')) {
    return (
      <section class="tela">
        <EstadoVazio icone="financeiro" rotulo="Sem acesso" texto="O financeiro é só da administração." />
      </section>
    )
  }

  const pronto = situacaoFinanceira.value === 'pronto' && base.value !== null
  const todos = [...pagamentos.value.values()]
  const resumo = pronto ? resumoDoMes(base.value?.alunos ?? [], financeiro.value, todos, competencia, hoje.value, unidadeId) : null
  const historico = historicoRecebido(todos, meses, unidadeId)
  const maiorForma = Math.max(1, ...(resumo?.porForma.map((f) => f.valor) ?? [1]))
  const nomeDoMes = nomeDaCompetencia(competencia)

  const exportar = () => {
    if (!resumo) return
    const alunos = alunosPorId.peek()
    const csv = planilhaDoMes(
      resumo,
      (id) => alunos.get(id)?.nome ?? 'Aluno removido',
      (id) => nomeDaUnidade(id),
    )
    const sufixo = unidadeId ? `-${nomeDaUnidade(unidadeId).toLowerCase().replace(/\s+/g, '-')}` : ''
    baixar(`mensalidades-${competencia}${sufixo}.csv`, csv)
    avisar({ texto: 'Planilha do mês baixada.', icone: 'baixar' })
  }

  return (
    <section class="tela" aria-labelledby="titulo-financeiro">
      <header class="cabecalho-de-tela">
        <p class="micro">Financeiro</p>
        <div class="mes-navegacao">
          <button
            type="button"
            class="botao-icone tocavel"
            aria-label="Mês anterior"
            onClick={() => (competenciaDoFinanceiro.value = deslocarCompetencia(competencia, -1))}
          >
            <Icone nome="voltar" tamanho={24} traco={2} />
          </button>
          <h1 id="titulo-financeiro" class="titulo">
            {maiuscula(nomeDoMes)}
          </h1>
          <button
            type="button"
            class="botao-icone tocavel"
            aria-label="Próximo mês"
            disabled={competencia >= mesAtual}
            onClick={() => (competenciaDoFinanceiro.value = deslocarCompetencia(competencia, 1))}
          >
            <Icone nome="avancar" tamanho={24} traco={2} />
          </button>
        </div>
      </header>

      {unidades.value.length > 1 && (
        <div class="chips" role="radiogroup" aria-label="Unidade">
          <Chip papel="radio" ativo={!unidadeId} aoTocar={() => (unidadeDoFinanceiro.value = null)}>
            Todas
          </Chip>
          {unidades.value.map((u) => (
            <Chip key={u.id} papel="radio" ativo={u.id === unidadeId} aoTocar={() => (unidadeDoFinanceiro.value = u.id)}>
              {u.nome}
            </Chip>
          ))}
        </div>
      )}

      {!resumo ? (
        <>
          <Esqueleto altura={200} raio={16} />
          <EsqueletoDeLista itens={3} altura={72} />
        </>
      ) : (
        <>
          <Card class="resumo-mes">
            <p class="micro">Recebido</p>
            <Dinheiro centavos={resumo.recebido} />
            <p class="texto-secundario">de {emReais(resumo.previsto)} previstos</p>
            <Medidor valor={resumo.recebido} total={resumo.previsto} rotulo={`Recebido de ${nomeDoMes}`} />
            <div class="resumo-mes-linha">
              <span>
                <span class="micro">Em aberto</span>
                <Dinheiro centavos={resumo.emAberto} class="valor-medio" />
              </span>
              <span>
                <span class="micro">Alunos ativos</span>
                <Numero valor={resumo.alunosAtivos} class="valor-medio" />
              </span>
            </div>
          </Card>

          <Botao variante="primario" icone="dinheiro" largo onClick={() => setPagando({ alunoId: null })}>
            Lançar pagamento
          </Botao>

          <section class="secao" aria-labelledby="titulo-abertos">
            <h2 id="titulo-abertos" class="micro">
              Em aberto ({resumo.abertos.length})
            </h2>
            {resumo.abertos.length === 0 ? (
              <p class="texto-secundario">Todo mundo pagou {nomeDoMes.replace(/ de \d{4}$/, '')}.</p>
            ) : (
              <>
                <ul class="lista">
                  {(todosAbertos ? resumo.abertos : resumo.abertos.slice(0, LIMITE_DA_LISTA)).map((s, i) => (
                    <li key={s.alunoId} style={{ '--i': i } as JSX.CSSProperties}>
                      <LinhaEmAberto situacao={s} competencia={competencia} aoLancar={() => setPagando({ alunoId: s.alunoId })} />
                    </li>
                  ))}
                </ul>
                {!todosAbertos && resumo.abertos.length > LIMITE_DA_LISTA && (
                  <Botao variante="terciario" class="mostrar-todos" onClick={() => setTodosAbertos(true)}>
                    Mostrar todos os {resumo.abertos.length}
                  </Botao>
                )}
              </>
            )}
          </section>

          <section class="secao" aria-labelledby="titulo-formas">
            <h2 id="titulo-formas" class="micro">
              Por forma de pagamento
            </h2>
            {resumo.porForma.length === 0 ? (
              <p class="texto-secundario">Nenhum pagamento lançado neste mês.</p>
            ) : (
              <ul class="lista">
                {resumo.porForma.map((f) => (
                  <li key={f.forma} class="lista-item forma-item">
                    <span class="forma-linha">
                      <span class="lista-item-titulo">{NOME_DA_FORMA[f.forma]}</span>
                      <span class="valor">{emReais(f.valor)}</span>
                    </span>
                    <span class="forma-linha">
                      <span class="barra" aria-hidden="true">
                        <span class="barra-cheia" style={{ transform: `scaleX(${f.valor / maiorForma})` }} />
                      </span>
                      <span class="lista-item-sub">{plural(f.quantidade, 'pagamento')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section class="secao" aria-labelledby="titulo-grafico">
            <h2 id="titulo-grafico" class="micro">
              Recebido nos últimos {MESES_NO_GRAFICO} meses
            </h2>
            <Card>
              <GraficoDeMeses meses={historico} destaque={competencia} />
            </Card>
          </section>

          <section class="secao" aria-labelledby="titulo-lancamentos">
            <h2 id="titulo-lancamentos" class="micro">
              Lançamentos de {nomeDoMes.replace(/ de \d{4}$/, '')}
            </h2>
            {resumo.pagamentos.length === 0 ? (
              <p class="texto-secundario">Nenhum lançamento.</p>
            ) : (
              <ul class="lista">
                {(todosLancamentos ? resumo.pagamentos : resumo.pagamentos.slice(0, LIMITE_DA_LISTA)).map((p) => (
                  <li key={p.id}>
                    <button type="button" class="lista-item tocavel" onClick={() => setDetalhe(p)}>
                      <span class="lista-item-texto">
                        <span class="lista-item-titulo">{alunosPorId.value.get(p.alunoId)?.nome ?? 'Aluno removido'}</span>
                        <span class="lista-item-sub">
                          {NOME_DA_FORMA[p.forma]}, {dataCurta(p.pagoEm)}
                        </span>
                      </span>
                      <span class="valor">{emReais(p.valor)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!todosLancamentos && resumo.pagamentos.length > LIMITE_DA_LISTA && (
              <Botao variante="terciario" class="mostrar-todos" onClick={() => setTodosLancamentos(true)}>
                Mostrar todos os {resumo.pagamentos.length}
              </Botao>
            )}
          </section>

          <Botao variante="secundario" icone="baixar" largo onClick={exportar}>
            Baixar planilha do mês
          </Botao>
        </>
      )}

      <FolhaDePagamento
        aberta={pagando !== null}
        aoFechar={() => setPagando(null)}
        alunoId={pagando?.alunoId ?? null}
        competencia={competencia}
      />
      <DetalheDoPagamento pagamento={detalhe} aoFechar={() => setDetalhe(null)} />
    </section>
  )
}

function Medidor({ valor, total, rotulo }: { valor: number; total: number; rotulo: string }) {
  const fracao = total > 0 ? Math.min(1, valor / total) : 0
  return (
    <span
      class="barra barra--grande"
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fracao * 100)}
      aria-valuetext={`${Math.round(fracao * 100)}%`}
    >
      <span class="barra-cheia" style={{ transform: `scaleX(${fracao})` }} />
    </span>
  )
}

function LinhaEmAberto({ situacao: s, competencia, aoLancar }: { situacao: SituacaoNoMes; competencia: Competencia; aoLancar: () => void }) {
  const aluno = alunosPorId.value.get(s.alunoId)
  if (!aluno) return null
  const lembrete = mensagemDeLembrete({
    nomeAluno: aluno.nome,
    nomeEstudio: base.value?.configuracao.nomeEstudio ?? '',
    competencia,
    valor: s.falta,
    vencimento: s.vencimento,
    atrasado: s.atrasado,
  })
  return (
    <div class="aberto" data-aluno={aluno.id}>
      <div class="aberto-topo">
        <Avatar nome={aluno.nome} tamanho={36} />
        <button type="button" class="lista-item-texto botao-texto tocavel" onClick={() => abrirEm('alunos', [aluno.id])}>
          <span class="lista-item-titulo">{aluno.nome}</span>
          <span class="lista-item-sub">
            {emReais(s.falta)}
            {s.pago > 0 ? ` (pagou ${emReais(s.pago)})` : ''}, {s.atrasado ? 'venceu' : 'vence'} em {dataCurta(s.vencimento)}
          </span>
        </button>
        {s.atrasado && <Pilula tom="alerta">atrasada</Pilula>}
      </div>
      <div class="linha-acoes">
        {aluno.telefone ? (
          <a
            class="botao botao--secundario tocavel"
            href={linkDoWhatsApp(aluno.telefone, lembrete)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Lembrar ${primeiroNome(aluno.nome)} pelo WhatsApp`}
          >
            <Icone nome="mensagem" tamanho={20} />
            <span>Lembrar</span>
          </a>
        ) : (
          <span />
        )}
        <Botao variante="secundario" icone="dinheiro" onClick={aoLancar} aria-label={`Lançar pagamento de ${primeiroNome(aluno.nome)}`}>
          Lançar
        </Botao>
      </div>
    </div>
  )
}

function DetalheDoPagamento({ pagamento, aoFechar }: { pagamento: Pagamento | null; aoFechar: () => void }) {
  const [ultimo, setUltimo] = useState(pagamento)
  useEffect(() => {
    if (pagamento) setUltimo(pagamento)
  }, [pagamento])
  if (!ultimo) return null
  const aluno = alunosPorId.value.get(ultimo.alunoId)

  const apagar = async () => {
    const r = await apagarPagamento(ultimo.id)
    aoFechar()
    if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info' })
    const desfazer = r.valor.desfazer
    avisar({ texto: 'Lançamento apagado.', icone: 'desfazer', ...(desfazer ? { acao: { rotulo: 'Desfazer', executar: () => void desfazer() } } : {}) })
  }

  return (
    <FolhaInferior
      aberta={pagamento !== null}
      aoFechar={aoFechar}
      rotulo="Lançamento"
      titulo={emReais(ultimo.valor)}
      subtitulo={<span>{aluno?.nome ?? 'Aluno removido'}</span>}
      rodape={
        <Botao variante="perigo" largo icone="faltou" onClick={() => void apagar()}>
          Apagar lançamento
        </Botao>
      }
    >
      <dl class="dados">
        <div>
          <dt>Mensalidade de</dt>
          <dd>{nomeDaCompetencia(ultimo.competencia)}</dd>
        </div>
        <div>
          <dt>Forma</dt>
          <dd>{NOME_DA_FORMA[ultimo.forma]}</dd>
        </div>
        <div>
          <dt>Pago em</dt>
          <dd>{dataCurta(ultimo.pagoEm)}</dd>
        </div>
        {ultimo.registradoPorId && (
          <div>
            <dt>Lançado por</dt>
            <dd>{nomeDaEquipe(ultimo.registradoPorId)}</dd>
          </div>
        )}
        {ultimo.observacao && (
          <div>
            <dt>Observação</dt>
            <dd>{ultimo.observacao}</dd>
          </div>
        )}
      </dl>
    </FolhaInferior>
  )
}
