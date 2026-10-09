import type { JSX } from 'preact'
import { abrirEm, irPara } from '../app/navegacao'
import { hoje, momento } from '../app/relogio'
import { membro as membroAtual, papel } from '../app/perfil'
import { Botao } from '../componentes/Botao'
import { Card } from '../componentes/Card'
import { Esqueleto, EsqueletoDeLista } from '../componentes/Esqueleto'
import { EstadoVazio } from '../componentes/EstadoVazio'
import { Numero } from '../componentes/Numero'
import { Icone } from '../componentes/Icone'
import { Vagas } from '../componentes/Vagas'
import { ausenciasPorAluno } from '../dados/consultas'
import { alunosPorId, aulasNoDia, base, cargaRecente, creditos, nomeDaEquipe, nomeDaUnidade, nomeDoAluno, situacao } from '../dados/estado'
import { resumoDeCreditos } from '../dominio/reposicao'
import { faseDaAula } from '../dominio/agenda'
import { ehAdministracao } from '../dominio/permissoes'
import { dataPorExtenso, diaRelativo, horaFalada, minutosEntre, momentoDaAula, somarDias } from '../dominio/datas'
import { resumoDoDia } from '../dominio/resumo'
import type { PessoaNaAula } from '../dominio/resumo'
import { plural, primeiroNome } from '../dominio/texto'
import type { Aula } from '../dominio/tipos'
import { abrirAula } from './chamada/aulaAberta'
import { tituloDaAula } from './chamada/textos'

function saudacao(minutos: number): string {
  if (minutos < 12 * 60) return 'Bom dia'
  if (minutos < 18 * 60) return 'Boa tarde'
  return 'Boa noite'
}

/** Dia sem aula: diz quando é a próxima (nos próximos 7 dias), que é o que a pessoa quer saber. */
function textoDoDiaSemAula(dia: string, filtro: { professorId?: string }): string {
  for (let i = 1; i <= 7; i++) {
    const data = somarDias(dia, i)
    const primeira = aulasNoDia(data, filtro).find((a) => !a.cancelamento)
    if (primeira) return `Não tem aula marcada para hoje. A próxima é ${diaRelativo(data, dia)}, ${horaFalada(primeira.inicio)}.`
  }
  return 'Não tem aula marcada para hoje.'
}

function quandoComeca(minutosAte: number): string {
  if (minutosAte <= 0) return 'Acontecendo agora'
  if (minutosAte < 60) return `Começa em ${plural(minutosAte, 'minuto')}`
  const horas = Math.floor(minutosAte / 60)
  return `Daqui a ${plural(horas, 'hora')}`
}

