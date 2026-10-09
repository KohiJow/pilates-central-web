import type { JSX } from 'preact'
import { abrir } from '../../app/navegacao'
import { membro, pode } from '../../app/perfil'
import { Avatar } from '../../componentes/Avatar'
import { Botao } from '../../componentes/Botao'
import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { Chevrons } from '../../componentes/Icone'
import { Pilula } from '../../componentes/Pilula'
import { base, nomeDaUnidade } from '../../dados/estado'
import { ordenarEquipe } from '../../dominio/equipe'
import { ehAdministracao, NOME_DO_PAPEL } from '../../dominio/permissoes'
import { listaFalada } from '../../dominio/texto'
import type { MembroEquipe } from '../../dominio/tipos'
import { SemAcesso } from './SemAcesso'

/** Quem é quem: responsável, administração e professores, cada um com o papel escrito. */
export function Equipe() {
  if (!pode('convidar-professor')) return <SemAcesso titulo="Equipe" texto="Só a administração vê e muda a equipe." />
  const equipe = ordenarEquipe(base.value?.equipe ?? [])
  const grupos: [string, MembroEquipe[]][] = [
    ['Administração', equipe.filter((m) => m.ativo && ehAdministracao(m.papel))],
    ['Professores', equipe.filter((m) => m.ativo && m.papel === 'professor')],
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

function LinhaDoMembro({ m }: { m: MembroEquipe }) {
  const eu = membro.value?.id === m.id
  return (
    <button type="button" class="lista-item tocavel" onClick={() => abrir('equipe', m.id)} data-membro={m.id}>
      <Avatar nome={m.nome} />
      <span class="lista-item-texto">
        <span class="lista-item-titulo">
          {m.nome}
          {eu ? ' (você)' : ''}
        </span>
        <span class="lista-item-sub">
          {NOME_DO_PAPEL[m.papel]}
          {m.papel === 'professor' && m.unidades.length > 0 ? `, ${listaFalada(m.unidades.map(nomeDaUnidade))}` : ''}
        </span>
        {m.convite && (
          <span class="lista-item-pilulas">
            <Pilula tom="acento">convite pendente</Pilula>
          </span>
        )}
      </span>
      <Chevrons tamanho={16} />
    </button>
  )
}
