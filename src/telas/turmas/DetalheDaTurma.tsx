import type { JSX } from 'preact'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { abrir, abrirEm } from '../../app/navegacao'
import { pode } from '../../app/perfil'
import { hoje } from '../../app/relogio'
import { Avatar } from '../../componentes/Avatar'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { Campo } from '../../componentes/Campo'
import { Card } from '../../componentes/Card'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { Numero } from '../../componentes/Numero'
import { Pilula } from '../../componentes/Pilula'
import { Vagas } from '../../componentes/Vagas'
import { frequenciaDaTurma } from '../../dados/consultas'
import { alunosPorId, base, garantirIntervalo, intervaloCarregado, nomeDaEquipe, nomeDaUnidade } from '../../dados/estado'
import { colocarAlunoNaTurma, encerrarTurmaAcao, tirarAlunoDaTurma } from '../../dados/gestao'
import { conferirPlano, NOME_DA_SITUACAO } from '../../dominio/alunos'
import { dataCurta } from '../../dominio/datas'
import { normalizar, plural, primeiroNome } from '../../dominio/texto'
import type { Turma } from '../../dominio/tipos'
import { candidatosParaTurma, horarioDaTurma, lugaresReservados, nomeDaTurma } from '../../dominio/turmas'

export function DetalheDaTurma({ turmaId }: { turmaId: string }) {
  const turma = base.value?.turmas.find((t) => t.id === turmaId)
  if (!turma) {
    return (
      <section class="tela">
        <CabecalhoDeSubtela voltarPara="Turmas" titulo="Turma não encontrada" />
        <EstadoVazio icone="grade" rotulo="Sumiu" texto="Esta turma não está mais na grade." />
      </section>
    )
  }
  return <Detalhe turma={turma} />
}

