// Na ficha do aluno (só a administração): o acesso ao app do aluno e os direitos da LGPD
// (cópia dos dados num arquivo, exclusão do cadastro).
import { useState } from 'preact/hooks'
import { baixarArquivo } from '../../app/baixar'
import { abrir } from '../../app/navegacao'
import { membro, pode } from '../../app/perfil'
import { agoraDoApp } from '../../app/relogio'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { CompartilharTexto } from '../../componentes/CompartilharTexto'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { Icone } from '../../componentes/Icone'
import { base } from '../../dados/estado'
import { exportarDadosDoAluno } from '../../dados/exportacao'
import { excluirAluno, liberarAcessoDoAluno, renovarConviteDoAluno, tirarAcessoDoAluno } from '../../dados/gestao'
import { conviteVencido, linkDeEntrada, mensagemDoConvite, prazoDoConvite } from '../../dominio/convites'
import { dataCurta } from '../../dominio/datas'
import { linkDoWhatsApp, plural, primeiroNome } from '../../dominio/texto'
import type { Aluno } from '../../dominio/tipos'

export function AcessoAoApp({ aluno }: { aluno: Aluno }) {
  const eu = membro.value
  const config = base.value?.configuracao
  if (!pode('editar-alunos') || !config || aluno.situacao === 'inativo') return null
  const nome = primeiroNome(aluno.nome)

  const liberar = async () => {
    if (!eu) return
    const r = await liberarAcessoDoAluno(aluno.id, eu)
    if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info', duracao: 6000 })
    const desfazer = r.valor.desfazer
    avisar({
      texto: `Acesso de ${nome} liberado. Mande o convite pelo WhatsApp.`,
      icone: 'convidar',
      ...(desfazer ? { acao: { rotulo: 'Desfazer', executar: () => void desfazer() } } : {}),
    })
  }

  const tirar = async () => {
    const r = await tirarAcessoDoAluno(aluno.id)
    avisar(r.ok ? { texto: `${nome} não entra mais no app.`, icone: 'sair' } : { texto: r.mensagem, icone: 'info' })
  }

  const mandarDeNovo = async () => {
    if (!eu) return
    const r = await renovarConviteDoAluno(aluno.id, eu)
    avisar(r.ok ? { texto: `Convite de ${nome} mandado de novo: vale por ${plural(config.validadeDoConviteDias, 'dia')}.`, icone: 'convidar' } : { texto: r.mensagem, icone: 'info' })
  }

  const convite = mensagemDoConvite('aluno', aluno.nome, aluno.email, linkDeEntrada(location.origin, import.meta.env.BASE_URL), config.validadeDoConviteDias)
  const vencido = aluno.acesso ? conviteVencido(aluno.acesso.convidadoEm, config.validadeDoConviteDias, agoraDoApp()) : false

  return (
    <section class="secao" aria-labelledby="titulo-app-aluno">
      <h2 id="titulo-app-aluno" class="micro">
        App do aluno
      </h2>
      {!config.acessoDoAluno ? (
        <p class="texto-secundario">O app do aluno está desligado. Para ligar: Mais, Estúdio.</p>
      ) : !aluno.email ? (
        <>
          <p class="texto-secundario">Para {nome} usar o app, cadastre o e-mail: é por ele que se entra.</p>
          <Botao variante="secundario" icone="editar" largo onClick={() => abrir(aluno.id, 'editar')}>
            Cadastrar o e-mail
          </Botao>
        </>
      ) : aluno.acesso ? (
        <>
          <p class="texto-secundario">
            Acesso liberado em {dataCurta(aluno.acesso.convidadoEm.slice(0, 10))}. {nome} entra com <span class="quebra-livre">{aluno.email}</span>; o
            convite {prazoDoConvite(aluno.acesso.convidadoEm, config.validadeDoConviteDias, agoraDoApp())}.
            {vencido ? ' Se ainda não criou a conta, mande de novo.' : ''}
          </p>
          {vencido && (
            <Botao variante="secundario" icone="convidar" largo onClick={() => void mandarDeNovo()}>
              Mandar o convite de novo
            </Botao>
          )}
          {aluno.telefone && (
            <a class="botao botao--secundario botao--largo tocavel" href={linkDoWhatsApp(aluno.telefone, convite)} target="_blank" rel="noopener noreferrer">
              <Icone nome="mensagem" tamanho={20} />
              <span>Mandar o convite pelo WhatsApp</span>
            </a>
          )}
          <CompartilharTexto titulo="Convite para o app do aluno" texto={convite} />
          <Botao variante="terciario" icone="sair" largo onClick={() => void tirar()}>
            Tirar o acesso
          </Botao>
        </>
      ) : (
        <>
          <p class="texto-secundario">Com o acesso, {nome} vê as próximas aulas, avisa quando não puder vir e escolhe onde repor.</p>
          <Botao variante="secundario" icone="convidar" largo onClick={() => void liberar()}>
            Liberar o app para {nome}
          </Botao>
        </>
      )}
    </section>
  )
}

