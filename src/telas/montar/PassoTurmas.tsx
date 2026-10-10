// A grade da semana do guia: uma tabela de dias por horários em que tocar no horário cria a
// turma (com o professor, a duração e os lugares escolhidos em cima) e tocar de novo tira.
// "Copiar um dia" repete a grade de um dia nos outros (segunda igual a quarta e sexta é o
// comum). As turmas novas ficam no rascunho até "Salvar a grade".
import { useState } from 'preact/hooks'
import { hoje } from '../../app/relogio'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { Contador } from '../../componentes/Contador'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { Icone } from '../../componentes/Icone'
import { Chip } from '../../componentes/Pilula'
import { Seletor } from '../../componentes/Seletor'
import { ehHoraValida, horaFalada } from '../../dominio/datas'
import { quemPodeDarAula } from '../../dominio/equipe'
import { alternarNaGrade, celula, copiarDia, diasDaGrade, linhasDaGrade } from '../../dominio/montagem'
import type { ContextoDaGrade, PadraoDaGrade } from '../../dominio/montagem'
import { iniciais, plural, primeiroNome } from '../../dominio/texto'
import type { DiaDaSemana, Hora, Id, MembroEquipe } from '../../dominio/tipos'
import { NOME_DO_DIA } from '../../dominio/turmas'
import { membro } from '../../app/perfil'
import { mudarRascunho, rascunho, visto } from './estadoDaMontagem'

const abreviado = (d: DiaDaSemana) => NOME_DO_DIA[d].slice(0, 3).toLowerCase()

function nomeNaGrade(m: MembroEquipe | undefined, eu: Id | undefined): string {
  if (!m) return 'sem professor'
  return m.id === eu ? `${primeiroNome(m.nome)} (você)` : primeiroNome(m.nome)
}

/** O padrão das turmas novas, completado com o que faz sentido no estúdio de agora. */
export function padraoDaGrade(): PadraoDaGrade {
  const v = visto.value
  const p = rascunho.value.padrao
  const abertas = v.unidades.filter((u) => u.ativa)
  const unidadeId = abertas.find((u) => u.id === p.unidadeId)?.id ?? abertas[0]?.id ?? ''
  const quem = quemPodeDarAula(v.equipe, unidadeId)
  // quem dá aula: o escolhido; senão o primeiro professor; senão quem está montando
  const professorId =
    quem.find((m) => m.id === p.professorId)?.id ?? quem.find((m) => m.papel === 'professor')?.id ?? membro.value?.id ?? quem[0]?.id ?? ''
  return {
    unidadeId,
    professorId,
    duracaoMin: p.duracaoMin ?? 50,
    capacidade: p.capacidade ?? v.configuracao.capacidadePadrao,
  }
}

