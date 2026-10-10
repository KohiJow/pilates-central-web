// As telas entre o login e o app: confirmar o e-mail, o primeiro acesso do estúdio, conta sem
// convite, carregando e falha ao abrir.
import { useEffect, useState } from 'preact/hooks'
import { descreverErro, jaConfirmei, reenviarEmailDeConfirmacao, reivindicar, sairDaConta, tentarDeNovo } from '../../app/conta'
import type { ErroNaTela } from '../../app/conta'
import { voltarAsPortas } from '../../app/modo'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { EsqueletoDeLista } from '../../componentes/Esqueleto'
import { normalizarTelefone } from '../../dominio/texto'
import { ErroDaConta } from './ErroDaConta'
import { TelaDeEntrada } from './TelaDeEntrada'

/** Quanto esperar entre um reenvio e outro (o Firebase também limita por conta). */
export const ESPERA_PARA_REENVIAR_S = 60

function segundosRestantes(enviadoEm: number | undefined, agora: number): number {
  if (!enviadoEm) return 0
  return Math.max(0, ESPERA_PARA_REENVIAR_S - Math.floor((agora - enviadoEm) / 1000))
}

export function ConfirmarEmail({ email, enviadoEm, falhaNoEnvio }: { email: string; enviadoEm?: number; falhaNoEnvio?: ErroNaTela }) {
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState<ErroNaTela | null>(falhaNoEnvio ?? null)
  const [ocupado, setOcupado] = useState<'conferindo' | 'reenviando' | null>(null)
  const [restante, setRestante] = useState(() => segundosRestantes(enviadoEm, Date.now()))

  // a contagem para reenviar: um tique por segundo até zerar
  useEffect(() => {
    setRestante(segundosRestantes(enviadoEm, Date.now()))
    if (!enviadoEm) return
    const relogio = setInterval(() => {
      const r = segundosRestantes(enviadoEm, Date.now())
      setRestante(r)
      if (r === 0) clearInterval(relogio)
    }, 1000)
    return () => clearInterval(relogio)
  }, [enviadoEm])

  useEffect(() => {
    if (falhaNoEnvio) setErro(falhaNoEnvio)
  }, [falhaNoEnvio])

  const conferir = async () => {
    setOcupado('conferindo')
    setMensagem('')
    setErro(null)
    try {
      if (!(await jaConfirmei())) setMensagem('Ainda não aparece como confirmado. Abra o e-mail, toque no link e depois volte aqui.')
    } catch (falha) {
      setErro(descreverErro(falha))
    } finally {
      setOcupado(null)
    }
  }

  const reenviar = async () => {
    setOcupado('reenviando')
    setMensagem('')
    setErro(null)
    try {
      await reenviarEmailDeConfirmacao()
      setMensagem(`Enviamos de novo para ${email}. Olhe também a caixa de spam.`)
    } catch (falha) {
      setErro(descreverErro(falha))
    } finally {
      setOcupado(null)
    }
  }

  return (
    <TelaDeEntrada
      rotulo="Confirme o e-mail"
      titulo="Falta só um passo."
      texto={
        <>
          Enviamos um link para <strong class="quebra-livre">{email}</strong>. Abra o e-mail, toque no link e volte aqui. Não chegou? Olhe
          a caixa de spam ou de promoções; pode levar alguns minutos.
        </>
      }
    >
      {mensagem && (
        <p class="texto-secundario" role="status">
          {mensagem}
        </p>
      )}
      <ErroDaConta erro={erro} />
      <Botao variante="primario" largo onClick={() => void conferir()} disabled={ocupado !== null}>
        {ocupado === 'conferindo' ? 'Conferindo...' : 'Já confirmei'}
      </Botao>
      <Botao variante="secundario" largo onClick={() => void reenviar()} disabled={ocupado !== null || restante > 0}>
        {ocupado === 'reenviando' ? 'Enviando...' : restante > 0 ? `Reenviar em ${restante} s` : 'Reenviar o e-mail'}
      </Botao>
      <Botao variante="terciario" icone="sair" largo onClick={() => void sairDaConta()}>
        Sair e usar outro e-mail
      </Botao>
    </TelaDeEntrada>
  )
}

export function PrimeiroAcesso({ email }: { email: string }) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [nomeEstudio, setNomeEstudio] = useState('Pilates Central')
  const [erros, setErros] = useState<{ nome?: string; telefone?: string }>({})
  const [geral, setGeral] = useState<ErroNaTela | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const enviar = async (e: Event) => {
    e.preventDefault()
    const novos: typeof erros = {}
    if (nome.trim().length < 3) novos.nome = 'Escreva o seu nome.'
    const tel = telefone.trim() ? normalizarTelefone(telefone) : ''
    if (tel === null) novos.telefone = 'Use DDD e número, por exemplo (19) 90000-0000.'
    setErros(novos)
    setGeral(null)
    if (Object.keys(novos).length) return
    setOcupado(true)
    try {
      await reivindicar({ nome, telefone: tel ?? '', nomeEstudio })
    } catch (erro) {
      setGeral(descreverErro(erro))
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
        <ErroDaConta erro={geral} />
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
