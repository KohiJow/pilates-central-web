import { useRef, useState } from 'preact/hooks'
import { substituir, voltar } from '../../app/navegacao'
import { pode } from '../../app/perfil'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { Campo } from '../../componentes/Campo'
import { Contador } from '../../componentes/Contador'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { Chip } from '../../componentes/Pilula'
import { Seletor } from '../../componentes/Seletor'
import { alunosPorId, base, nomeDaUnidade, unidades } from '../../dados/estado'
import { salvarTurma } from '../../dados/gestao'
import { quemPodeDarAula } from '../../dominio/equipe'
import { NOME_DO_PAPEL } from '../../dominio/permissoes'
import { semErros } from '../../dominio/resultado'
import type { ErrosDeCampo } from '../../dominio/resultado'
import { plural } from '../../dominio/texto'
import type { DiaDaSemana, Id } from '../../dominio/tipos'
import { DIAS_DA_GRADE, lugaresReservados, NOME_DO_DIA, nomeDaTurma, validarTurma } from '../../dominio/turmas'
import type { CampoTurma, RascunhoTurma } from '../../dominio/turmas'
import { unidadeDasTurmas } from '../alunos/estadoDaLista'
import { focarPrimeiroErro } from '../formulario'

/** Turma nova ou edição de horário, duração, lugares e professor (só a administração). */
export function FormularioDaTurma({ turmaId }: { turmaId?: Id }) {
  const b = base.value
  const anterior = turmaId ? b?.turmas.find((t) => t.id === turmaId) : undefined
  const [r, setR] = useState<RascunhoTurma>(() =>
    anterior
      ? {
          unidadeId: anterior.unidadeId,
          diaDaSemana: anterior.diaDaSemana,
          inicio: anterior.inicio,
          duracaoMin: anterior.duracaoMin,
          capacidade: anterior.capacidade,
          professorId: anterior.professorId,
        }
      : {
          unidadeId: unidadeDasTurmas.peek() ?? unidades.peek()[0]?.id ?? '',
          diaDaSemana: 1,
          inicio: '07:00',
          duracaoMin: 50,
          capacidade: b?.configuracao.capacidadePadrao ?? 5,
          professorId: '',
        },
  )
  const [erros, setErros] = useState<ErrosDeCampo<CampoTurma>>({})
  const formulario = useRef<HTMLFormElement>(null)

  if (!pode('editar-turmas') || !b || (turmaId && !anterior)) {
    return (
      <section class="tela">
        <CabecalhoDeSubtela voltarPara="Turmas" titulo="Turma" />
        <EstadoVazio icone="grade" rotulo="Sem acesso" texto="Só a administração cria e edita turmas." />
      </section>
    )
  }

  const reservados = anterior ? lugaresReservados(anterior, (id) => alunosPorId.value.get(id)?.situacao) : 0
  const professores = quemPodeDarAula(b.equipe, r.unidadeId)
  const mudar = <K extends keyof RascunhoTurma>(campo: K, valor: RascunhoTurma[K]) => {
    setR((atual) => ({ ...atual, [campo]: valor }))
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }))
  }

  const salvar = async (e: Event) => {
    e.preventDefault()
    const novos = validarTurma(r, {
      turmas: b.turmas,
      equipe: b.equipe,
      unidades: b.unidades,
      reservados,
      ...(turmaId ? { turmaId } : {}),
    })
    setErros(novos)
    if (!semErros(novos)) {
      avisar({ texto: 'Confira os campos marcados.', icone: 'info' })
      focarPrimeiroErro(formulario.current)
      return
    }
    const feito = await salvarTurma(r, turmaId)
    if (!feito.ok) return avisar({ texto: feito.mensagem, icone: 'info' })
    avisar({ texto: anterior ? 'Turma atualizada.' : `Turma de ${nomeDaTurma(feito.valor.turma).toLowerCase()} criada.`, icone: 'presente' })
    if (anterior) voltar()
    else substituir('turmas', feito.valor.turma.id)
  }

  return (
    <section class="tela" aria-labelledby="titulo-form-turma">
      <CabecalhoDeSubtela
        voltarPara={anterior ? nomeDaTurma(anterior) : 'Turmas'}
        rotulo={anterior ? `Editar turma, ${nomeDaUnidade(anterior.unidadeId)}` : 'Nova turma'}
        titulo={anterior ? nomeDaTurma(anterior) : 'Nova turma'}
        idTitulo="titulo-form-turma"
      />
      <form ref={formulario} class="formulario pilha" onSubmit={(e) => void salvar(e)} noValidate>
        {anterior ? (
          <p class="chamada-nota">
            <span>
              O dia e a unidade não mudam numa turma que já existe: as aulas que passaram são deste dia. Para mudar o dia,
              crie outra turma e encerre esta.
            </span>
          </p>
        ) : (
          <>
            {unidades.value.length > 1 && (
              <fieldset class="grupo">
                <legend class="campo-rotulo">Unidade</legend>
                <div class="chips" role="radiogroup" aria-label="Unidade">
                  {unidades.value.map((u) => (
                    <Chip key={u.id} papel="radio" ativo={r.unidadeId === u.id} aoTocar={() => mudar('unidadeId', u.id)}>
                      {u.nome}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset class="grupo">
              <legend class="campo-rotulo">Dia da semana</legend>
              <div class="chips chips--dias" role="radiogroup" aria-label="Dia da semana">
                {DIAS_DA_GRADE.map((d: DiaDaSemana) => (
                  <Chip key={d} papel="radio" ativo={r.diaDaSemana === d} aoTocar={() => mudar('diaDaSemana', d)}>
                    {NOME_DO_DIA[d].slice(0, 3)}
                  </Chip>
                ))}
              </div>
            </fieldset>
          </>
        )}
        <Campo rotulo="Começa às" type="time" valor={r.inicio} aoMudar={(v) => mudar('inicio', v)} erro={erros.inicio} />
        <Contador
          rotulo="Duração"
          valor={r.duracaoMin}
          aoMudar={(v) => mudar('duracaoMin', v)}
          min={15}
          max={180}
          passo={5}
          formatar={(v) => `${v} min`}
          erro={erros.duracaoMin}
        />
        <Contador
          rotulo="Lugares"
          valor={r.capacidade}
          aoMudar={(v) => mudar('capacidade', v)}
          min={Math.max(1, reservados)}
          max={20}
          formatar={(v) => plural(v, 'aluno')}
          erro={erros.capacidade}
          ajuda={reservados > 0 ? `${plural(reservados, 'aluno fixo', 'alunos fixos')} hoje: não dá para ter menos lugares que isso.` : undefined}
        />
        <Seletor
          rotulo="Quem dá a aula"
          valor={r.professorId}
          aoMudar={(v) => mudar('professorId', v)}
          opcoes={[
            { valor: '', rotulo: 'Escolha' },
            ...professores.map((m) => ({ valor: m.id, rotulo: m.papel === 'professor' ? m.nome : `${m.nome} (${NOME_DO_PAPEL[m.papel]})` })),
          ]}
          erro={erros.professorId}
        />
        <Botao variante="primario" type="submit" largo icone="presente">
          {anterior ? 'Salvar turma' : 'Criar turma'}
        </Botao>
      </form>
    </section>
  )
}
