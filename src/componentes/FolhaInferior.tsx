import { signal } from '@preact/signals'
import type { ComponentChildren } from 'preact'
import { createPortal } from 'preact/compat'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { animar, duracaoPelaVelocidade } from '../movimento/animar'
import { deveFechar, resistencia, Velocimetro } from '../movimento/arraste'
import { CURVA, DURACAO } from '../movimento/tempos'
import { Icone } from './Icone'

/** Quantas folhas estão abertas (o aviso flutuante sobe para o topo quando há alguma). */
export const folhasAbertas = signal(0)

interface Props {
  aberta: boolean
  /** pedido de fechamento: o pai muda `aberta` para false e a folha anima a saída */
  aoFechar: () => void
  titulo: ComponentChildren
  /** rótulo pequeno acima do título */
  rotulo?: string
  /** linha abaixo do título */
  subtitulo?: ComponentChildren
  rodape?: ComponentChildren
  children: ComponentChildren
}

const FOCAVEIS = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
let sequenciaDeHistorico = 0

function translateYAtual(el: HTMLElement): number {
  const t = getComputedStyle(el).transform
  if (!t || t === 'none') return 0
  return new DOMMatrixReadOnly(t).m42
}

/**
 * Folha que sobe de baixo (bottom sheet). Fecha arrastando para baixo (com velocidade e
 * resistência de elástico para cima), tocando fora, no X, com Esc ou com o "voltar" do Android.
 */
