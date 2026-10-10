import type { JSX } from 'preact'
import { useState } from 'preact/hooks'
import { abrirEm, irPara } from '../../app/navegacao'
import { papel, pode } from '../../app/perfil'
import { hoje, momento } from '../../app/relogio'
import { Avatar } from '../../componentes/Avatar'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { Card } from '../../componentes/Card'
import { EsqueletoDeLista } from '../../componentes/Esqueleto'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { Numero } from '../../componentes/Numero'
import { Chip, Pilula } from '../../componentes/Pilula'
import { alunosPorId, base, creditos, nomeDaUnidade, situacao, tirarReposicao } from '../../dados/estado'
import { textoDasRegras } from '../../dominio/configuracao'
import { faseDaAula } from '../../dominio/agenda'
import { dataCurta, diasEntre, horaDe, horaFalada, minutosDe, somarDias } from '../../dominio/datas'
import { resumoDeCreditos } from '../../dominio/reposicao'
import { plural, primeiroNome } from '../../dominio/texto'
import type { CreditoReposicao } from '../../dominio/tipos'
import { nomeDaTurma } from '../../dominio/turmas'
import { unidadeDasReposicoes } from '../alunos/estadoDaLista'
import { unidadesVisiveis } from '../alunos/ListaDeAlunos'
import { FolhaDeEncaixe } from './FolhaDeEncaixe'

/** Quantos dias de créditos vencidos a central ainda mostra. */
const DIAS_DE_VENCIDOS = 30
const LIMITE_DA_LISTA = 8

/**
 * Central de reposição: quem tem crédito para usar (o que vence primeiro no topo), as
 * reposições já marcadas e o que venceu sem uso. Encaixar abre as aulas com vaga.
 */
