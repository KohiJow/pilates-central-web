import type { JSX } from 'preact'
import { abrir } from '../../app/navegacao'
import { membro, pode } from '../../app/perfil'
import { Avatar } from '../../componentes/Avatar'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { EsqueletoDeLista } from '../../componentes/Esqueleto'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { Chevrons } from '../../componentes/Icone'
import { Chip, Pilula } from '../../componentes/Pilula'
import { ausenciasPorAluno } from '../../dados/consultas'
import { base, cargaRecente, nomeDaUnidade, situacao, unidades } from '../../dados/estado'
import { conferirPlano, filtrarAlunos, NOME_DA_SITUACAO } from '../../dominio/alunos'
import { plural } from '../../dominio/texto'
import type { Aluno, SituacaoAluno } from '../../dominio/tipos'
import { CabecaDeAlunos } from './CabecaDeAlunos'
import { buscaDeAlunos, situacaoDosAlunos, unidadeDosAlunos } from './estadoDaLista'

const SITUACOES: { id: SituacaoAluno | null; rotulo: string }[] = [
  { id: null, rotulo: 'Ativos' },
  { id: 'pausado', rotulo: 'Pausados' },
  { id: 'inativo', rotulo: 'Arquivados' },
]

/** As unidades que a pessoa vê: a administração vê todas; o professor, as dele. */
export function unidadesVisiveis() {
  const m = membro.value
  return unidades.value.filter((u) => pode('ver-todas-as-unidades') || m?.unidades.includes(u.id))
}

export function ListaDeAlunos() {
  const visiveis = unidadesVisiveis()
  const unidadeId = visiveis.find((u) => u.id === unidadeDosAlunos.value)?.id
  const idsVisiveis = new Set(visiveis.map((u) => u.id))
  const todos = (base.value?.alunos ?? []).filter((a) => idsVisiveis.has(a.unidadeId))
  const lista = filtrarAlunos(todos, {
    busca: buscaDeAlunos.value,
    ...(unidadeId ? { unidadeId } : {}),
    ...(situacaoDosAlunos.value ? { situacao: situacaoDosAlunos.value } : {}),
  })
  const carregando = situacao.value !== 'pronto'

  return (
    <section class="tela" aria-labelledby="titulo-alunos">
      <CabecaDeAlunos atual="lista" idTitulo="titulo-alunos" />

      <div class="pilha">
        <Campo
          rotulo="Buscar aluno"
          icone="busca"
          type="search"
          valor={buscaDeAlunos.value}
          aoMudar={(v) => (buscaDeAlunos.value = v)}
          placeholder="Nome ou final do telefone"
          autocomplete="off"
        />
        {visiveis.length > 1 && (
          <div class="chips" role="radiogroup" aria-label="Unidade">
            <Chip papel="radio" ativo={!unidadeId} aoTocar={() => (unidadeDosAlunos.value = null)}>
              Todas
            </Chip>
            {visiveis.map((u) => (
              <Chip key={u.id} papel="radio" ativo={u.id === unidadeId} aoTocar={() => (unidadeDosAlunos.value = u.id)}>
                {u.nome}
              </Chip>
            ))}
          </div>
        )}
        <div class="chips" role="radiogroup" aria-label="Situação">
          {SITUACOES.map((s) => (
            <Chip key={s.rotulo} papel="radio" ativo={situacaoDosAlunos.value === s.id} aoTocar={() => (situacaoDosAlunos.value = s.id)}>
              {s.rotulo}
            </Chip>
          ))}
        </div>
      </div>

      {pode('editar-alunos') && (
        <Botao variante="primario" icone="adicionar" largo onClick={() => abrir('novo')}>
          Novo aluno
        </Botao>
      )}

      {carregando ? (
        <EsqueletoDeLista itens={6} altura={64} />
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone="alunos"
          rotulo="Ninguém aqui"
          texto={buscaDeAlunos.value ? `Nenhum aluno encontrado para "${buscaDeAlunos.value}".` : 'Nenhum aluno nesta lista.'}
        />
      ) : (
        <div class="secao">
          <p class="texto-secundario" aria-live="polite">
            {plural(lista.length, 'aluno')}
          </p>
          <ul class={`lista${cargaRecente.value ? ' cascata' : ''}`}>
            {lista.map((a, i) => (
              <li key={a.id} style={{ '--i': i } as JSX.CSSProperties}>
                <LinhaDeAluno aluno={a} mostrarUnidade={!unidadeId && visiveis.length > 1} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function LinhaDeAluno({ aluno, mostrarUnidade }: { aluno: Aluno; mostrarUnidade: boolean }) {
  const ausencias = ausenciasPorAluno.value.get(aluno.id) ?? 0
  const limite = base.value?.configuracao.alertaAusenciasSeguidas ?? 3
  const plano = conferirPlano(aluno, base.value?.turmas ?? [])
  const partes = [mostrarUnidade ? nomeDaUnidade(aluno.unidadeId) : '', `${aluno.vezesPorSemana}x por semana`].filter(Boolean)
  return (
    <button type="button" class="lista-item tocavel" onClick={() => abrir(aluno.id)} data-aluno={aluno.id}>
      <Avatar nome={aluno.nome} />
      <span class="lista-item-texto">
        <span class="lista-item-titulo">{aluno.nome}</span>
        <span class="lista-item-sub">{partes.join(', ')}</span>
        {(aluno.situacao !== 'ativo' || ausencias >= limite || plano.aviso) && (
          <span class="lista-item-pilulas">
            {aluno.situacao !== 'ativo' && <Pilula>{NOME_DA_SITUACAO[aluno.situacao]}</Pilula>}
            {aluno.situacao === 'ativo' && ausencias >= limite && (
              <Pilula tom="alerta">{plural(ausencias, 'ausência seguida', 'ausências seguidas')}</Pilula>
            )}
            {aluno.situacao === 'ativo' && plano.aviso && (
              <Pilula>
                {plano.turmas} de {plano.vezes} turmas
              </Pilula>
            )}
          </span>
        )}
      </span>
      <Chevrons tamanho={16} />
    </button>
  )
}
