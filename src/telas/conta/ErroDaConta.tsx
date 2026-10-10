import { useState } from 'preact/hooks'
import type { ErroNaTela } from '../../app/conta'
import { forcaDaSenha } from '../../dominio/senha'

/**
 * A falha como a pessoa lê, e o código bruto atrás de "Detalhes" para quem está configurando o
 * projeto (o código nunca aparece na frase principal).
 */
export function ErroDaConta({ erro }: { erro: ErroNaTela | null }) {
  const [aberto, setAberto] = useState(false)
  if (!erro) return null
  return (
    <div class="erro-da-conta">
      <p class="campo-erro" role="alert">
        {erro.mensagem}
      </p>
      {erro.detalhe && (
        <>
          <button type="button" class="botao botao--terciario tocavel erro-detalhes" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
            <span>{aberto ? 'Esconder os detalhes' : 'Detalhes'}</span>
          </button>
          {aberto && (
            <p class="erro-detalhe">
              <code>{erro.detalhe}</code>
            </p>
          )}
        </>
      )}
    </div>
  )
}

/** Barra e frase que acompanham a senha enquanto a pessoa digita (mínimo 8, sem exigir símbolo). */
export function MedidorDeSenha({ senha }: { senha: string }) {
  if (!senha) return null
  const f = forcaDaSenha(senha)
  return (
    <div class="medidor-senha" data-nivel={f.nivel}>
      <span class="barra medidor-senha-barra" aria-hidden="true">
        <span class="barra-cheia" style={{ transform: `scaleX(${f.nivel / 3})` }} />
      </span>
      <p class="campo-ajuda" role="status">
        {f.rotulo}. {f.dica}
      </p>
    </div>
  )
}
