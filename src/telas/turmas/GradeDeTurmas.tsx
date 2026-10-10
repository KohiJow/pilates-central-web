import type { JSX } from 'preact'
import { useEffect } from 'preact/hooks'
import { abrir } from '../../app/navegacao'
import { membro, pode } from '../../app/perfil'
import { hoje } from '../../app/relogio'
import { Botao } from '../../componentes/Botao'
import { EsqueletoDeLista } from '../../componentes/Esqueleto'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { Chevrons } from '../../componentes/Icone'
import { Chip } from '../../componentes/Pilula'
import { Vagas } from '../../componentes/Vagas'
import { participacoesEntre } from '../../dados/consultas'
import { alunosPorId, base, cargaRecente, garantirIntervalo, intervaloCarregado, nomeDaEquipe, situacao } from '../../dados/estado'
import { horaDe, horaFalada, minutosDe } from '../../dominio/datas'
import { agruparPorTurma, frequencia } from '../../dominio/frequencia'
import { primeiroNome } from '../../dominio/texto'
import type { Turma } from '../../dominio/tipos'
import { gradeDaSemana, lugaresReservados, NOME_DO_DIA } from '../../dominio/turmas'
import { momento } from '../../app/relogio'
import { unidadesVisiveis } from '../alunos/ListaDeAlunos'
import { unidadeDasTurmas } from '../alunos/estadoDaLista'

/** Grade da semana por unidade: cada dia com as turmas em ordem de horário. */
export function GradeDeTurmas() {
  const visiveis = unidadesVisiveis()
  const unidadeId = visiveis.find((u) => u.id === unidadeDasTurmas.value)?.id ?? visiveis[0]?.id
  const grade = unidadeId ? gradeDaSemana(base.value?.turmas ?? [], unidadeId) : []
  const meu = membro.value?.id

  // frequência do mês por turma, numa conta só
  const inicioDoMes = `${hoje.value.slice(0, 7)}-01`
  const pronto = intervaloCarregado(inicioDoMes, hoje.value)
  useEffect(() => {
    if (!pronto) void garantirIntervalo(inicioDoMes, hoje.peek())
  }, [inicioDoMes, pronto])
  const porTurma = pronto ? agruparPorTurma(participacoesEntre(inicioDoMes, hoje.value)) : new Map()

  // o cabeçalho (título e seções) fica em Alunos.tsx: só este conteúdo troca entre as seções
  return (
    <div class="tela">
      {visiveis.length > 1 && (
        <div class="chips" role="radiogroup" aria-label="Unidade">
          {visiveis.map((u) => (
            <Chip key={u.id} papel="radio" ativo={u.id === unidadeId} aoTocar={() => (unidadeDasTurmas.value = u.id)}>
              {u.nome}
            </Chip>
          ))}
        </div>
      )}

      {pode('editar-turmas') && (
        <Botao variante="primario" icone="adicionar" largo onClick={() => abrir('turmas', 'nova')}>
          Nova turma
        </Botao>
      )}

      {situacao.value !== 'pronto' ? (
        <EsqueletoDeLista itens={5} altura={80} />
      ) : grade.length === 0 ? (
        <EstadoVazio icone="grade" rotulo="Sem turmas" texto="Esta unidade ainda não tem turma." />
      ) : (
        grade.map((dia) => (
          <section key={dia.dia} class="secao" aria-labelledby={`dia-${dia.dia}`}>
            <h2 id={`dia-${dia.dia}`} class="micro">
              {NOME_DO_DIA[dia.dia]}
            </h2>
            <ul class={`lista${cargaRecente.value ? ' cascata' : ''}`}>
              {dia.turmas.map((t, i) => (
                <li key={t.id} style={{ '--i': i } as JSX.CSSProperties}>
                  <LinhaDeTurma turma={t} minha={t.professorId === meu} percentual={frequencia(porTurma.get(t.id) ?? [], momento.value).percentual} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

function LinhaDeTurma({ turma, minha, percentual }: { turma: Turma; minha: boolean; percentual: number | null }) {
  const ocupados = lugaresReservados(turma, (id) => alunosPorId.value.get(id)?.situacao)
  const fim = horaFalada(horaDe(minutosDe(turma.inicio) + turma.duracaoMin))
  return (
    <button
      type="button"
      class="lista-item tocavel"
      onClick={() => abrir('turmas', turma.id)}
      aria-label={`${NOME_DO_DIA[turma.diaDaSemana]}, ${horaFalada(turma.inicio)} com ${primeiroNome(nomeDaEquipe(turma.professorId))}. Abrir turma`}
    >
      <span class="linha-aula">
        <span class="linha-aula-hora">{horaFalada(turma.inicio)}</span>
        <span class="linha-aula-texto">
          <span class="lista-item-titulo">
            {primeiroNome(nomeDaEquipe(turma.professorId))}
            {minha ? ' (você)' : ''}
          </span>
          <span class="linha-aula-sub linha-aula-sub--quebra">
            até {fim}
            {percentual !== null ? `, frequência ${percentual}%` : ''}
          </span>
          <Vagas ocupadas={ocupados} capacidade={turma.capacidade} />
        </span>
      </span>
      <Chevrons tamanho={16} />
    </button>
  )
}
