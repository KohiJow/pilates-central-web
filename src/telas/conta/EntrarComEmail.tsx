import { useEffect, useRef, useState } from 'preact/hooks'
import { criarContaNova, descreverErro, entrarNaConta, pedirNovaSenha } from '../../app/conta'
import type { ErroNaTela } from '../../app/conta'
import { voltarAsPortas } from '../../app/modo'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { Interruptor } from '../../componentes/Interruptor'
import { SENHA_MINIMA } from '../../dominio/senha'
import { ehEmailValido } from '../../dominio/texto'
import { ErroDaConta, MedidorDeSenha } from './ErroDaConta'
import { TelaDeEntrada } from './TelaDeEntrada'

type Etapa = 'entrar' | 'criar'

/**
 * Entrar com e-mail e senha, criar a conta (quem foi convidado e o primeiro acesso do estúdio)
 * e pedir senha nova. As mensagens de erro não dizem se o e-mail tem conta.
 */
export function EntrarComEmail() {
  const [etapa, setEtapa] = useState<Etapa>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [lembrar, setLembrar] = useState(true)
  const [erro, setErro] = useState<ErroNaTela | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [recuperando, setRecuperando] = useState(false)
  const formulario = useRef<HTMLFormElement>(null)

  const enviar = async (e: Event) => {
    e.preventDefault()
    if (!ehEmailValido(email)) return setErro({ mensagem: 'Confira o e-mail.' })
    if (etapa === 'criar' && senha.length < SENHA_MINIMA) return setErro({ mensagem: `Use uma senha com pelo menos ${SENHA_MINIMA} caracteres.` })
    if (!senha) return setErro({ mensagem: 'Digite a senha.' })
    setErro(null)
    setOcupado(true)
    try {
      if (etapa === 'entrar') await entrarNaConta(email, senha, lembrar)
      else await criarContaNova(email, senha, lembrar)
    } catch (falha) {
      setErro(descreverErro(falha))
    } finally {
      setOcupado(false)
    }
  }

  const trocar = (nova: Etapa) => {
    setEtapa(nova)
    setErro(null)
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
        />
        <Campo
          rotulo="Senha"
          type={mostrar ? 'text' : 'password'}
          autoComplete={etapa === 'entrar' ? 'current-password' : 'new-password'}
          valor={senha}
          aoMudar={setSenha}
          ajuda={etapa === 'criar' && !senha ? `Pelo menos ${SENHA_MINIMA} caracteres. Uma frase comprida vale mais que símbolos.` : undefined}
        />
        {etapa === 'criar' && <MedidorDeSenha senha={senha} />}
        <Botao variante="terciario" onClick={() => setMostrar(!mostrar)} aria-pressed={mostrar}>
          {mostrar ? 'Esconder a senha' : 'Mostrar a senha'}
        </Botao>
        <Interruptor
          ligado={lembrar}
          aoMudar={setLembrar}
          rotulo="Lembrar neste aparelho"
          ajuda={lembrar ? 'O app abre sem pedir a senha até você sair.' : 'Num celular emprestado: ao fechar o navegador, a sessão some.'}
        />
        <ErroDaConta erro={erro} />
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
  const [erro, setErro] = useState<ErroNaTela | null>(null)
  useEffect(() => {
    if (aberta) {
      setEmail(emailInicial)
      setEstado('editando')
      setErro(null)
    }
  }, [aberta, emailInicial])

  const enviar = async (e: Event) => {
    e.preventDefault()
    if (!ehEmailValido(email)) return setErro({ mensagem: 'Confira o e-mail.' })
    setErro(null)
    setEstado('enviando')
    try {
      await pedirNovaSenha(email)
      setEstado('enviado')
    } catch (falha) {
      setErro(descreverErro(falha))
      setEstado('editando')
    }
  }

  return (
    <FolhaInferior aberta={aberta} aoFechar={aoFechar} rotulo="Senha" titulo="Criar uma senha nova">
      {estado === 'enviado' ? (
        <div class="pilha">
          <p role="status">
            Se houver uma conta com este e-mail, enviamos um link para criar uma senha nova para{' '}
            <strong class="quebra-livre">{email.trim()}</strong>. Olhe também o spam. Abra o link, escolha a senha nova e volte aqui para
            entrar.
          </p>
          <Botao variante="secundario" largo onClick={aoFechar}>
            Voltar para entrar
          </Botao>
        </div>
      ) : (
        <form class="pilha" onSubmit={(e) => void enviar(e)} noValidate>
          <p class="texto-secundario">Mandamos um link por e-mail. Com ele você escolhe a senha nova e volta aqui para entrar.</p>
          <Campo
            rotulo="E-mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            valor={email}
            aoMudar={setEmail}
          />
          <ErroDaConta erro={erro} />
          <Botao variante="primario" type="submit" largo disabled={estado === 'enviando'}>
            {estado === 'enviando' ? 'Enviando...' : 'Enviar o link'}
          </Botao>
        </form>
      )}
    </FolhaInferior>
  )
}
