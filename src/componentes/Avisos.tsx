import { signal } from '@preact/signals'
import { createPortal } from 'preact/compat'
import { useEffect } from 'preact/hooks'
import { folhasAbertas } from './FolhaInferior'
import { Icone } from './Icone'
import type { NomeDoIcone } from './Icone'

export interface Aviso {
  id: number
  texto: string
  icone?: NomeDoIcone
  acao?: { rotulo: string; executar: () => void }
  /** em ms; com ação o aviso fica mais tempo, para dar tempo de desfazer */
  duracao?: number
}

const atual = signal<(Aviso & { saindo?: boolean }) | null>(null)
let contador = 0
let relogio: ReturnType<typeof setTimeout> | undefined

function fechar(id: number) {
  const a = atual.peek()
  if (!a || a.id !== id || a.saindo) return
  atual.value = { ...a, saindo: true }
  // espera a animação de saída (180 ms) antes de tirar do DOM
  setTimeout(() => {
    if (atual.peek()?.id === id) atual.value = null
  }, 190)
}

/** Mostra um aviso flutuante. Um novo aviso substitui o anterior. */
export function avisar(aviso: Omit<Aviso, 'id'>): void {
  contador += 1
  const id = contador
  clearTimeout(relogio)
  atual.value = { ...aviso, id }
  relogio = setTimeout(() => fechar(id), aviso.duracao ?? (aviso.acao ? 6000 : 3500))
}

export function fecharAviso(): void {
  const a = atual.peek()
  if (a) fechar(a.id)
}

/**
 * Fica fora do #app (portal no body): quando uma folha abre, o resto do app fica inerte,
 * mas o "Desfazer" do aviso precisa continuar tocável. Com folha aberta, o aviso sobe para o topo.
 */
export function Avisos({ semAbas = false }: { semAbas?: boolean }) {
  const aviso = atual.value
  useEffect(() => () => clearTimeout(relogio), [])
  const posicao = folhasAbertas.value > 0 ? ' avisos--topo' : semAbas ? ' avisos--sem-abas' : ''
  return createPortal(
    <div class={`avisos${posicao}`} aria-live="polite" aria-atomic="true">
      {aviso && (
        <div key={aviso.id} class={`aviso${aviso.saindo ? ' aviso--saindo' : ''}`} role="status">
          {aviso.icone && (
            <span class="aviso-icone">
              <Icone nome={aviso.icone} tamanho={22} />
            </span>
          )}
          <p class="aviso-texto">{aviso.texto}</p>
          {aviso.acao && (
            <button
              type="button"
              class="aviso-acao tocavel"
              onClick={() => {
                const acao = aviso.acao
                fechar(aviso.id)
                acao?.executar()
              }}
            >
              {aviso.acao.rotulo}
            </button>
          )}
        </div>
      )}
    </div>,
    document.body,
  )
}
