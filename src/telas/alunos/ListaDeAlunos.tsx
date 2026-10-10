import type { JSX } from 'preact'
import { abrir } from '../../app/navegacao'
import { membro, pode } from '../../app/perfil'
import { Avatar } from '../../componentes/Avatar'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { EsqueletoDeLista } from '../../componentes/Esqueleto'
import { useEmPartes } from '../../componentes/emPartes'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { Chevrons } from '../../componentes/Icone'
import { Chip, Pilula } from '../../componentes/Pilula'
import { ausenciasPorAluno } from '../../dados/consultas'
import { base, cargaRecente, nomeDaUnidade, situacao, unidades } from '../../dados/estado'
import { conferirPlano, filtrarAlunos, NOME_DA_SITUACAO } from '../../dominio/alunos'
import { plural } from '../../dominio/texto'
import type { Aluno, SituacaoAluno } from '../../dominio/tipos'
import { buscaDeAlunos, situacaoDosAlunos, unidadeDosAlunos } from './estadoDaLista'

// "Ativos" é só quem está vindo às aulas: o mesmo número que o Financeiro mostra como alunos ativos
const SITUACOES: { id: SituacaoAluno; rotulo: string }[] = [
  { id: 'ativo', rotulo: 'Ativos' },
  { id: 'pausado', rotulo: 'Pausados' },
  { id: 'inativo', rotulo: 'Arquivados' },
]

const NOME_DA_LISTA: Record<SituacaoAluno, string> = { ativo: 'ativo', pausado: 'pausado', inativo: 'arquivado' }

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
  const filtro = { busca: buscaDeAlunos.value, ...(unidadeId ? { unidadeId } : {}) }
  const lista = filtrarAlunos(todos, { ...filtro, situacao: situacaoDosAlunos.value })
  // busca sem resultado aqui: diz em que outra lista a pessoa está, com um toque para ir até lá
  const emOutraLista =
    lista.length === 0 && buscaDeAlunos.value
      ? SITUACOES.filter((s) => s.id !== situacaoDosAlunos.value)
          .map((s) => ({ ...s, quantos: filtrarAlunos(todos, { ...filtro, situacao: s.id }).length }))
          .find((s) => s.quantos > 0)
      : undefined
  const carregando = situacao.value !== 'pronto'
  // a lista entra em partes: os primeiros com a tela, o resto nos quadros seguintes
  const visiveisAgora = useEmPartes(lista.length)

  // o cabeçalho (título e seções) fica em Alunos.tsx: só este conteúdo troca entre as seções
  return (
    <div class="tela">
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

      {pode('editar-alunos') && todos.length > 0 && (
        <div class="linha-acoes">
          <Botao variante="primario" icone="adicionar" onClick={() => abrir('novo')}>
            Novo aluno
          </Botao>
          <Botao variante="secundario" icone="planilha" onClick={() => abrir('importar')}>
            Importar
          </Botao>
        </div>
      )}

      {carregando ? (
        <EsqueletoDeLista itens={6} altura={64} />
      ) : todos.length === 0 && !buscaDeAlunos.value ? (
        // estúdio sem nenhum aluno: o caminho mais curto é a planilha
        <EstadoVazio
          icone="alunos"
          rotulo="Nenhum aluno ainda"
          texto={pode('editar-alunos') ? 'Cole a lista da planilha de uma vez, ou cadastre um a um.' : 'A administração ainda não cadastrou os alunos.'}
        >
          {pode('editar-alunos') && (
            <>
              <Botao variante="primario" icone="planilha" onClick={() => abrir('importar')}>
                Importar de uma planilha
              </Botao>
              <Botao variante="secundario" icone="adicionar" onClick={() => abrir('novo')}>
                Cadastrar um aluno
              </Botao>
            </>
          )}
        </EstadoVazio>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone="alunos"
          rotulo="Ninguém aqui"
          texto={
            emOutraLista
              ? `Nenhum aluno ${NOME_DA_LISTA[situacaoDosAlunos.value]} com "${buscaDeAlunos.value}". Achei em ${emOutraLista.rotulo}.`
              : buscaDeAlunos.value
                ? `Nenhum aluno encontrado para "${buscaDeAlunos.value}". Confira o nome ou busque pelo final do telefone.`
                : 'Nenhum aluno nesta lista.'
          }
        >
          {emOutraLista && (
            <Botao variante="secundario" onClick={() => (situacaoDosAlunos.value = emOutraLista.id)}>
              Ver em {emOutraLista.rotulo} ({emOutraLista.quantos})
            </Botao>
          )}
        </EstadoVazio>
      ) : (
        <div class="secao">
          <p class="texto-secundario" aria-live="polite">
            {plural(lista.length, 'aluno')}
          </p>
          <ul class={`lista${cargaRecente.value ? ' cascata' : ''}`}>
            {lista.slice(0, visiveisAgora).map((a, i) => (
              <li key={a.id} style={{ '--i': i } as JSX.CSSProperties}>
                <LinhaDeAluno aluno={a} mostrarUnidade={!unidadeId && visiveis.length > 1} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
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
