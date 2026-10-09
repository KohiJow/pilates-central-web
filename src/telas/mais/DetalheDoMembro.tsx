import { useState } from 'preact/hooks'
import { abrir } from '../../app/navegacao'
import { membro as eu, pode } from '../../app/perfil'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { Pilula } from '../../componentes/Pilula'
import { base, equipePorId, nomeDaUnidade } from '../../dados/estado'
import { mudarAcessoDoMembro, mudarPapelDoMembro, passarAConta } from '../../dados/gestao'
import { dataCurta } from '../../dominio/datas'
import { podeEditarMembro } from '../../dominio/equipe'
import { NOME_DO_PAPEL } from '../../dominio/permissoes'
import { listaFalada, plural, primeiroNome, telefoneLegivel } from '../../dominio/texto'
import type { Id } from '../../dominio/tipos'
import { nomeDaTurma } from '../../dominio/turmas'
import { SemAcesso } from './SemAcesso'

/** Uma pessoa da equipe: contato, papel e o que a administração pode fazer com o acesso dela. */
export function DetalheDoMembro({ membroId }: { membroId: Id }) {
  const ator = eu.value
  const alvo = equipePorId.value.get(membroId)
  const [passando, setPassando] = useState(false)
  if (!ator || !alvo || !pode('convidar-professor')) return <SemAcesso titulo="Equipe" texto="Pessoa não encontrada." />

  const souEu = ator.id === alvo.id
  const titular = ator.papel === 'titular'
  const turmas = (base.value?.turmas ?? []).filter((t) => t.ativa && t.professorId === alvo.id)
  const convidadoPor = alvo.convite ? equipePorId.value.get(alvo.convite.porId) : undefined

  const resultado = (r: Awaited<ReturnType<typeof mudarPapelDoMembro>>, texto: string) => {
    if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info' })
    const desfazer = r.valor.desfazer
    avisar({ texto, icone: 'presente', ...(desfazer ? { acao: { rotulo: 'Desfazer', executar: () => void desfazer() } } : {}) })
  }

  const passar = async () => {
    setPassando(false)
    const r = await passarAConta(ator, alvo.id)
    if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info' })
    avisar({ texto: `${primeiroNome(alvo.nome)} agora é responsável pela conta. Você continua na administração.`, icone: 'trocar', duracao: 6000 })
  }

  return (
    <section class="tela" aria-labelledby="titulo-membro">
      <CabecalhoDeSubtela voltarPara="Equipe" rotulo={NOME_DO_PAPEL[alvo.papel]} titulo={alvo.nome} idTitulo="titulo-membro">
        <div class="chips">
          {souEu && <Pilula tom="acento">você</Pilula>}
          {alvo.convite && <Pilula tom="acento">convite pendente</Pilula>}
          {!alvo.ativo && <Pilula tom="alerta">sem acesso</Pilula>}
        </div>
      </CabecalhoDeSubtela>

      <dl class="dados">
        <div>
          <dt>Papel</dt>
          <dd>{NOME_DO_PAPEL[alvo.papel]}</dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{alvo.email}</dd>
        </div>
        <div>
          <dt>Telefone</dt>
          <dd>{alvo.telefone ? telefoneLegivel(alvo.telefone) : 'Sem telefone'}</dd>
        </div>
        {alvo.papel === 'professor' && (
          <div>
            <dt>Unidades</dt>
            <dd>{listaFalada(alvo.unidades.map(nomeDaUnidade)) || 'Nenhuma'}</dd>
          </div>
        )}
        <div>
          <dt>Turmas</dt>
          <dd>{turmas.length === 0 ? 'Nenhuma' : `${plural(turmas.length, 'turma')}: ${turmas.slice(0, 4).map(nomeDaTurma).join('; ')}${turmas.length > 4 ? '...' : ''}`}</dd>
        </div>
        {alvo.convite && (
          <div>
            <dt>Convite</dt>
            <dd>
              Registrado em {dataCurta(alvo.convite.enviadoEm.slice(0, 10))}
              {convidadoPor ? ` por ${primeiroNome(convidadoPor.nome)}` : ''}. O acesso por e-mail chega quando o login estiver ligado.
            </dd>
          </div>
        )}
      </dl>

      <section class="secao" aria-label="Ações">
        {podeEditarMembro(ator, alvo) && (
          <Botao variante="secundario" icone="editar" largo onClick={() => abrir('equipe', alvo.id, 'editar')}>
            Editar contato{alvo.papel === 'professor' && pode('editar-professores') ? ' e unidades' : ''}
          </Botao>
        )}
        {titular && !souEu && alvo.ativo && alvo.papel === 'professor' && (
          <Botao
            variante="secundario"
            largo
            onClick={async () => resultado(await mudarPapelDoMembro(ator, alvo.id, 'administrador'), `${primeiroNome(alvo.nome)} agora faz parte da administração.`)}
          >
            Passar para a administração
          </Botao>
        )}
        {titular && !souEu && alvo.ativo && alvo.papel === 'administrador' && (
          <>
            <Botao variante="secundario" icone="trocar" largo onClick={() => setPassando(true)}>
              Passar a conta para {primeiroNome(alvo.nome)}
            </Botao>
            <Botao
              variante="terciario"
              largo
              onClick={async () => resultado(await mudarPapelDoMembro(ator, alvo.id, 'professor'), `${primeiroNome(alvo.nome)} voltou a ser professor.`)}
            >
              Tirar da administração
            </Botao>
          </>
        )}
        {!souEu && alvo.papel !== 'titular' && (alvo.papel === 'professor' || titular) && (
          <Botao
            variante={alvo.ativo ? 'perigo' : 'secundario'}
            largo
            onClick={async () =>
              resultado(
                await mudarAcessoDoMembro(ator, alvo.id, !alvo.ativo),
                alvo.ativo ? `${primeiroNome(alvo.nome)} ficou sem acesso.` : `${primeiroNome(alvo.nome)} tem acesso de novo.`,
              )
            }
          >
            {alvo.ativo ? 'Tirar o acesso' : 'Devolver o acesso'}
          </Botao>
        )}
        {alvo.papel === 'titular' && !souEu && (
          <p class="texto-secundario">Quem é responsável pela conta só deixa de ser passando a conta para alguém da administração.</p>
        )}
      </section>

      <FolhaInferior
        aberta={passando}
        aoFechar={() => setPassando(false)}
        rotulo="Passar a conta"
        titulo={`Passar a conta para ${primeiroNome(alvo.nome)}?`}
        rodape={
          <div class="linha-acoes">
            <Botao variante="secundario" onClick={() => setPassando(false)}>
              Agora não
            </Botao>
            <Botao variante="primario" onClick={() => void passar()}>
              Passar a conta
            </Botao>
          </div>
        }
      >
        <p>
          {primeiroNome(alvo.nome)} passa a ser responsável: só essa pessoa vai poder mexer em quem administra e passar a conta
          adiante. Você continua na administração, com o mesmo acesso ao dia a dia. Isso não se desfaz por aqui.
        </p>
      </FolhaInferior>
    </section>
  )
}
