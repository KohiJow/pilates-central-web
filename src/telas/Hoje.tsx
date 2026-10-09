import type { JSX } from 'preact'
import { irPara } from '../app/navegacao'
import { hoje, momento } from '../app/relogio'
import { sessao } from '../app/sessao'
import { Botao } from '../componentes/Botao'
import { Card } from '../componentes/Card'
import { Esqueleto, EsqueletoDeLista } from '../componentes/Esqueleto'
import { EstadoVazio } from '../componentes/EstadoVazio'
import { Numero } from '../componentes/Numero'
import { Icone } from '../componentes/Icone'
import { Vagas } from '../componentes/Vagas'
import { aulasNoDia, cargaRecente, equipePorId, nomeDaEquipe, nomeDaUnidade, nomeDoAluno, situacao } from '../dados/estado'
import { faseDaAula } from '../dominio/agenda'
import { dataPorExtenso, horaFalada, minutosEntre, momentoDaAula } from '../dominio/datas'
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

function quandoComeca(minutosAte: number): string {
  if (minutosAte <= 0) return 'Acontecendo agora'
  if (minutosAte < 60) return `Começa em ${plural(minutosAte, 'minuto')}`
  const horas = Math.floor(minutosAte / 60)
  return `Daqui a ${plural(horas, 'hora')}`
}

export function Hoje() {
  const s = sessao.value
  const membro = s ? equipePorId.value.get(s.membroId) : undefined
  const ehDona = s?.papel === 'dona'
  const dia = hoje.value
  const agora = momento.value
  const aulas = aulasNoDia(dia, ehDona ? {} : { professorId: s?.membroId ?? '' })
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
        {!ehDona && <p class="texto-secundario">Aqui aparecem só as suas aulas.</p>}
      </header>

      {situacao.value !== 'pronto' ? (
        <>
          <Esqueleto altura={188} raio={16} />
          <EsqueletoDeLista itens={3} altura={72} />
        </>
      ) : resumo.totalDeAulas === 0 ? (
        <EstadoVazio icone="folga" rotulo="Sem aulas hoje" texto="Não tem aula marcada para hoje.">
          <Botao variante="secundario" icone="agenda" onClick={() => s && irPara('agenda', s.papel)}>
            Ver a agenda
          </Botao>
        </EstadoVazio>
      ) : (
        <>
          {proxima ? (
            <ProximaAula aula={proxima} minutosAte={minutosEntre(agora, momentoDaAula(dia, proxima.inicio))} mostrarUnidade={ehDona} />
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
                    <LinhaDeAula aula={a} mostrarUnidade={ehDona} />
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
          {resumo.canceladas > 0 && (
            <p class="texto-secundario">{plural(resumo.canceladas, 'aula cancelada', 'aulas canceladas')} hoje.</p>
          )}
        </>
      )}
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