export function CentralDeReposicao() {
  const visiveis = unidadesVisiveis()
  const unidadeId = visiveis.find((u) => u.id === unidadeDasReposicoes.value)?.id
  const ids = new Set(visiveis.map((u) => u.id))
  const [paraEncaixe, setParaEncaixe] = useState<string | null>(null)
  const [todos, setTodos] = useState(false)
  const dia = hoje.value
  const alunos = alunosPorId.value

  // só alunos ativos usam crédito (pausado e arquivado não vêm às aulas)
  const daUnidade = [...creditos.value.values()].filter(
    (c) => ids.has(c.unidadeId) && (!unidadeId || c.unidadeId === unidadeId) && alunos.get(c.alunoId)?.situacao === 'ativo',
  )
  const r = resumoDeCreditos(daUnidade, dia)
  const marcadas = r.usados
    .filter((c) => c.usadoEm && c.usadoEm.data >= dia)
    .sort((a, b) => (a.usadoEm?.data ?? '').localeCompare(b.usadoEm?.data ?? ''))
  const vencidos = r.vencidos.filter((c) => c.validoAte >= somarDias(dia, -DIAS_DE_VENCIDOS))
  const config = base.value?.configuracao
  const turmas = base.value?.turmas ?? []

  const tirar = async (c: CreditoReposicao) => {
    if (!c.usadoEm) return
    const nome = alunos.get(c.alunoId)?.nome ?? ''
    const res = await tirarReposicao(`${c.usadoEm.turmaId}_${c.usadoEm.data}`, c.alunoId)
    if (!res.ok) return avisar({ texto: res.mensagem, icone: 'info' })
    avisar({
      texto: `${primeiroNome(nome)} saiu da aula de ${dataCurta(c.usadoEm.data)}. O crédito voltou.`,
      icone: 'reposicao',
      acao: { rotulo: 'Desfazer', executar: () => void res.valor.desfazer() },
    })
  }

  // o cabeçalho (título e seções) fica em Alunos.tsx: só este conteúdo troca entre as seções
  return (
    <div class="tela">
      {visiveis.length > 1 && (
        <div class="chips" role="radiogroup" aria-label="Unidade">
          <Chip papel="radio" ativo={!unidadeId} aoTocar={() => (unidadeDasReposicoes.value = null)}>
            Todas
          </Chip>
          {visiveis.map((u) => (
            <Chip key={u.id} papel="radio" ativo={u.id === unidadeId} aoTocar={() => (unidadeDasReposicoes.value = u.id)}>
              {u.nome}
            </Chip>
          ))}
        </div>
      )}

      {situacao.value !== 'pronto' ? (
        <EsqueletoDeLista itens={4} altura={72} />
      ) : (
        <>
          <div class="numeros">
            <Card class="numero-card">
              <Numero valor={r.disponiveis.length} />
              <span class="numero-rotulo">para encaixar</span>
            </Card>
            <Card class="numero-card">
              <Numero valor={r.aVencer.length} />
              <span class="numero-rotulo">vencem em 7 dias</span>
            </Card>
            <Card class="numero-card">
              <Numero valor={marcadas.length} />
              <span class="numero-rotulo">{marcadas.length === 1 ? 'marcada' : 'marcadas'}</span>
            </Card>
          </div>

          <section class="secao" aria-labelledby="titulo-para-encaixar">
            <h2 id="titulo-para-encaixar" class="micro">
              Para encaixar, o que vence primeiro no topo
            </h2>
            {r.disponiveis.length === 0 ? (
              <EstadoVazio icone="reposicao" rotulo="Tudo em dia" texto="Ninguém com reposição para encaixar." />
            ) : (
              <ul class="lista">
                {(todos ? r.disponiveis : r.disponiveis.slice(0, LIMITE_DA_LISTA)).map((c, i) => {
                  const nome = alunos.get(c.alunoId)?.nome ?? 'Aluno'
                  const faltam = diasEntre(dia, c.validoAte)
                  return (
                    <li key={c.id} class="lista-item" style={{ '--i': i } as JSX.CSSProperties} data-credito={c.id}>
                      <Avatar nome={nome} tamanho={36} />
                      <button type="button" class="lista-item-texto botao-texto tocavel" onClick={() => abrirEm('alunos', [c.alunoId])}>
                        <span class="lista-item-titulo">{nome}</span>
                        <span class="lista-item-sub">
                          {c.origem.data <= dia ? 'Faltou' : 'Vai faltar'} em {dataCurta(c.origem.data)}
                          {unidadeId ? '' : `, ${nomeDaUnidade(c.unidadeId)}`}
                        </span>
                        {faltam <= 7 ? (
                          <Pilula tom="alerta">{faltam === 0 ? 'vence hoje' : `vence em ${plural(faltam, 'dia')}`}</Pilula>
                        ) : (
                          <span class="lista-item-sub">Vale até {dataCurta(c.validoAte)}</span>
                        )}
                      </button>
                      {pode('encaixar-reposicao') && (
                        <Botao variante="secundario" onClick={() => setParaEncaixe(c.id)}>
                          Encaixar
                        </Botao>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {!todos && r.disponiveis.length > LIMITE_DA_LISTA && (
              <Botao variante="terciario" class="mostrar-todos" onClick={() => setTodos(true)}>
                Mostrar todos os {r.disponiveis.length}
              </Botao>
            )}
          </section>

          {marcadas.length > 0 && (
            <section class="secao" aria-labelledby="titulo-marcadas">
              <h2 id="titulo-marcadas" class="micro">
                Reposições marcadas
              </h2>
              <ul class="lista">
                {marcadas.map((c) => {
                  const nome = alunos.get(c.alunoId)?.nome ?? 'Aluno'
                  const turma = turmas.find((t) => t.id === c.usadoEm?.turmaId)
                  const encerrada =
                    turma && c.usadoEm
                      ? faseDaAula({ data: c.usadoEm.data, inicio: turma.inicio, fim: horaDe(minutosDe(turma.inicio) + turma.duracaoMin) }, momento.value) ===
                        'encerrada'
                      : false
                  return (
                    <li key={c.id} class="lista-item">
                      <span class="lista-item-texto">
                        <span class="lista-item-titulo">{nome}</span>
                        <span class="lista-item-sub">
                          {c.usadoEm ? dataCurta(c.usadoEm.data) : ''}
                          {turma ? `, ${horaFalada(turma.inicio)} (${nomeDaTurma(turma).split(',')[0]?.toLowerCase()})` : ''}
                        </span>
                      </span>
                      {encerrada ? (
                        <Pilula tom="sucesso">feita</Pilula>
                      ) : (
                        <Botao variante="terciario" onClick={() => void tirar(c)} aria-label={`Tirar a reposição de ${nome}`}>
                          Tirar
                        </Botao>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {vencidos.length > 0 && (
            <section class="secao" aria-labelledby="titulo-vencidos">
              <h2 id="titulo-vencidos" class="micro">
                Venceram sem uso (últimos {DIAS_DE_VENCIDOS} dias)
              </h2>
              <ul class="lista">
                {vencidos.map((c) => (
                  <li key={c.id} class="lista-item">
                    <span class="lista-item-texto">
                      <span class="lista-item-titulo">{alunos.get(c.alunoId)?.nome ?? 'Aluno'}</span>
                      <span class="lista-item-sub">
                        Faltou em {dataCurta(c.origem.data)}, venceu em {dataCurta(c.validoAte)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {config && (
            <section class="secao" aria-labelledby="titulo-regras">
              <h2 id="titulo-regras" class="micro">
                Regras do estúdio
              </h2>
              <p class="texto-secundario">{textoDasRegras(config)}</p>
              {pode('editar-configuracao') && (
                <Botao variante="terciario" icone="regras" onClick={() => irParaRegras()}>
                  Mudar as regras
                </Botao>
              )}
            </section>
          )}
        </>
      )}

      <FolhaDeEncaixe creditoId={paraEncaixe} aoFechar={() => setParaEncaixe(null)} />
    </div>
  )
}

function irParaRegras(): void {
  irPara('mais', papel.peek())
  abrirEm('mais', ['regras'])
}