export function FolhaInferior({ aberta, aoFechar, titulo, rotulo, subtitulo, rodape, children }: Props) {
  const [montada, setMontada] = useState(aberta)
  const folha = useRef<HTMLElement>(null)
  const fundo = useRef<HTMLDivElement>(null)
  const velocidadeDeSaida = useRef(0)
  const focoAnterior = useRef<Element | null>(null)
  const aoFecharAtual = useRef(aoFechar)
  aoFecharAtual.current = aoFechar
  const idTitulo = `folha-${useId()}`

  useEffect(() => {
    if (aberta) setMontada(true)
  }, [aberta])

  // entrada e saída
  useLayoutEffect(() => {
    const f = folha.current
    const b = fundo.current
    if (!montada || !f || !b) return
    if (aberta) {
      focoAnterior.current = document.activeElement
      void animar(f, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0px)' }], {
        duration: DURACAO.longa,
        easing: CURVA.suave,
      })
      void animar(b, [{ opacity: 0 }, { opacity: 1 }], { duration: DURACAO.media, easing: CURVA.padrao })
      f.focus({ preventScroll: true })
      return
    }
    // saindo: continua de onde a folha está (no meio do arraste ou da entrada)
    const atual = translateYAtual(f)
    const altura = f.getBoundingClientRect().height
    const v = velocidadeDeSaida.current
    velocidadeDeSaida.current = 0
    const duracao = v > 0 ? duracaoPelaVelocidade(altura - atual, v) : DURACAO.media
    const opacidade = b.style.opacity || getComputedStyle(b).opacity
    void animar(b, [{ opacity: Number(opacidade) }, { opacity: 0 }], { duration: duracao, easing: CURVA.padrao })
    void animar(f, [{ transform: `translateY(${atual}px)` }, { transform: 'translateY(100%)' }], {
      duration: duracao,
      easing: v > 0 ? CURVA.padrao : CURVA.saida,
    }).then(() => {
      setMontada(false)
      const anterior = focoAnterior.current
      if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus({ preventScroll: true })
    })
  }, [aberta, montada])

  // enquanto aberta: trava o fundo, Esc fecha, foco preso, "voltar" fecha
  useEffect(() => {
    if (!aberta) return
    const app = document.getElementById('app')
    const raiz = document.documentElement
    const overflowAnterior = raiz.style.overflow
    raiz.style.overflow = 'hidden'
    if (app) app.inert = true
    folhasAbertas.value += 1

    const id = ++sequenciaDeHistorico
    history.pushState({ ...(history.state as object | null), folha: id }, '')
    const aoVoltar = () => {
      if ((history.state as { folha?: number } | null)?.folha !== id) aoFecharAtual.current()
    }
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        aoFecharAtual.current()
        return
      }
      if (e.key !== 'Tab' || !folha.current) return
      const itens = [...folha.current.querySelectorAll<HTMLElement>(FOCAVEIS)]
      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      if (!primeiro || !ultimo) return
      if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === folha.current)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    window.addEventListener('popstate', aoVoltar)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      window.removeEventListener('popstate', aoVoltar)
      document.removeEventListener('keydown', aoTeclar)
      raiz.style.overflow = overflowAnterior
      folhasAbertas.value -= 1
      if (app && folhasAbertas.peek() === 0) app.inert = false
      if ((history.state as { folha?: number } | null)?.folha === id) history.back()
    }
  }, [aberta])

  // arrastar para fechar, pelo pegador (alça + cabeçalho)
  const arraste = useRef<{ inicioY: number; base: number; atual: number; id: number; quadro: number } | null>(null)
  const velocimetro = useRef(new Velocimetro())

  const aoApertar = (e: PointerEvent) => {
    const f = folha.current
    if (!f || !aberta || (e.pointerType === 'mouse' && e.button !== 0)) return
    if ((e.target as Element).closest('button, a, input')) return
    const base = translateYAtual(f)
    for (const anim of f.getAnimations()) anim.cancel()
    f.style.transform = `translateY(${base}px)`
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    velocimetro.current.zerar()
    velocimetro.current.registrar(e.timeStamp, e.clientX, e.clientY)
    arraste.current = { inicioY: e.clientY, base, atual: base, id: e.pointerId, quadro: 0 }
  }

  const aoMover = (e: PointerEvent) => {
    const a = arraste.current
    const f = folha.current
    const b = fundo.current
    if (!a || !f || !b || e.pointerId !== a.id) return
    velocimetro.current.registrar(e.timeStamp, e.clientX, e.clientY)
    const bruto = a.base + (e.clientY - a.inicioY)
    // para cima a folha resiste (elástico); para baixo acompanha o dedo
    a.atual = bruto < 0 ? -resistencia(-bruto, 56) : bruto
    if (a.quadro) return
    a.quadro = requestAnimationFrame(() => {
      a.quadro = 0
      const altura = f.offsetHeight || 1
      f.style.transform = `translateY(${a.atual}px)`
      b.style.opacity = String(Math.max(0, Math.min(1, 1 - a.atual / altura)))
    })
  }

  const aoSoltar = (e: PointerEvent) => {
    const a = arraste.current
    const f = folha.current
    const b = fundo.current
    if (!a || !f || !b || e.pointerId !== a.id) return
    arraste.current = null
    cancelAnimationFrame(a.quadro)
    f.style.transform = `translateY(${a.atual}px)`
    const { vy } = velocimetro.current.velocidade()
    const altura = f.offsetHeight || 1
    if (e.type !== 'pointercancel' && deveFechar(a.atual, altura, vy)) {
      velocidadeDeSaida.current = Math.max(vy, 0.3)
      aoFecharAtual.current()
      return
    }
    // volta para o lugar com mola
    void animar(f, [{ transform: `translateY(${a.atual}px)` }, { transform: 'translateY(0px)' }], {
      duration: DURACAO.longa,
      easing: a.atual < 0 ? CURVA.suave : CURVA.viva,
    })
    void animar(b, [{ opacity: Number(b.style.opacity || 1) }, { opacity: 1 }], {
      duration: DURACAO.media,
      easing: CURVA.padrao,
    })
  }

  if (!montada) return null

  return createPortal(
    <>
      <div ref={fundo} class="folha-fundo" onClick={() => aoFecharAtual.current()} aria-hidden="true" />
      <section
        ref={folha}
        class="folha"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        data-aberta={aberta ? 'sim' : 'nao'}
      >
        <div
          class="folha-pegador"
          onPointerDown={aoApertar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
        >
          <div class="folha-alca" aria-hidden="true" />
          <div class="folha-cabeca">
            <div class="folha-titulos">
              {rotulo && <p class="micro">{rotulo}</p>}
              <h2 id={idTitulo} class="titulo">
                {titulo}
              </h2>
              {subtitulo && <div class="texto-secundario">{subtitulo}</div>}
            </div>
            <button type="button" class="folha-fechar tocavel" onClick={() => aoFecharAtual.current()} aria-label="Fechar">
              <Icone nome="fechar" />
            </button>
          </div>
        </div>
        <div class="folha-corpo">{children}</div>
        {rodape && <div class="folha-rodape">{rodape}</div>}
      </section>
    </>,
    document.body,
  )
}
