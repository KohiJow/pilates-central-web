import type { JSX } from 'preact'
import { momento } from '../app/relogio'
import { Card } from '../componentes/Card'
import { Pilula } from '../componentes/Pilula'
import { Vagas } from '../componentes/Vagas'
import { nomeDaEquipe, nomeDaUnidade, nomeDoAluno } from '../dados/estado'
import { faseDaAula } from '../dominio/agenda'
import { horaFalada } from '../dominio/datas'
import { contarMarcacoes } from '../dominio/presenca'
import { listaFalada, plural, primeiroNome } from '../dominio/texto'
import type { Aula } from '../dominio/tipos'
import { abrirAula } from './chamada/aulaAberta'
import { tituloDaAula } from './chamada/textos'

const MAX_NOMES = 4

function linhaDeAlunos(aula: Aula): string {
  const vem = aula.participantes.filter((p) => p.marcacao !== 'avisou').map((p) => primeiroNome(nomeDoAluno(p.alunoId)))
  if (vem.length === 0) return 'Ninguém marcado'
  if (vem.length <= MAX_NOMES) return listaFalada(vem)
  return `${vem.slice(0, MAX_NOMES - 1).join(', ')} e mais ${vem.length - (MAX_NOMES - 1)}`
}

interface Props {
  aula: Aula
  mostrarUnidade?: boolean
  indice?: number
}

export function CartaoDeAula({ aula, mostrarUnidade, indice = 0 }: Props) {
  const fase = faseDaAula(aula, momento.value)
  const contagem = contarMarcacoes(aula)
  const reposicoes = aula.participantes.filter((p) => p.origem === 'reposicao').length
  const cancelada = Boolean(aula.cancelamento)
  const professor = primeiroNome(nomeDaEquipe(aula.professorId))
  const chamadaPendente = !cancelada && fase !== 'futura' && contagem.pendente > 0

  return (
    <Card
      variante={cancelada ? 'recuado' : 'claro'}
      class={`cartao-aula${cancelada ? ' cartao-aula--cancelada' : ''}`}
      aoTocar={() => abrirAula(aula.id)}
      rotulo={`Aula das ${tituloDaAula(aula)}, com ${professor}. Abrir chamada`}
      style={{ '--i': indice } as JSX.CSSProperties}
    >
      <span class="cartao-aula-hora">
        <strong>{horaFalada(aula.inicio)}</strong>
        <span>{aula.duracaoMin} min</span>
      </span>
      <span class="cartao-aula-info">
        <span class="cartao-aula-professor">
          {professor}
          {mostrarUnidade ? `, ${nomeDaUnidade(aula.unidadeId)}` : ''}
        </span>
        <span class="cartao-aula-alunos">{cancelada ? (aula.cancelamento?.observacao || 'Aula cancelada') : linhaDeAlunos(aula)}</span>
      </span>
      <span class="cartao-aula-rodape">
        {cancelada ? (
          <Pilula tom="alerta">{aula.cancelamento?.motivo === 'feriado' ? 'Feriado' : 'Cancelada'}</Pilula>
        ) : (
          <Vagas ocupadas={aula.ocupadas} capacidade={aula.capacidade} />
        )}
        {fase === 'agora' && !cancelada && <Pilula tom="acento">agora</Pilula>}
        {contagem.avisou > 0 && !cancelada && <Pilula>{plural(contagem.avisou, 'avisou', 'avisaram')}</Pilula>}
        {reposicoes > 0 && !cancelada && <Pilula>{plural(reposicoes, 'reposição', 'reposições')}</Pilula>}
        {chamadaPendente && <Pilula tom="alerta">chamada pendente</Pilula>}
        {!cancelada && fase === 'encerrada' && contagem.pendente === 0 && aula.participantes.length > 0 && (
          <Pilula tom="sucesso">chamada feita</Pilula>
        )}
      </span>
    </Card>
  )
}
