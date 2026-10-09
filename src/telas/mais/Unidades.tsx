import { useEffect, useState } from 'preact/hooks'
import { pode } from '../../app/perfil'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { Campo } from '../../componentes/Campo'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { Chevrons } from '../../componentes/Icone'
import { Pilula } from '../../componentes/Pilula'
import { base } from '../../dados/estado'
import { mudarAberturaDaUnidade, salvarUnidade } from '../../dados/gestao'
import { semErros } from '../../dominio/resultado'
import type { ErrosDeCampo } from '../../dominio/resultado'
import { plural } from '../../dominio/texto'
import type { Unidade } from '../../dominio/tipos'
import { validarUnidade } from '../../dominio/unidades'
import type { CampoUnidade, RascunhoUnidade } from '../../dominio/unidades'
import { SemAcesso } from './SemAcesso'

type Edicao = { unidade: Unidade | null } | null

/** Unidades do estúdio: abrir uma nova, mudar nome e endereço, fechar quando não tiver mais ninguém. */
export function Unidades() {
  const [edicao, setEdicao] = useState<Edicao>(null)
  const b = base.value
  if (!pode('editar-unidades') || !b) return <SemAcesso titulo="Unidades" texto="Só a administração cuida das unidades." />
  const ordenadas = [...b.unidades].sort((x, y) => Number(y.ativa) - Number(x.ativa) || x.nome.localeCompare(y.nome, 'pt-BR'))

  return (
    <section class="tela" aria-labelledby="titulo-unidades">
      <CabecalhoDeSubtela voltarPara="Mais" rotulo="Estúdio" titulo="Unidades" idTitulo="titulo-unidades" />
      <Botao variante="primario" icone="adicionar" largo onClick={() => setEdicao({ unidade: null })}>
        Nova unidade
      </Botao>
      <ul class="lista">
        {ordenadas.map((u) => {
          const alunos = b.alunos.filter((a) => a.unidadeId === u.id && a.situacao !== 'inativo').length
          const turmas = b.turmas.filter((t) => t.unidadeId === u.id && t.ativa).length
          return (
            <li key={u.id}>
              <button type="button" class="lista-item tocavel" onClick={() => setEdicao({ unidade: u })}>
                <span class="lista-item-texto">
                  <span class="lista-item-titulo">{u.nome}</span>
                  <span class="lista-item-sub">{u.endereco || 'Sem endereço'}</span>
                  <span class="lista-item-sub">
                    {plural(alunos, 'aluno')}, {plural(turmas, 'turma')}
                  </span>
                </span>
                {!u.ativa && <Pilula>fechada</Pilula>}
                <Chevrons tamanho={16} />
              </button>
            </li>
          )
        })}
      </ul>
      <FolhaDaUnidade edicao={edicao} aoFechar={() => setEdicao(null)} />
    </section>
  )
}

function FolhaDaUnidade({ edicao, aoFechar }: { edicao: Edicao; aoFechar: () => void }) {
  const [ultima, setUltima] = useState<Unidade | null>(null)
  const [r, setR] = useState<RascunhoUnidade>({ nome: '', endereco: '' })
  const [erros, setErros] = useState<ErrosDeCampo<CampoUnidade>>({})
  useEffect(() => {
    if (!edicao) return
    setUltima(edicao.unidade)
    setR({ nome: edicao.unidade?.nome ?? '', endereco: edicao.unidade?.endereco ?? '' })
    setErros({})
  }, [edicao])

  const salvar = async () => {
    const novos = validarUnidade(r, base.peek()?.unidades ?? [], ultima?.id)
    setErros(novos)
    if (!semErros(novos)) return
    const feito = await salvarUnidade(r, ultima?.id)
    if (!feito.ok) return avisar({ texto: feito.mensagem, icone: 'info' })
    avisar({ texto: ultima ? 'Unidade atualizada.' : `Unidade ${feito.valor.unidade.nome} criada.`, icone: 'presente' })
    aoFechar()
  }
  const abrirOuFechar = async () => {
    if (!ultima) return
    const feito = await mudarAberturaDaUnidade(ultima.id, !ultima.ativa)
    if (!feito.ok) return avisar({ texto: feito.mensagem, icone: 'info' })
    const desfazer = feito.valor.desfazer
    avisar({
      texto: ultima.ativa ? `Unidade ${ultima.nome} fechada.` : `Unidade ${ultima.nome} aberta de novo.`,
      icone: 'grade',
      ...(desfazer ? { acao: { rotulo: 'Desfazer', executar: () => void desfazer() } } : {}),
    })
    aoFechar()
  }

  return (
    <FolhaInferior
      aberta={edicao !== null}
      aoFechar={aoFechar}
      rotulo={ultima ? 'Unidade' : 'Nova unidade'}
      titulo={ultima ? ultima.nome : 'Nova unidade'}
      rodape={
        <Botao variante="primario" largo icone="presente" onClick={() => void salvar()}>
          {ultima ? 'Salvar' : 'Criar unidade'}
        </Botao>
      }
    >
      <div class="pilha formulario">
        <Campo rotulo="Nome" valor={r.nome} aoMudar={(v) => setR({ ...r, nome: v })} erro={erros.nome} placeholder="Ex.: Centro" />
        <Campo rotulo="Endereço (opcional)" valor={r.endereco} aoMudar={(v) => setR({ ...r, endereco: v })} erro={erros.endereco} />
        {ultima && (
          <Botao variante={ultima.ativa ? 'perigo' : 'secundario'} largo onClick={() => void abrirOuFechar()}>
            {ultima.ativa ? 'Fechar esta unidade' : 'Abrir de novo'}
          </Botao>
        )}
      </div>
    </FolhaInferior>
  )
}
