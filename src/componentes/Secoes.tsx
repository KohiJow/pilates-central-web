import { useLayoutEffect, useRef } from 'preact/hooks'

export interface Secao<T extends string> {
  id: T
  rotulo: string
}

interface Props<T extends string> {
  secoes: readonly Secao<T>[]
  atual: T
  aoEscolher: (id: T) => void
  rotulo: string
}

/**
 * Seções de uma aba (Alunos, Turmas, Reposições). A marca da seção atual é um elemento só que
 * desliza por transform até a seção escolhida, como a pílula da faixa de dias.
 */
export function Secoes<T extends string>({ secoes, atual, aoEscolher, rotulo }: Props<T>) {
  const caixa = useRef<HTMLDivElement>(null)
  const marca = useRef<HTMLSpanElement>(null)
  const mediu = useRef(false)

  useLayoutEffect(() => {
    const c = caixa.current
    const m = marca.current
    const botao = c?.querySelector<HTMLElement>(`[data-secao="${atual}"]`)
    if (!c || !m || !botao) return
    const primeira = !mediu.current
    if (primeira) m.style.transition = 'none'
    m.style.width = `${botao.offsetWidth}px`
    m.style.transform = `translateX(${botao.offsetLeft}px)`
    if (primeira) {
      void m.offsetWidth
      m.style.transition = ''
      mediu.current = true
      c.classList.add('secoes--medida')
    }
  }, [atual, secoes.length])

  return (
    <nav ref={caixa} class="secoes" aria-label={rotulo}>
      <span ref={marca} class="secoes-marca" aria-hidden="true" />
      {secoes.map((s) => (
        <button
          key={s.id}
          type="button"
          class="secao-botao tocavel"
          data-secao={s.id}
          aria-current={s.id === atual ? 'page' : undefined}
          onClick={() => aoEscolher(s.id)}
        >
          {s.rotulo}
        </button>
      ))}
    </nav>
  )
}
