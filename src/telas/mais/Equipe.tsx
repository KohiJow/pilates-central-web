import type { JSX } from 'preact'
import { abrir } from '../../app/navegacao'
import { membro, pode } from '../../app/perfil'
import { agoraDoApp } from '../../app/relogio'
import { Avatar } from '../../componentes/Avatar'
import { Botao } from '../../componentes/Botao'
import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { Chevrons } from '../../componentes/Icone'
import { Pilula } from '../../componentes/Pilula'
import { base, nomeDaUnidade } from '../../dados/estado'
import { CONFIGURACAO_PADRAO } from '../../dominio/configuracao'
import { conviteVencido, prazoDoConvite } from '../../dominio/convites'
import { dataCurta } from '../../dominio/datas'
import { ordenarEquipe } from '../../dominio/equipe'
import { ehAdministracao, NOME_DO_PAPEL } from '../../dominio/permissoes'
import { listaFalada } from '../../dominio/texto'
import type { MembroEquipe } from '../../dominio/tipos'
import { SemAcesso } from './SemAcesso'

/** Quem é quem: convites pendentes (com a data), responsável, administração e professores, cada um com o papel escrito. */
export function Equipe() {
  if (!pode('convidar-professor')) return <SemAcesso titulo="Equipe" texto="Só a administração vê e muda a equipe." />
  const equipe = ordenarEquipe(base.value?.equipe ?? [])
  const pendente = (m: MembroEquipe) => m.ativo && m.convite !== undefined
  const grupos: [string, MembroEquipe[]][] = [
    ['Convites pendentes', equipe.filter(pendente)],
    ['Administração', equipe.filter((m) => m.ativo && !m.convite && ehAdministracao(m.papel))],
    ['Professores', equipe.filter((m) => m.ativo && !m.convite && m.papel === 'professor')],
    ['Sem acesso', equipe.filter((m) => !m.ativo)],
  ]
  return (
    <section class="tela" aria-labelledby="titulo-equipe">
      <CabecalhoDeSubtela voltarPara="Mais" rotulo="Estúdio" titulo="Equipe" idTitulo="titulo-equipe" />
      <Botao variante="primario" icone="convidar" largo onClick={() => abrir('equipe', 'convidar')}>
        Convidar pessoa
      </Botao>
      {grupos
        .filter(([, lista]) => lista.length > 0)
        .map(([titulo, lista]) => (
          <section key={titulo} class="secao" aria-label={titulo}>
            <h2 class="micro">{titulo}</h2>
            <ul class="lista">
              {lista.map((m, i) => (
                <li key={m.id} style={{ '--i': i } as JSX.CSSProperties}>
                  <LinhaDoMembro m={m} />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </section>
  )
}

/** "convite pendente", "convite vencido" ou "convite revogado", conforme o acesso e o prazo. */
export function situacaoDoConvite(m: MembroEquipe, validadeDias: number, agora: Date): 'pendente' | 'vencido' | 'revogado' | null {
  if (!m.convite) return null
  if (!m.ativo) return 'revogado'
  return conviteVencido(m.convite.enviadoEm, validadeDias, agora) ? 'vencido' : 'pendente'
}

function LinhaDoMembro({ m }: { m: MembroEquipe }) {
  const eu = membro.value?.id === m.id
  const validade = base.value?.configuracao.validadeDoConviteDias ?? CONFIGURACAO_PADRAO.validadeDoConviteDias
  const convite = situacaoDoConvite(m, validade, agoraDoApp())
  const sub =
    m.convite && m.ativo
      ? `${NOME_DO_PAPEL[m.papel]}, registrado em ${dataCurta(m.convite.enviadoEm.slice(0, 10))}, ${prazoDoConvite(m.convite.enviadoEm, validade, agoraDoApp())}`
      : `${NOME_DO_PAPEL[m.papel]}${m.papel === 'professor' && m.unidades.length > 0 ? `, ${listaFalada(m.unidades.map(nomeDaUnidade))}` : ''}`
  return (
    <button type="button" class="lista-item tocavel" onClick={() => abrir('equipe', m.id)} data-membro={m.id}>
      <Avatar nome={m.nome} />
      <span class="lista-item-texto">
        <span class="lista-item-titulo">
          {m.nome}
          {eu ? ' (você)' : ''}
        </span>
        <span class="lista-item-sub">{sub}</span>
        {convite && (
          <span class="lista-item-pilulas">
            <Pilula tom={convite === 'pendente' ? 'acento' : 'alerta'}>convite {convite}</Pilula>
          </span>
        )}
      </span>
      <Chevrons tamanho={16} />
    </button>
  )
}
