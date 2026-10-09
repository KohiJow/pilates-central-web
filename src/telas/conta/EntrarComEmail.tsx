import { useEffect, useRef, useState } from 'preact/hooks'
import { criarContaNova, entrarNaConta, mensagemDoErro, pedirNovaSenha } from '../../app/conta'
import { voltarAsPortas } from '../../app/modo'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { ehEmailValido } from '../../dominio/texto'
import { TelaDeEntrada } from './TelaDeEntrada'

type Etapa = 'entrar' | 'criar'

const SENHA_MINIMA = 8

/**
 * Entrar com e-mail e senha, criar a conta (quem foi convidado e o primeiro acesso do estúdio)
 * e pedir senha nova. As mensagens de erro não dizem se o e-mail tem conta.
 */
export function EntrarComEmail() {
  const [etapa, setEtapa] = useState<Etapa>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [recuperando, setRecuperando] = useState(false)
  const formulario = useRef<HTMLFormElement>(null)

  const enviar = async (e: Event) => {
    e.preventDefault()
    if (!ehEmailValido(email)) return setErro('Confira o e-mail.')
    if (etapa === 'criar' && senha.length < SENHA_MINIMA) return setErro(`Use uma senha com pelo menos ${SENHA_MINIMA} caracteres.`)
    if (!senha) return setErro('Digite a senha.')
    setErro('')
    setOcupado(true)
    try {
      if (etapa === 'entrar') await entrarNaConta(email, senha)
      else await criarContaNova(email, senha)
    } catch (falha) {
      setErro(mensagemDoErro(falha))
    } finally {
      setOcupado(false)
    }
  }

  const trocar = (nova: Etapa) => {
    setEtapa(nova)
    setErro('')
  }

  return (
    <TelaDeEntrada
      rotulo={etapa === 'entrar' ? 'Entrar' : 'Primeiro acesso'}
      titulo={etapa === 'entrar' ? 'Que bom ver você.' : 'Crie a sua conta.'}
      texto={
        etapa === 'entrar'
          ? 'Use o e-mail que o estúdio cadastrou para você.'
          : 'Use o mesmo e-mail do convite. Depois você confirma o e-mail num link que chega na sua caixa de entrada.'
      }
    >
      <form ref={formulario} class="formulario pilha" onSubmit={(e) => void enviar(e)} noValidate>
        <Campo
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          valor={email}
          aoMudar={setEmail}
          icone="mensagem"
        />
        <Campo
          rotulo="Senha"
          type={mostrar ? 'text' : 'password'}
          autoComplete={etapa === 'entrar' ? 'current-password' : 'new-password'}
          valor={senha}
          aoMudar={setSenha}
          ajuda={etapa === 'criar' ? `Pelo menos ${SENHA_MINIMA} caracteres.` : undefined}
        />
        <Botao variante="terciario" onClick={() => setMostrar(!mostrar)} aria-pressed={mostrar}>
          {mostrar ? 'Esconder a senha' : 'Mostrar a senha'}
        </Botao>
        {erro && (
          <p class="campo-erro" role="alert">
            {erro}
          </p>
        )}
        <Botao variante="primario" type="submit" largo disabled={ocupado}>
          {ocupado ? 'Um momento...' : etapa === 'entrar' ? 'Entrar' : 'Criar conta'}
        </Botao>
      </form>

      {etapa === 'entrar' ? (
        <>
          <Botao variante="secundario" largo onClick={() => trocar('criar')}>
            Primeiro acesso? Criar conta
          </Botao>
          <Botao variante="terciario" largo onClick={() => setRecuperando(true)}>
            Esqueci a senha
          </Botao>
        </>
      ) : (
        <Botao variante="secundario" largo onClick={() => trocar('entrar')}>
          Já tenho conta
        </Botao>
      )}
      <Botao variante="terciario" icone="voltar" largo onClick={voltarAsPortas}>
        Voltar
      </Botao>

      <FolhaDeSenhaNova aberta={recuperando} emailInicial={email} aoFechar={() => setRecuperando(false)} />
    </TelaDeEntrada>
  )
}

function FolhaDeSenhaNova({ aberta, emailInicial, aoFechar }: { aberta: boolean; emailInicial: string; aoFechar: () => void }) {
  const [email, setEmail] = useState(emailInicial)
  const [estado, setEstado] = useState<'editando' | 'enviando' | 'enviado'>('editando')
  const [erro, setErro] = useState('')
  useEffect(() => {
    if (aberta) {
      setEmail(emailInicial)
      setEstado('editando')
      setErro('')
    }
  }, [aberta, emailInicial])

  const enviar = async (e: Event) => {
    e.preventDefault()
    if (!ehEmailValido(email)) return setErro('Confira o e-mail.')
    setErro('')
    setEstado('enviando')
    try {
      await pedirNovaSenha(email)
      setEstado('enviado')
    } catch (falha) {
      setErro(mensagemDoErro(falha))
      setEstado('editando')
    }
  }

  return (
    <FolhaInferior
      aberta={aberta}
      aoFechar={aoFechar}
      rotulo="Senha"
      titulo="Criar uma senha nova"
    >
      {estado === 'enviado' ? (
        <p role="status">Se houver uma conta com este e-mail, enviamos um link para criar uma senha nova. Olhe também o spam.</p>
      ) : (
        <form class="pilha" onSubmit={(e) => void enviar(e)} noValidate>
          <Campo
            rotulo="E-mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            valor={email}
            aoMudar={setEmail}
            erro={erro || undefined}
          />
          <Botao variante="primario" type="submit" largo disabled={estado === 'enviando'}>
            {estado === 'enviando' ? 'Enviando...' : 'Enviar o link'}
          </Botao>
        </form>
      )}
    </FolhaInferior>
  )
}
