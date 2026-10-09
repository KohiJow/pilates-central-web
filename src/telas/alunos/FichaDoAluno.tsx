import type { JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { abrir, abrirEm } from '../../app/navegacao'
import { pode } from '../../app/perfil'
import { hoje } from '../../app/relogio'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { Card } from '../../componentes/Card'
import { Esqueleto } from '../../componentes/Esqueleto'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { Icone } from '../../componentes/Icone'
import type { NomeDoIcone } from '../../componentes/Icone'
import { Numero } from '../../componentes/Numero'
import { Chip, Pilula } from '../../componentes/Pilula'
import { Vagas } from '../../componentes/Vagas'
import { ausenciasPorAluno, creditosDoAluno, frequenciaDoAluno } from '../../dados/consultas'
import {
  alunosPorId,
  base,
  carregarFinanceiro,
  financeiro,
  garantirIntervalo,
  intervaloCarregado,
  nomeDaEquipe,
  nomeDaUnidade,
  pagamentos,
  situacaoFinanceira,
} from '../../dados/estado'
import { colocarAlunoNaTurma, mudarSituacaoDoAluno, tirarAlunoDaTurma } from '../../dados/gestao'
import { conferirPlano, NOME_DA_SITUACAO } from '../../dominio/alunos'
import { turmasDoAluno } from '../../dominio/agenda'
import { dataCurta, dataPorExtenso, horaFalada } from '../../dominio/datas'
import {
  deslocarCompetencia,
  emReais,
  mensagemDeLembrete,
  NOME_DA_FORMA,
  nomeDaCompetencia,
  resumoDoMes,
  ultimasCompetencias,
  ultimoDiaDaCompetencia,
} from '../../dominio/pagamentos'
import { resumoDeCreditos } from '../../dominio/reposicao'
import { linkDoWhatsApp, maiuscula, plural, primeiroNome, telefoneLegivel } from '../../dominio/texto'
import type { Aluno, Marcacao, SituacaoAluno } from '../../dominio/tipos'
import { lugaresReservados, nomeDaTurma } from '../../dominio/turmas'
import { abrirAula } from '../chamada/aulaAberta'
import { FolhaDePagamento } from '../financeiro/FolhaDePagamento'
import { FolhaDeEncaixe } from '../reposicao/FolhaDeEncaixe'
import { AcessoAoApp, DadosEPrivacidade } from './AcessoEPrivacidade'

const ICONE: Record<Marcacao, NomeDoIcone> = { presente: 'presente', faltou: 'faltou', avisou: 'avisou' }
const PALAVRA: Record<Marcacao, string> = { presente: 'presente', faltou: 'faltou', avisou: 'avisou' }

export function FichaDoAluno({ alunoId }: { alunoId: string }) {
  const aluno = alunosPorId.value.get(alunoId)
  if (!aluno) {
    return (
      <section class="tela">
        <CabecalhoDeSubtela voltarPara="Alunos" titulo="Aluno não encontrado" />
        <EstadoVazio icone="alunos" rotulo="Sumiu" texto="Este aluno não está mais no cadastro." />
      </section>
    )
  }
  return <Ficha aluno={aluno} />
}

function Ficha({ aluno }: { aluno: Aluno }) {
  const ehAdm = pode('editar-alunos')
  const [creditoParaEncaixe, setCreditoParaEncaixe] = useState<string | null>(null)
  const [pagando, setPagando] = useState(false)
  const [colocando, setColocando] = useState(false)
  const [confirmando, setConfirmando] = useState<SituacaoAluno | null>(null)
  const competencia = hoje.value.slice(0, 7)

  useEffect(() => {
    if (pode('ver-financeiro')) void carregarFinanceiro(ultimasCompetencias(competencia, 6))
  }, [competencia])

  const turmas = turmasDoAluno(aluno.id, base.value?.turmas ?? [])
  const plano = conferirPlano(aluno, base.value?.turmas ?? [])
  const ausencias = ausenciasPorAluno.value.get(aluno.id) ?? 0
  const limite = base.value?.configuracao.alertaAusenciasSeguidas ?? 3

  const mudarSituacao = async (nova: SituacaoAluno) => {
    setConfirmando(null)
    const r = await mudarSituacaoDoAluno(aluno.id, nova)
    if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info' })
    const textos: Record<SituacaoAluno, string> = {
      ativo: `${primeiroNome(aluno.nome)} está de volta.`,
      pausado: `Cadastro de ${primeiroNome(aluno.nome)} pausado. O lugar nas turmas fica guardado.`,
      inativo: `Cadastro de ${primeiroNome(aluno.nome)} arquivado: saiu das turmas.`,
    }
    const desfazer = r.valor.desfazer
    avisar({ texto: textos[nova], icone: nova === 'ativo' ? 'presente' : nova === 'pausado' ? 'pausa' : 'arquivo', ...(desfazer ? { acao: { rotulo: 'Desfazer', executar: () => void desfazer() } } : {}) })
  }

  const tirar = async (turmaId: string) => {
    const r = await tirarAlunoDaTurma(turmaId, aluno.id)
    if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info' })
    const desfazer = r.valor.desfazer
    avisar({ texto: `${primeiroNome(aluno.nome)} saiu da turma.`, icone: 'desfazer', ...(desfazer ? { acao: { rotulo: 'Desfazer', executar: () => void desfazer() } } : {}) })
  }

  return (
    <section class="tela" aria-labelledby="titulo-ficha">
      <CabecalhoDeSubtela
        voltarPara="Alunos"
        rotulo={`Aluno, ${nomeDaUnidade(aluno.unidadeId)}`}
        titulo={aluno.nome}
        idTitulo="titulo-ficha"
      >
        {(aluno.situacao !== 'ativo' || (aluno.situacao === 'ativo' && ausencias >= limite)) && (
          <div class="chips">
            {aluno.situacao !== 'ativo' && <Pilula>{NOME_DA_SITUACAO[aluno.situacao]}</Pilula>}
            {aluno.situacao === 'ativo' && ausencias >= limite && (
              <Pilula tom="alerta">{plural(ausencias, 'ausência seguida', 'ausências seguidas')}</Pilula>
            )}
          </div>
        )}
      </CabecalhoDeSubtela>

      {aluno.telefone && (
        <div class="linha-acoes">
          <a class="botao botao--secundario tocavel" href={linkDoWhatsApp(aluno.telefone)} target="_blank" rel="noopener noreferrer">
            <Icone nome="mensagem" tamanho={20} />
            <span>WhatsApp</span>
          </a>
          <a class="botao botao--secundario tocavel" href={`tel:+${aluno.telefone}`}>
            <Icone nome="telefone" tamanho={20} />
            <span>Ligar</span>
          </a>
        </div>
      )}

      <section class="secao" aria-labelledby="titulo-plano">
        <h2 id="titulo-plano" class="micro">
          Plano e turmas fixas
        </h2>
        <Card>
          <p class="subtitulo">{aluno.vezesPorSemana}x por semana</p>
          {plano.aviso && aluno.situacao !== 'inativo' && (
            <p class="nota-alerta">
              <Icone nome="alerta" tamanho={20} />
              <span>{plano.aviso}</span>
            </p>
          )}
        </Card>
        {turmas.length > 0 && (
          <ul class="lista">
            {turmas.map((t) => (
              <li key={t.id} class="lista-item">
                <button type="button" class="lista-item-texto botao-texto tocavel" onClick={() => abrirEm('alunos', ['turmas', t.id])}>
                  <span class="lista-item-titulo">{nomeDaTurma(t)}</span>
                  <span class="lista-item-sub">com {primeiroNome(nomeDaEquipe(t.professorId))}</span>
                </button>
                {ehAdm && (
                  <Botao variante="terciario" onClick={() => void tirar(t.id)} aria-label={`Tirar da turma de ${nomeDaTurma(t)}`}>
                    Tirar
                  </Botao>
                )}
              </li>
            ))}
          </ul>
        )}
        {ehAdm && aluno.situacao !== 'inativo' && (
          <Botao variante="secundario" icone="adicionar" largo onClick={() => setColocando(true)}>
            Colocar em turma
          </Botao>
        )}
      </section>

      <Frequencia aluno={aluno} />

      <Creditos aluno={aluno} aoEncaixar={setCreditoParaEncaixe} />

      {pode('ver-financeiro') && <Pagamentos aluno={aluno} competencia={competencia} aoLancar={() => setPagando(true)} />}

      <section class="secao" aria-labelledby="titulo-dados">
        <h2 id="titulo-dados" class="micro">
          Dados
        </h2>
        <dl class="dados">
          <div>
            <dt>Telefone</dt>
            <dd>{aluno.telefone ? telefoneLegivel(aluno.telefone) : 'Sem telefone'}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{aluno.email || 'Sem e-mail'}</dd>
          </div>
          <div>
            <dt>Aluno desde</dt>
            <dd>{dataPorExtenso(aluno.desde).replace(/^\S+, /, '')} de {aluno.desde.slice(0, 4)}</dd>
          </div>
          {aluno.observacao && (
            <div>
              <dt>Observação</dt>
              <dd>{aluno.observacao}</dd>
            </div>
          )}
        </dl>
      </section>

      <AcessoAoApp aluno={aluno} />

      {ehAdm && (
        <section class="secao" aria-label="Ações do cadastro">
          <Botao variante="secundario" icone="editar" largo onClick={() => abrir(aluno.id, 'editar')}>
            Editar cadastro
          </Botao>
          {aluno.situacao === 'ativo' && (
            <Botao variante="terciario" icone="pausa" largo onClick={() => setConfirmando('pausado')}>
              Pausar (férias, viagem)
            </Botao>
          )}
          {aluno.situacao !== 'ativo' && (
            <Botao variante="terciario" icone="presente" largo onClick={() => void mudarSituacao('ativo')}>
              Voltar para ativo
            </Botao>
          )}
          {aluno.situacao !== 'inativo' && (
            <Botao variante="terciario" icone="arquivo" largo onClick={() => setConfirmando('inativo')}>
              Arquivar
            </Botao>
          )}
        </section>
      )}

      <DadosEPrivacidade aluno={aluno} />

      <FolhaDeEncaixe creditoId={creditoParaEncaixe} aoFechar={() => setCreditoParaEncaixe(null)} />
      {pode('registrar-pagamento') && (
        <FolhaDePagamento aberta={pagando} aoFechar={() => setPagando(false)} alunoId={aluno.id} competencia={competencia} />
      )}
      {ehAdm && <ColocarEmTurma aluno={aluno} aberta={colocando} aoFechar={() => setColocando(false)} />}
      <FolhaInferior
        aberta={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        rotulo={confirmando === 'inativo' ? 'Arquivar' : 'Pausar'}
        titulo={confirmando === 'inativo' ? `Arquivar ${primeiroNome(aluno.nome)}?` : `Pausar ${primeiroNome(aluno.nome)}?`}
        rodape={
          <div class="linha-acoes">
            <Botao variante="secundario" onClick={() => setConfirmando(null)}>
              Agora não
            </Botao>
            <Botao variante="primario" onClick={() => confirmando && void mudarSituacao(confirmando)}>
              {confirmando === 'inativo' ? 'Arquivar' : 'Pausar'}
            </Botao>
          </div>
        }
      >
        <p>
          {confirmando === 'inativo'
            ? 'O aluno sai das turmas fixas e os lugares ficam livres. O histórico de aulas e pagamentos continua guardado.'
            : 'O aluno continua nas turmas, mas some das aulas até voltar: as vagas ficam livres para reposição e a mensalidade não é cobrada.'}
        </p>
      </FolhaInferior>
    </section>
  )
}

function Frequencia({ aluno }: { aluno: Aluno }) {
  const [mes, setMes] = useState<'atual' | 'anterior'>('atual')
  const competencia = mes === 'atual' ? hoje.value.slice(0, 7) : deslocarCompetencia(hoje.value.slice(0, 7), -1)
  const de = `${competencia}-01`
  const ate = mes === 'atual' ? hoje.value : ultimoDiaDaCompetencia(competencia)
  const pronto = intervaloCarregado(de, ate)
  useEffect(() => {
    if (!pronto) void garantirIntervalo(de, ate)
  }, [de, ate, pronto])
  const { frequencia: f, participacoes } = frequenciaDoAluno(aluno.id, de, ate)
  const ultimas = participacoes
    .filter((p) => p.participante.marcacao !== undefined)
    .slice(-6)
    .reverse()

  return (
    <section class="secao" aria-labelledby="titulo-frequencia">
      <div class="secao-cabeca">
        <h2 id="titulo-frequencia" class="micro">
          Frequência de {nomeDaCompetencia(competencia).replace(/ de \d{4}$/, '')}
        </h2>
      </div>
      <div class="chips" role="radiogroup" aria-label="Mês da frequência">
        <Chip papel="radio" ativo={mes === 'atual'} aoTocar={() => setMes('atual')}>
          Este mês
        </Chip>
        <Chip papel="radio" ativo={mes === 'anterior'} aoTocar={() => setMes('anterior')}>
          Mês passado
        </Chip>
      </div>
      {!pronto ? (
        <Esqueleto altura={112} raio={16} />
      ) : f.aulas === 0 ? (
        <p class="texto-secundario">Nenhuma aula neste mês ainda.</p>
      ) : (
        <>
          <div class="numeros numeros--quatro">
            <Card class="numero-card">
              <Numero valor={f.presentes} />
              <span class="numero-rotulo">{f.presentes === 1 ? 'presença' : 'presenças'}</span>
            </Card>
            <Card class="numero-card">
              <Numero valor={f.faltas} />
              <span class="numero-rotulo">{f.faltas === 1 ? 'falta' : 'faltas'}</span>
            </Card>
            <Card class="numero-card">
              <Numero valor={f.avisos} />
              <span class="numero-rotulo">{f.avisos === 1 ? 'aviso' : 'avisos'}</span>
            </Card>
            <Card class="numero-card">
              <Numero valor={f.reposicoes} />
              <span class="numero-rotulo">{f.reposicoes === 1 ? 'reposição' : 'reposições'}</span>
            </Card>
          </div>
          <p class="texto-secundario">
            {f.percentual === null ? 'Sem chamada feita ainda.' : `Veio a ${f.percentual}% das aulas com chamada.`}
            {f.semMarcacao > 0 ? ` ${plural(f.semMarcacao, 'aula ficou', 'aulas ficaram')} sem chamada.` : ''}
          </p>
          {ultimas.length > 0 && (
            <ul class="lista">
              {ultimas.map(({ aula, participante }) => {
                const m = participante.marcacao as Marcacao
                return (
                  <li key={aula.id}>
                    <button type="button" class="lista-item tocavel" onClick={() => abrirAula(aula.id)}>
                      <span class={`marca-presenca marca-presenca--${m}`}>
                        <Icone nome={ICONE[m]} tamanho={18} traco={2.25} />
                      </span>
                      <span class="lista-item-texto">
                        <span class="lista-item-titulo">
                          {dataCurta(aula.data)}, {horaFalada(aula.inicio)}
                        </span>
                        <span class="lista-item-sub">
                          {PALAVRA[m]}
                          {participante.origem === 'reposicao' ? ', veio repor' : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

function Creditos({ aluno, aoEncaixar }: { aluno: Aluno; aoEncaixar: (id: string) => void }) {
  const r = resumoDeCreditos(creditosDoAluno(aluno.id), hoje.value)
  const marcadas = r.usados.filter((c) => c.usadoEm && c.usadoEm.data >= hoje.value)
  const vencidosRecentes = r.vencidos.filter((c) => c.validoAte >= deslocarCompetencia(hoje.value.slice(0, 7), -1))
  return (
    <section class="secao" aria-labelledby="titulo-creditos">
      <h2 id="titulo-creditos" class="micro">
        Reposições
      </h2>
      {r.disponiveis.length === 0 && marcadas.length === 0 && vencidosRecentes.length === 0 ? (
        <p class="texto-secundario">Nenhuma reposição pendente.</p>
      ) : (
        <ul class="lista">
          {r.disponiveis.map((c) => (
            <li key={c.id} class="lista-item">
              <span class="lista-item-texto">
                <span class="lista-item-titulo">
                  {c.origem.data <= hoje.value ? 'Faltou' : 'Vai faltar'} em {dataCurta(c.origem.data)}
                </span>
                <span class="lista-item-sub">
                  Vale até {dataCurta(c.validoAte)}
                  {c.motivo === 'cancelamento' ? ', aula cancelada pelo estúdio' : ''}
                </span>
              </span>
              {pode('encaixar-reposicao') && aluno.situacao === 'ativo' && (
                <Botao variante="secundario" onClick={() => aoEncaixar(c.id)}>
                  Encaixar
                </Botao>
              )}
            </li>
          ))}
          {marcadas.map((c) => (
            <li key={c.id} class="lista-item">
              <span class="lista-item-texto">
                <span class="lista-item-titulo">Reposição marcada</span>
                <span class="lista-item-sub">{c.usadoEm ? `${dataCurta(c.usadoEm.data)}, da falta de ${dataCurta(c.origem.data)}` : ''}</span>
              </span>
              <Pilula tom="acento">marcada</Pilula>
            </li>
          ))}
          {vencidosRecentes.map((c) => (
            <li key={c.id} class="lista-item">
              <span class="lista-item-texto">
                <span class="lista-item-titulo">Faltou em {dataCurta(c.origem.data)}</span>
                <span class="lista-item-sub">Venceu em {dataCurta(c.validoAte)} sem uso</span>
              </span>
              <Pilula>vencida</Pilula>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Pagamentos({ aluno, competencia, aoLancar }: { aluno: Aluno; competencia: string; aoLancar: () => void }) {
  if (situacaoFinanceira.value !== 'pronto') {
    return (
      <section class="secao" aria-label="Pagamentos">
        <Esqueleto altura={120} raio={16} />
      </section>
    )
  }
  const fin = financeiro.value.get(aluno.id)
  const lista = [...pagamentos.value.values()]
    .filter((p) => p.alunoId === aluno.id)
    .sort((a, b) => b.competencia.localeCompare(a.competencia) || b.pagoEm.localeCompare(a.pagoEm))
  const doMes = resumoDoMes([aluno], financeiro.value, [...pagamentos.value.values()], competencia, hoje.value)
  const aberto = doMes.abertos[0]
  const nomeEstudio = base.value?.configuracao.nomeEstudio ?? ''

  return (
    <section class="secao" aria-labelledby="titulo-pagamentos">
      <h2 id="titulo-pagamentos" class="micro">
        Mensalidade
      </h2>
      <Card>
        <p class="subtitulo">{fin ? `${emReais(fin.valorMensal)} por mês` : 'Sem mensalidade cadastrada'}</p>
        {fin && (
          <p class="texto-secundario">
            {NOME_DA_FORMA[fin.formaPreferida]}, vence dia {fin.diaVencimento}
          </p>
        )}
        {aluno.situacao === 'ativo' && fin && (
          <p class={aberto ? 'nota-alerta' : 'nota-ok'}>
            <Icone nome={aberto ? 'alerta' : 'presente'} tamanho={20} />
            <span>
              {aberto
                ? `${maiuscula(nomeDaCompetencia(competencia))}: falta ${emReais(aberto.falta)}${aberto.atrasado ? `, venceu em ${dataCurta(aberto.vencimento)}` : `, vence em ${dataCurta(aberto.vencimento)}`}.`
                : `${maiuscula(nomeDaCompetencia(competencia))}: pago.`}
            </span>
          </p>
        )}
      </Card>
      <div class="linha-acoes">
        <Botao variante="secundario" icone="dinheiro" onClick={aoLancar}>
          Lançar pagamento
        </Botao>
        {aberto && aluno.telefone && (
          <a
            class="botao botao--terciario tocavel"
            href={linkDoWhatsApp(
              aluno.telefone,
              mensagemDeLembrete({
                nomeAluno: aluno.nome,
                nomeEstudio,
                competencia,
                valor: aberto.falta,
                vencimento: aberto.vencimento,
                atrasado: aberto.atrasado,
              }),
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icone nome="mensagem" tamanho={20} />
            <span>Lembrar</span>
          </a>
        )}
      </div>
      {lista.length > 0 && (
        <ul class="lista">
          {lista.slice(0, 6).map((p) => (
            <li key={p.id} class="lista-item">
              <span class="lista-item-texto">
                <span class="lista-item-titulo">{maiuscula(nomeDaCompetencia(p.competencia))}</span>
                <span class="lista-item-sub">
                  {NOME_DA_FORMA[p.forma]}, pago em {dataCurta(p.pagoEm)}
                </span>
              </span>
              <span class="valor">{emReais(p.valor)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ColocarEmTurma({ aluno, aberta, aoFechar }: { aluno: Aluno; aberta: boolean; aoFechar: () => void }) {
  const turmas = (base.value?.turmas ?? []).filter((t) => t.ativa && t.unidadeId === aluno.unidadeId && !t.alunosFixos.includes(aluno.id))
  const situacaoDe = (id: string) => alunosPorId.value.get(id)?.situacao
  const ordenadas = [...turmas].sort((a, b) => ((a.diaDaSemana + 6) % 7) - ((b.diaDaSemana + 6) % 7) || a.inicio.localeCompare(b.inicio))

  const colocar = async (turmaId: string, nome: string) => {
    const r = await colocarAlunoNaTurma(turmaId, aluno.id)
    if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info' })
    const desfazer = r.valor.desfazer
    avisar({
      texto: `${primeiroNome(aluno.nome)} entrou na turma de ${nome.toLowerCase()}.`,
      icone: 'presente',
      ...(desfazer ? { acao: { rotulo: 'Desfazer', executar: () => void desfazer() } } : {}),
    })
    aoFechar()
  }

  return (
    <FolhaInferior
      aberta={aberta}
      aoFechar={aoFechar}
      rotulo="Colocar em turma"
      titulo={primeiroNome(aluno.nome)}
      subtitulo={<span>Turmas de {nomeDaUnidade(aluno.unidadeId)}. A entrada vale a partir de hoje.</span>}
    >
      {ordenadas.length === 0 ? (
        <EstadoVazio icone="grade" rotulo="Sem turma" texto="Não há outra turma nesta unidade." />
      ) : (
        <ul class="lista">
          {ordenadas.map((t, i) => {
            const ocupados = lugaresReservados(t, situacaoDe)
            const cheia = ocupados >= t.capacidade
            return (
              <li key={t.id} class="lista-item" style={{ '--i': i } as JSX.CSSProperties}>
                <span class="lista-item-texto">
                  <span class="lista-item-titulo">{nomeDaTurma(t)}</span>
                  <span class="lista-item-sub">com {primeiroNome(nomeDaEquipe(t.professorId))}</span>
                  <Vagas ocupadas={ocupados} capacidade={t.capacidade} />
                </span>
                <Botao variante="secundario" disabled={cheia} onClick={() => void colocar(t.id, nomeDaTurma(t))}>
                  {cheia ? 'Cheia' : 'Colocar'}
                </Botao>
              </li>
            )
          })}
        </ul>
      )}
    </FolhaInferior>
  )
}