export function DadosEPrivacidade({ aluno }: { aluno: Aluno }) {
  const [excluindo, setExcluindo] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  if (!pode('editar-alunos')) return null
  const nome = primeiroNome(aluno.nome)

  const exportar = async () => {
    setOcupado(true)
    const r = await exportarDadosDoAluno(aluno.id, pode('ver-financeiro'))
    setOcupado(false)
    if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info' })
    baixarArquivo(r.valor.nome, r.valor.conteudo, 'application/json;charset=utf-8')
    avisar({ texto: `Arquivo com os dados de ${nome} pronto.`, icone: 'baixar' })
  }

  const excluir = async () => {
    setExcluindo(false)
    const r = await excluirAluno(aluno.id)
    // a ficha vira "não encontrado", com o Voltar para a lista (navegar enquanto a folha fecha
    // embaralharia o histórico)
    if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info' })
    avisar({ texto: `Cadastro de ${nome} excluído.`, icone: 'arquivo' })
  }

  return (
    <section class="secao" aria-labelledby="titulo-lgpd">
      <h2 id="titulo-lgpd" class="micro">
        Dados e privacidade
      </h2>
      <p class="texto-secundario">Pela LGPD, o aluno pode pedir uma cópia de tudo o que o estúdio guarda sobre ele, ou a exclusão do cadastro.</p>
      <Botao variante="secundario" icone="baixar" largo disabled={ocupado} onClick={() => void exportar()}>
        {ocupado ? 'Juntando os dados...' : 'Baixar os dados do aluno'}
      </Botao>
      <Botao variante="terciario" icone="faltou" largo onClick={() => setExcluindo(true)}>
        Excluir o cadastro
      </Botao>

      <FolhaInferior
        aberta={excluindo}
        aoFechar={() => setExcluindo(false)}
        rotulo="Excluir cadastro"
        titulo={`Excluir ${nome} de vez?`}
        rodape={
          <div class="linha-acoes">
            <Botao variante="secundario" onClick={() => setExcluindo(false)}>
              Agora não
            </Botao>
            <Botao variante="perigo" onClick={() => void excluir()}>
              Excluir de vez
            </Botao>
          </div>
        }
      >
        <div class="pilha">
          <p>
            Somem o cadastro, a mensalidade, o acesso ao app e os créditos de reposição. {nome} sai das turmas e das aulas marcadas daqui
            para a frente.
          </p>
          <p>As presenças antigas e os pagamentos ficam só com um código, sem nome, telefone nem e-mail. Não dá para desfazer.</p>
          <p class="texto-secundario">Se a ideia é só parar por um tempo, use Pausar ou Arquivar.</p>
        </div>
      </FolhaInferior>
    </section>
  )
}