export function PassoTurmas() {
  const v = visto.value
  const r = rascunho.value
  const padrao = padraoDaGrade()
  const [mudandoPadrao, setMudandoPadrao] = useState(false)
  const [outroHorario, setOutroHorario] = useState('')
  const [copiarDe, setCopiarDe] = useState<DiaDaSemana>(1)
  const [copiarPara, setCopiarPara] = useState<DiaDaSemana[]>([])
  const eu = membro.value?.id
  const abertas = v.unidades.filter((u) => u.ativa)
  const quem = quemPodeDarAula(v.equipe, padrao.unidadeId)
  const ctx: ContextoDaGrade = { turmas: v.turmas, equipe: v.equipe, unidades: v.unidades, hoje: hoje.value }
  const dias = diasDaGrade(r.comDomingo)
  const daUnidade = (t: { unidadeId: Id }) => t.unidadeId === padrao.unidadeId
  const linhas = linhasDaGrade([...v.turmas.filter((t) => t.ativa && daUnidade(t)), ...r.turmasNovas.filter(daUnidade)], r.horasExtras)
  const variosProfessores = quem.length > 1
  const equipePorId = new Map(v.equipe.map((m) => [m.id, m]))
  const novasDaUnidade = r.turmasNovas.filter(daUnidade).length
  const gravadasDaUnidade = v.turmas.filter((t) => t.ativa && daUnidade(t)).length

  if (abertas.length === 0) {
    return <p class="chamada-nota">Para montar a grade, crie uma unidade antes (o passo Unidades).</p>
  }

  const tocar = (dia: DiaDaSemana, hora: Hora) => {
    const feito = alternarNaGrade(r.turmasNovas, dia, hora, padrao, ctx)
    if (!feito.ok) return avisar({ texto: feito.mensagem, icone: 'info', duracao: 5000 })
    mudarRascunho({ turmasNovas: feito.valor.novas })
  }

  const porOutroHorario = () => {
    if (!ehHoraValida(outroHorario)) return avisar({ texto: 'Escolha o horário, por exemplo 18:30.', icone: 'info' })
    if (!r.horasExtras.includes(outroHorario)) mudarRascunho({ horasExtras: [...r.horasExtras, outroHorario] })
    avisar({ texto: `${horaFalada(outroHorario)} entrou na grade. Toque nos dias.`, icone: 'grade' })
    setOutroHorario('')
  }

  const copiar = () => {
    if (copiarPara.length === 0) return avisar({ texto: 'Escolha para quais dias copiar.', icone: 'info' })
    const feito = copiarDia(r.turmasNovas, padrao.unidadeId, copiarDe, copiarPara, ctx)
    mudarRascunho({ turmasNovas: feito.novas })
    setCopiarPara([])
    const puladas = feito.puladas ? ` ${plural(feito.puladas, 'horário já estava ocupado', 'horários já estavam ocupados')} ou chocava com outra turma.` : ''
    avisar({ texto: `${plural(feito.copiadas, 'turma copiada', 'turmas copiadas')}.${puladas}`, icone: 'copiar', duracao: puladas ? 6000 : 3500 })
  }

  return (
    <div class="pilha guia-grade">
      {abertas.length > 1 && (
        <fieldset class="grupo">
          <legend class="campo-rotulo">Unidade</legend>
          <div class="chips" role="radiogroup" aria-label="Unidade">
            {abertas.map((u) => (
              <Chip key={u.id} papel="radio" ativo={u.id === padrao.unidadeId} aoTocar={() => mudarRascunho({ padrao: { ...r.padrao, unidadeId: u.id } })}>
                {u.nome}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset class="grupo">
        <legend class="campo-rotulo">Quem dá as turmas que você tocar</legend>
        <div class="chips" role="radiogroup" aria-label="Quem dá a aula">
          {quem.map((m) => (
            <Chip key={m.id} papel="radio" ativo={m.id === padrao.professorId} aoTocar={() => mudarRascunho({ padrao: { ...r.padrao, professorId: m.id } })}>
              {nomeNaGrade(m, eu)}
            </Chip>
          ))}
        </div>
      </fieldset>
      <div class="guia-padrao">
        <p class="texto-secundario">
          Cada turma nova: {padrao.duracaoMin} min, {plural(padrao.capacidade, 'lugar', 'lugares')}.
        </p>
        <Botao variante="terciario" icone="editar" onClick={() => setMudandoPadrao(true)}>
          Mudar
        </Botao>
      </div>
      <p class="texto-secundario">Toque no horário para criar a turma; toque de novo para tirar.</p>

      <div class="grade-visual-caixa">
        <table class="grade-visual" aria-label="Grade da semana">
          <thead>
            <tr>
              <th scope="col">
                <span class="so-leitor">Horário</span>
              </th>
              {dias.map((d) => (
                <th key={d} scope="col" class="micro">
                  <abbr title={NOME_DO_DIA[d]}>{abreviado(d)}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((hora) => (
              <tr key={hora}>
                <th scope="row" class="grade-visual-hora">
                  {horaFalada(hora)}
                </th>
                {dias.map((dia) => {
                  const c = celula(r.turmasNovas, ctx, padrao.unidadeId, dia, hora)
                  const quemDa = c.tipo === 'gravada' ? c.turma.professorId : c.tipo === 'nova' ? c.rascunho.professorId : ''
                  const pessoa = equipePorId.get(quemDa)
                  const rotulo =
                    c.tipo === 'vazia'
                      ? `${NOME_DO_DIA[dia]}, ${horaFalada(hora)}: criar turma`
                      : `${NOME_DO_DIA[dia]}, ${horaFalada(hora)}: turma ${c.tipo === 'nova' ? 'nova' : 'que já existe'} com ${nomeNaGrade(pessoa, eu)}`
                  return (
                    <td key={dia}>
                      <button
                        type="button"
                        class={`grade-visual-celula tocavel grade-visual-celula--${c.tipo}`}
                        aria-label={rotulo}
                        aria-pressed={c.tipo === 'vazia' ? false : true}
                        onClick={() => tocar(dia, hora)}
                      >
                        {c.tipo !== 'vazia' &&
                          (variosProfessores ? <span aria-hidden="true">{iniciais(pessoa?.nome ?? '?')}</span> : <Icone nome="presente" tamanho={20} traco={2} />)}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="texto-secundario" aria-live="polite">
        {plural(novasDaUnidade, 'turma nova', 'turmas novas')}
        {gravadasDaUnidade ? `, ${plural(gravadasDaUnidade, 'que já existia', 'que já existiam')}` : ''} nesta unidade.
      </p>

      <div class="chips">
        <Chip ativo={r.comDomingo} aoTocar={() => mudarRascunho({ comDomingo: !r.comDomingo })}>
          Tem aula no domingo
        </Chip>
      </div>

      <section class="secao" aria-labelledby="titulo-outro-horario">
        <h2 id="titulo-outro-horario" class="micro">
          Horário quebrado (18h30, 7h15)
        </h2>
        <div class="guia-linha">
          <Campo rotulo="Outro horário" type="time" valor={outroHorario} aoMudar={setOutroHorario} />
          <Botao variante="secundario" icone="adicionar" onClick={porOutroHorario}>
            Pôr na grade
          </Botao>
        </div>
      </section>

      <section class="secao" aria-labelledby="titulo-copiar">
        <h2 id="titulo-copiar" class="micro">
          Copiar um dia para outros
        </h2>
        <Seletor
          rotulo="Copiar a grade de"
          valor={String(copiarDe)}
          aoMudar={(x) => setCopiarDe(Number(x) as DiaDaSemana)}
          opcoes={dias.map((d) => ({ valor: String(d), rotulo: NOME_DO_DIA[d] }))}
        />
        <div class="chips" role="group" aria-label="Para os dias">
          {dias
            .filter((d) => d !== copiarDe)
            .map((d) => (
              <Chip
                key={d}
                ativo={copiarPara.includes(d)}
                aoTocar={() => setCopiarPara(copiarPara.includes(d) ? copiarPara.filter((x) => x !== d) : [...copiarPara, d])}
              >
                {abreviado(d)}
              </Chip>
            ))}
        </div>
        <Botao variante="secundario" icone="copiar" largo onClick={copiar}>
          Copiar {NOME_DO_DIA[copiarDe].toLowerCase()}
          {copiarPara.length ? ` para ${copiarPara.map(abreviado).join(', ')}` : ''}
        </Botao>
      </section>

      <FolhaInferior
        aberta={mudandoPadrao}
        aoFechar={() => setMudandoPadrao(false)}
        rotulo="Turmas novas"
        titulo="Como são as turmas"
        rodape={
          <Botao variante="primario" largo icone="presente" onClick={() => setMudandoPadrao(false)}>
            Pronto
          </Botao>
        }
      >
        <div class="pilha formulario">
          <p class="texto-secundario">Vale para as turmas que você tocar daqui em diante. Uma turma diferente você ajusta depois, em Turmas.</p>
          <Contador
            rotulo="Duração"
            valor={padrao.duracaoMin}
            aoMudar={(x) => mudarRascunho({ padrao: { ...r.padrao, duracaoMin: x } })}
            min={15}
            max={180}
            passo={5}
            formatar={(x) => `${x} min`}
          />
          <Contador
            rotulo="Lugares"
            valor={padrao.capacidade}
            aoMudar={(x) => mudarRascunho({ padrao: { ...r.padrao, capacidade: x } })}
            min={1}
            max={20}
            formatar={(x) => plural(x, 'aluno')}
          />
        </div>
      </FolhaInferior>
    </div>
  )
}