function Detalhe({ turma }: { turma: Turma }) {
  const ehAdm = pode('editar-turmas')
  const [colocando, setColocando] = useState(false)
  const [encerrando, setEncerrando] = useState(false)
  const alunos = alunosPorId.value
  const situacaoDe = (id: string) => alunos.get(id)?.situacao
  const ocupados = lugaresReservados(turma, situacaoDe)
  const fixos = turma.alunosFixos.map((id) => alunos.get(id)).filter((a) => a !== undefined && a.situacao !== 'inativo')

  const inicioDoMes = `${hoje.value.slice(0, 7)}-01`
  const pronto = intervaloCarregado(inicioDoMes, hoje.value)
  useEffect(() => {
    if (!pronto) void garantirIntervalo(inicioDoMes, hoje.peek())
  }, [inicioDoMes, pronto])
  const f = frequenciaDaTurma(turma.id, inicioDoMes, hoje.value)

  const tirar = async (alunoId: string, nome: string) => {
    const r = await tirarAlunoDaTurma(turma.id, alunoId)
    if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info' })
    const desfazer = r.valor.desfazer
    avisar({ texto: `${primeiroNome(nome)} saiu da turma.`, icone: 'desfazer', ...(desfazer ? { acao: { rotulo: 'Desfazer', executar: () => void desfazer() } } : {}) })
  }

  const encerrar = async () => {
    setEncerrando(false)
    const r = await encerrarTurmaAcao(turma.id)
    if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info' })
    const desfazer = r.valor.desfazer
    avisar({ texto: 'Turma encerrada. As aulas que já aconteceram continuam no histórico.', icone: 'folga', ...(desfazer ? { acao: { rotulo: 'Desfazer', executar: () => void desfazer() } } : {}) })
  }

  return (
    <section class="tela" aria-labelledby="titulo-turma">
      <CabecalhoDeSubtela voltarPara="Turmas" rotulo={`Turma, ${nomeDaUnidade(turma.unidadeId)}`} titulo={nomeDaTurma(turma)} idTitulo="titulo-turma">
        {!turma.ativa && (
          <div class="chips">
            <Pilula tom="alerta">Encerrada</Pilula>
          </div>
        )}
      </CabecalhoDeSubtela>

      <Card class="pilha">
        <p class="subtitulo">{horarioDaTurma(turma)}</p>
        <p class="texto-secundario">
          Com {nomeDaEquipe(turma.professorId)}. {turma.duracaoMin} minutos.
        </p>
        <Vagas ocupadas={ocupados} capacidade={turma.capacidade} />
        <p class="texto-secundario">
          {plural(ocupados, 'lugar fixo', 'lugares fixos')} de {turma.capacidade}
          {turma.alunosFixos.some((id) => situacaoDe(id) === 'pausado') ? ' (pausados guardam o lugar)' : ''}.
        </p>
      </Card>

      <section class="secao" aria-labelledby="titulo-alunos-turma">
        <h2 id="titulo-alunos-turma" class="micro">
          Alunos fixos
        </h2>
        {fixos.length === 0 ? (
          <p class="texto-secundario">Ninguém fixo nesta turma ainda.</p>
        ) : (
          <ul class="lista">
            {fixos.map((a) => {
              if (!a) return null
              const plano = conferirPlano(a, base.value?.turmas ?? [])
              return (
                <li key={a.id} class="lista-item" data-aluno={a.id}>
                  <Avatar nome={a.nome} tamanho={36} />
                  <button type="button" class="lista-item-texto botao-texto tocavel" onClick={() => abrirEm('alunos', [a.id])}>
                    <span class="lista-item-titulo">{a.nome}</span>
                    <span class="lista-item-sub">
                      {a.situacao === 'pausado' ? `${NOME_DA_SITUACAO.pausado}, ` : ''}
                      {plano.aviso ?? `${a.vezesPorSemana}x por semana`}
                      {turma.fixosDesde?.[a.id] && turma.fixosDesde[a.id] !== turma.desde ? `. Desde ${dataCurta(turma.fixosDesde[a.id] ?? '')}` : ''}
                    </span>
                  </button>
                  {ehAdm && turma.ativa && (
                    <Botao variante="terciario" onClick={() => void tirar(a.id, a.nome)} aria-label={`Tirar ${a.nome} da turma`}>
                      Tirar
                    </Botao>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {ehAdm && turma.ativa && (
          <Botao variante="secundario" icone="adicionar" largo onClick={() => setColocando(true)} disabled={ocupados >= turma.capacidade}>
            {ocupados >= turma.capacidade ? 'Turma cheia' : 'Colocar aluno'}
          </Botao>
        )}
      </section>

      <section class="secao" aria-labelledby="titulo-freq-turma">
        <h2 id="titulo-freq-turma" class="micro">
          Frequência deste mês
        </h2>
        {f.aulas === 0 ? (
          <p class="texto-secundario">Nenhuma aula com chamada neste mês ainda.</p>
        ) : (
          <>
            <div class="numeros">
              <Card class="numero-card">
                <Numero valor={f.percentual ?? 0} />
                <span class="numero-rotulo">% de presença</span>
              </Card>
              <Card class="numero-card">
                <Numero valor={f.faltas} />
                <span class="numero-rotulo">{f.faltas === 1 ? 'falta' : 'faltas'}</span>
              </Card>
              <Card class="numero-card">
                <Numero valor={f.reposicoes} />
                <span class="numero-rotulo">{f.reposicoes === 1 ? 'reposição recebida' : 'reposições recebidas'}</span>
              </Card>
            </div>
            <p class="texto-secundario">
              {plural(f.presentes, 'presença', 'presenças')} e {plural(f.avisos, 'aviso', 'avisos')} até hoje.
            </p>
          </>
        )}
      </section>

      {ehAdm && turma.ativa && (
        <section class="secao" aria-label="Ações da turma">
          <Botao variante="secundario" icone="editar" largo onClick={() => abrir('turmas', turma.id, 'editar')}>
            Editar horário, lugares ou professor
          </Botao>
          <Botao variante="terciario" icone="folga" largo onClick={() => setEncerrando(true)}>
            Encerrar turma
          </Botao>
        </section>
      )}

      {ehAdm && <ColocarAluno turma={turma} aberta={colocando} aoFechar={() => setColocando(false)} />}
      <FolhaInferior
        aberta={encerrando}
        aoFechar={() => setEncerrando(false)}
        rotulo="Encerrar turma"
        titulo={`Encerrar a turma de ${nomeDaTurma(turma).toLowerCase()}?`}
        rodape={
          <div class="linha-acoes">
            <Botao variante="secundario" onClick={() => setEncerrando(false)}>
              Agora não
            </Botao>
            <Botao variante="perigo" onClick={() => void encerrar()}>
              Encerrar
            </Botao>
          </div>
        }
      >
        <p>A turma some da agenda a partir de hoje. As aulas que já aconteceram, com presenças e reposições, continuam no histórico.</p>
      </FolhaInferior>
    </section>
  )
}

function ColocarAluno({ turma, aberta, aoFechar }: { turma: Turma; aberta: boolean; aoFechar: () => void }) {
  const [busca, setBusca] = useState('')
  const todos = base.value?.alunos ?? []
  const candidatos = candidatosParaTurma(turma, todos, base.value?.turmas ?? [])
  const filtrados = useMemo(() => {
    const termo = normalizar(busca)
    return termo ? candidatos.filter((a) => normalizar(a.nome).includes(termo)) : candidatos
  }, [busca, candidatos])
  const turmas = base.value?.turmas ?? []

  const colocar = async (alunoId: string, nome: string) => {
    const r = await colocarAlunoNaTurma(turma.id, alunoId)
    if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info' })
    const desfazer = r.valor.desfazer
    avisar({ texto: `${primeiroNome(nome)} entrou na turma.`, icone: 'presente', ...(desfazer ? { acao: { rotulo: 'Desfazer', executar: () => void desfazer() } } : {}) })
    aoFechar()
  }

  return (
    <FolhaInferior
      aberta={aberta}
      aoFechar={aoFechar}
      rotulo="Colocar aluno"
      titulo={nomeDaTurma(turma)}
      subtitulo={<span>Alunos de {nomeDaUnidade(turma.unidadeId)}. Primeiro quem ainda está com turma faltando no plano.</span>}
    >
      <div class="pilha">
        <Campo rotulo="Buscar aluno" icone="busca" type="search" valor={busca} aoMudar={setBusca} placeholder="Nome" autocomplete="off" />
        {filtrados.length === 0 ? (
          <p class="texto-secundario">Nenhum aluno para colocar.</p>
        ) : (
          <ul class="lista">
            {filtrados.slice(0, 40).map((a, i) => {
              const plano = conferirPlano(a, turmas)
              return (
                <li key={a.id} class="lista-item" style={{ '--i': i } as JSX.CSSProperties}>
                  <span class="lista-item-texto">
                    <span class="lista-item-titulo">{a.nome}</span>
                    <span class="lista-item-sub">{plano.aviso ?? `${a.vezesPorSemana}x por semana, turmas completas`}</span>
                  </span>
                  <Botao variante="secundario" onClick={() => void colocar(a.id, a.nome)}>
                    Colocar
                  </Botao>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </FolhaInferior>
  )
}
