// As telas entre o login e o app: confirmar o e-mail, o primeiro acesso do estúdio, conta sem
// convite, carregando e falha ao abrir.
import { useState } from 'preact/hooks'
import { jaConfirmei, mensagemDoErro, reenviarEmailDeConfirmacao, reivindicar, sairDaConta, tentarDeNovo } from '../../app/conta'
import { voltarAsPortas } from '../../app/modo'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { EsqueletoDeLista } from '../../componentes/Esqueleto'
import { normalizarTelefone } from '../../dominio/texto'
import { TelaDeEntrada } from './TelaDeEntrada'

export function ConfirmarEmail({ email }: { email: string }) {
  const [mensagem, setMensagem] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const conferir = async () => {
    setOcupado(true)
    setMensagem('')
    try {
      if (!(await jaConfirmei())) setMensagem('Ainda não aparece como confirmado. Toque no link do e-mail e tente de novo.')
    } catch (erro) {
      setMensagem(mensagemDoErro(erro))
    } finally {
      setOcupado(false)
    }
  }

  const reenviar = async () => {
    try {
      await reenviarEmailDeConfirmacao()
      setMensagem('Enviamos de novo. Olhe também o spam.')
    } catch (erro) {
      setMensagem(mensagemDoErro(erro))
    }
  }

  return (
    <TelaDeEntrada
      rotulo="Confirme o e-mail"
      titulo="Falta só um passo."
      texto={
        <>
          Enviamos um link para <strong class="quebra-livre">{email}</strong>. Abra o e-mail, toque no link e volte aqui.
        </>
      }
    >
      {mensagem && (
        <p class="texto-secundario" role="status">
          {mensagem}
        </p>
      )}
      <Botao variante="primario" largo onClick={() => void conferir()} disabled={ocupado}>
        {ocupado ? 'Conferindo...' : 'Já confirmei'}
      </Botao>
      <Botao variante="secundario" largo onClick={() => void reenviar()}>
        Reenviar o e-mail
      </Botao>
      <Botao variante="terciario" icone="sair" largo onClick={() => void sairDaConta()}>
        Sair
      </Botao>
    </TelaDeEntrada>
  )
}

export function PrimeiroAcesso({ email }: { email: string }) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [nomeEstudio, setNomeEstudio] = useState('Pilates Central')
  const [erros, setErros] = useState<{ nome?: string; telefone?: string; geral?: string }>({})
  const [ocupado, setOcupado] = useState(false)

  const enviar = async (e: Event) => {
    e.preventDefault()
    const novos: typeof erros = {}
    if (nome.trim().length < 3) novos.nome = 'Escreva o seu nome.'
    const tel = telefone.trim() ? normalizarTelefone(telefone) : ''
    if (tel === null) novos.telefone = 'Use DDD e número, por exemplo (19) 90000-0000.'
    setErros(novos)
    if (Object.keys(novos).length) return
    setOcupado(true)
    try {
      await reivindicar({ nome, telefone: tel ?? '', nomeEstudio })
    } catch (erro) {
      setErros({ geral: mensagemDoErro(erro) })
      setOcupado(false)
    }
  }

  return (
    <TelaDeEntrada
      rotulo="Primeiro acesso do estúdio"
      titulo="Vamos começar."
      texto={
        <>
          A conta <strong class="quebra-livre">{email}</strong> vai ser a responsável pelo estúdio. Depois você convida a
          administração, os professores e os alunos.
        </>
      }
    >
      <form class="formulario pilha" onSubmit={(e) => void enviar(e)} noValidate>
        <Campo rotulo="Seu nome" autoComplete="name" valor={nome} aoMudar={setNome} erro={erros.nome} />
        <Campo
          rotulo="Seu WhatsApp (opcional)"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(19) 90000-0000"
          valor={telefone}
          aoMudar={setTelefone}
          erro={erros.telefone}
        />
        <Campo rotulo="Nome do estúdio" valor={nomeEstudio} aoMudar={setNomeEstudio} />
        {erros.geral && (
          <p class="campo-erro" role="alert">
            {erros.geral}
          </p>
        )}
        <Botao variante="primario" type="submit" largo disabled={ocupado}>
          {ocupado ? 'Preparando...' : 'Começar'}
        </Botao>
      </form>
      <Botao variante="terciario" icone="sair" largo onClick={() => void sairDaConta()}>
        Sair
      </Botao>
    </TelaDeEntrada>
  )
}

export function SemAcessoAConta({ email, mensagem }: { email: string; mensagem: string }) {
  return (
    <TelaDeEntrada rotulo={email} titulo="Ainda não dá para entrar." texto={mensagem}>
      <Botao variante="secundario" icone="recomecar" largo onClick={tentarDeNovo}>
        Tentar de novo
      </Botao>
      <Botao variante="terciario" icone="sair" largo onClick={() => void sairDaConta()}>
        Sair e entrar com outro e-mail
      </Botao>
    </TelaDeEntrada>
  )
}

export function AbrindoConta() {
  return (
    <TelaDeEntrada rotulo="Pilates Central" titulo="Abrindo..." texto="Conferindo o seu acesso.">
      <div aria-hidden="true">
        <EsqueletoDeLista itens={2} altura={72} />
      </div>
    </TelaDeEntrada>
  )
}

export function FalhaAoAbrir({ mensagem }: { mensagem: string }) {
  return (
    <TelaDeEntrada rotulo="Pilates Central" titulo="Não abriu." texto={mensagem}>
      <Botao variante="primario" icone="recomecar" largo onClick={() => location.reload()}>
        Recarregar
      </Botao>
      <Botao variante="terciario" icone="voltar" largo onClick={voltarAsPortas}>
        Voltar
      </Botao>
    </TelaDeEntrada>
  )
}
