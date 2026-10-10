import { useEffect, useState } from 'preact/hooks'
import { descreverErro, trocarSenhaDaConta } from '../../app/conta'
import type { ErroNaTela } from '../../app/conta'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { SENHA_MINIMA } from '../../dominio/senha'
import { ErroDaConta, MedidorDeSenha } from './ErroDaConta'

/** Trocar a senha com a conta aberta: pede a atual (o Firebase exige login recente) e a nova. */
export function FolhaDeTrocaDeSenha({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState<ErroNaTela | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (aberta) {
      setAtual('')
      setNova('')
      setErro(null)
      setOcupado(false)
    }
  }, [aberta])

  const enviar = async (e: Event) => {
    e.preventDefault()
    if (!atual) return setErro({ mensagem: 'Digite a senha atual.' })
    if (nova.length < SENHA_MINIMA) return setErro({ mensagem: `A senha nova precisa ter pelo menos ${SENHA_MINIMA} caracteres.` })
    if (nova === atual) return setErro({ mensagem: 'A senha nova é igual à atual.' })
    setErro(null)
    setOcupado(true)
    try {
      await trocarSenhaDaConta(atual, nova)
      aoFechar()
      avisar({ texto: 'Senha trocada. Use a nova na próxima vez que entrar.', icone: 'presente' })
    } catch (falha) {
      setErro(descreverErro(falha))
      setOcupado(false)
    }
  }

  return (
    <FolhaInferior aberta={aberta} aoFechar={aoFechar} rotulo="Conta" titulo="Trocar a senha">
      <form class="pilha" onSubmit={(e) => void enviar(e)} noValidate>
        <Campo rotulo="Senha atual" type={mostrar ? 'text' : 'password'} autoComplete="current-password" valor={atual} aoMudar={setAtual} />
        <Campo
          rotulo="Senha nova"
          type={mostrar ? 'text' : 'password'}
          autoComplete="new-password"
          valor={nova}
          aoMudar={setNova}
          ajuda={!nova ? `Pelo menos ${SENHA_MINIMA} caracteres. Uma frase comprida vale mais que símbolos.` : undefined}
        />
        <MedidorDeSenha senha={nova} />
        <Botao variante="terciario" onClick={() => setMostrar(!mostrar)} aria-pressed={mostrar}>
          {mostrar ? 'Esconder as senhas' : 'Mostrar as senhas'}
        </Botao>
        <ErroDaConta erro={erro} />
        <Botao variante="primario" type="submit" largo disabled={ocupado}>
          {ocupado ? 'Trocando...' : 'Trocar a senha'}
        </Botao>
      </form>
    </FolhaInferior>
  )
}