export function Hoje() {
  const membro = membroAtual.value
  const ehAdm = ehAdministracao(papel.value)
  const dia = hoje.value
  const agora = momento.value
  const aulas = aulasNoDia(dia, ehAdm ? {} : { professorId: membro?.id ?? '' })
  const resumo = resumoDoDia(aulas, agora)
  const proxima = resumo.emAndamento ?? resumo.proximas[0]
  const depois = resumo.proximas.filter((a) => a !== proxima)

  return (
    <section class="tela" aria-labelledby="titulo-hoje">
      <header class="cabecalho-de-tela">
        <p class="micro">{dataPorExtenso(dia)}</p>
        <h1 id="titulo-hoje" class="titulo">
          {saudacao(agora.minutos)}, {primeiroNome(membro?.nome ?? '')}
        </h1>
        {!ehAdm && <p class="texto-secundario">Aqui aparecem só as suas aulas.</p>}
      </header>

      {situacao.value !== 'pronto' ? (
        <>
          <Esqueleto altura={188} raio={16} />
          <EsqueletoDeLista itens={3} altura={72} />
        </>
      ) : resumo.totalDeAulas === 0 ? (
        <EstadoVazio icone="folga" rotulo="Sem aulas hoje" texto={textoDoDiaSemAula(dia, ehAdm ? {} : { professorId: membro?.id ?? '' })}>
          <Botao variante="secundario" icone="agenda" onClick={() => irPara('agenda', papel.value)}>
            Ver a agenda
          </Botao>
        </EstadoVazio>
      ) : (
        <>
          {proxima ? (
            <ProximaAula aula={proxima} minutosAte={minutosEntre(agora, momentoDaAula(dia, proxima.inicio))} mostrarUnidade={ehAdm} />
          ) : (
            <Card variante="acento" class="destaque">
              <p class="micro">Fim do dia</p>
              <p class="titulo">As aulas de hoje acabaram.</p>
              <p>{plural(resumo.presentes, 'presença registrada', 'presenças registradas')}.</p>
            </Card>
          )}

          <div class={`numeros${cargaRecente.value ? ' cascata' : ''}`}>
            <Card class="numero-card" style={{ '--i': 0 } as JSX.CSSProperties}>
              <Numero valor={resumo.alunosEsperados} />
              <span class="numero-rotulo">alunos esperados</span>
            </Card>
            <Card class="numero-card" style={{ '--i': 1 } as JSX.CSSProperties}>
              <Numero valor={resumo.faltasAvisadas.length} />
              <span class="numero-rotulo">avisaram que não vêm</span>
            </Card>
            <Card class="numero-card" style={{ '--i': 2 } as JSX.CSSProperties}>
              <Numero valor={resumo.reposicoes.length} />
              <span class="numero-rotulo">{resumo.reposicoes.length === 1 ? 'reposição' : 'reposições'}</span>
            </Card>
          </div>

          {depois.length > 0 && (
            <section class="secao" aria-labelledby="titulo-proximas">
              <h2 id="titulo-proximas" class="micro">
                Depois
              </h2>
              <ul class={`lista${cargaRecente.value ? ' cascata' : ''}`}>
                {depois.map((a, i) => (
                  <li key={a.id} style={{ '--i': i } as JSX.CSSProperties}>
                    <LinhaDeAula aula={a} mostrarUnidade={ehAdm} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ListaDePessoas
            id="titulo-avisos"
            titulo="Avisaram que não vêm"
            pessoas={resumo.faltasAvisadas}
            vazio="Ninguém avisou falta hoje."
          />
          <ListaDePessoas id="titulo-reposicoes" titulo="Reposições de hoje" pessoas={resumo.reposicoes} vazio="Nenhuma reposição hoje." />
          <ParaOlhar />
          {resumo.canceladas > 0 && (
            <p class="texto-secundario">{plural(resumo.canceladas, 'aula cancelada', 'aulas canceladas')} hoje.</p>
          )}
        </>
      )}
    </section>
  )
}

/** Até quantos alunos sumidos aparecem pelo nome no Hoje; mais que isso vira uma linha só. */
const POUCOS_SUMIDOS = 3

/**
 * O que pede atenção além do dia: créditos de reposição perto de vencer e alunos sumidos.
 * Cada linha leva direto para onde se resolve.
 */
function ParaOlhar() {
  const eu = membroAtual.value
  const todas = ehAdministracao(papel.value)
  const doMeu = (unidadeId: string) => todas || (eu?.unidades.includes(unidadeId) ?? false)
  const alunos = alunosPorId.value
  const aVencer = resumoDeCreditos(
    [...creditos.value.values()].filter((c) => doMeu(c.unidadeId) && alunos.get(c.alunoId)?.situacao === 'ativo'),
    hoje.value,
  ).aVencer.length
  const limite = base.value?.configuracao.alertaAusenciasSeguidas ?? 3
  const sumidos = [...ausenciasPorAluno.value]
    .filter(([id, n]) => {
      const a = alunos.get(id)
      return n >= limite && a?.situacao === 'ativo' && doMeu(a.unidadeId)
    })
    .sort((a, b) => b[1] - a[1])
  if (aVencer === 0 && sumidos.length === 0) return null
  return (
    <section class="secao" aria-labelledby="titulo-para-olhar">
      <h2 id="titulo-para-olhar" class="micro">
        Para olhar
      </h2>
      <ul class="lista">
        {aVencer > 0 && (
          <li>
            <button type="button" class="lista-item tocavel" onClick={() => irPara('alunos', papel.peek(), ['reposicoes'])}>
              <span class="item-icone" aria-hidden="true">
                <Icone nome="reposicao" tamanho={22} />
              </span>
              <span class="lista-item-texto">
                <span class="lista-item-titulo">
                  {plural(aVencer, 'reposição vence', 'reposições vencem')} em 7 dias
                </span>
                <span class="lista-item-sub">Encaixar antes que o crédito acabe</span>
              </span>
              <Icone nome="avancar" tamanho={20} />
            </button>
          </li>
        )}
        {sumidos.length > 0 && sumidos.length <= POUCOS_SUMIDOS
          ? // poucos: cada um com o nome, direto para a ficha (onde estão o WhatsApp e a frequência)
            sumidos.map(([id, n]) => (
              <li key={id}>
                <button type="button" class="lista-item tocavel" onClick={() => abrirEm('alunos', [id])}>
                  <span class="item-icone" aria-hidden="true">
                    <Icone nome="alunos" tamanho={22} />
                  </span>
                  <span class="lista-item-texto">
                    <span class="lista-item-titulo">
                      {nomeDoAluno(id)} faltou {n} vezes seguidas
                    </span>
                    <span class="lista-item-sub">Vale uma mensagem para saber como está</span>
                  </span>
                  <Icone nome="avancar" tamanho={20} />
                </button>
              </li>
            ))
          : sumidos.length > 0 && (
              <li>
                <button type="button" class="lista-item tocavel" onClick={() => irPara('alunos', papel.peek())}>
                  <span class="item-icone" aria-hidden="true">
                    <Icone nome="alunos" tamanho={22} />
                  </span>
                  <span class="lista-item-texto">
                    <span class="lista-item-titulo">
                      {plural(sumidos.length, 'aluno faltou', 'alunos faltaram')} {limite} vezes ou mais seguidas
                    </span>
                    <span class="lista-item-sub">Na lista de alunos, eles aparecem marcados</span>
                  </span>
                  <Icone nome="avancar" tamanho={20} />
                </button>
              </li>
            )}
      </ul>
    </section>
  )
}

function ProximaAula({ aula, minutosAte, mostrarUnidade }: { aula: Aula; minutosAte: number; mostrarUnidade: boolean }) {
  const agora = faseDaAula(aula, momento.value) === 'agora'
  return (
    <Card variante="marca" class="destaque">
      <p class="micro">{agora ? 'Aula agora' : 'Próxima aula'}</p>
      <p class="titulo">
        {horaFalada(aula.inicio)}
        {mostrarUnidade ? `, ${nomeDaUnidade(aula.unidadeId)}` : ''}
      </p>
      <p>
        {quandoComeca(minutosAte)}, com {primeiroNome(nomeDaEquipe(aula.professorId))}.{' '}
        {plural(aula.ocupadas, 'aluno esperado', 'alunos esperados')}.
      </p>
      <div class="destaque-linha">
        <Vagas ocupadas={aula.ocupadas} capacidade={aula.capacidade} />
        <button type="button" class="botao botao--sobre-marca tocavel" onClick={() => abrirAula(aula.id)}>
          Abrir chamada
        </button>
      </div>
    </Card>
  )
}

function LinhaDeAula({ aula, mostrarUnidade }: { aula: Aula; mostrarUnidade: boolean }) {
  const avisos = aula.participantes.filter((p) => p.marcacao === 'avisou').length
  return (
    <button
      type="button"
      class="lista-item tocavel"
      onClick={() => abrirAula(aula.id)}
      aria-label={`Aula das ${tituloDaAula(aula)}. Abrir chamada`}
    >
      <span class="linha-aula">
        <span class="linha-aula-hora">{horaFalada(aula.inicio)}</span>
        <span class="linha-aula-texto">
          <span class="lista-item-titulo">
            {primeiroNome(nomeDaEquipe(aula.professorId))}
            {mostrarUnidade ? `, ${nomeDaUnidade(aula.unidadeId)}` : ''}
          </span>
          <span class="linha-aula-sub">
            {plural(aula.ocupadas, 'aluno', 'alunos')}
            {avisos > 0 ? `, ${plural(avisos, 'avisou', 'avisaram')}` : ''}
          </span>
        </span>
      </span>
      <Vagas ocupadas={aula.ocupadas} capacidade={aula.capacidade} />
    </button>
  )
}

function ListaDePessoas({ id, titulo, pessoas, vazio }: { id: string; titulo: string; pessoas: PessoaNaAula[]; vazio: string }) {
  return (
    <section class="secao" aria-labelledby={id}>
      <h2 id={id} class="micro">
        {titulo}
      </h2>
      {pessoas.length === 0 ? (
        <p class="texto-secundario">{vazio}</p>
      ) : (
        <ul class="lista">
          {pessoas.map(({ alunoId, aula }) => (
            <li key={`${alunoId}-${aula.id}`}>
              <button type="button" class="lista-item tocavel" onClick={() => abrirAula(aula.id)}>
                <span class="lista-item-texto">
                  <span class="lista-item-titulo">{nomeDoAluno(alunoId)}</span>
                  <span class="lista-item-sub">
                    Aula das {horaFalada(aula.inicio)}, {nomeDaUnidade(aula.unidadeId)}
                  </span>
                </span>
                <Icone nome="avancar" tamanho={20} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
