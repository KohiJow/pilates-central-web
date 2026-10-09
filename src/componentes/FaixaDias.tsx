import { useLayoutEffect, useRef } from 'preact/hooks'
import { dataPorExtenso, nomeCurtoDoDia } from '../dominio/datas'
import type { DataISO } from '../dominio/tipos'
import { movimentoReduzido } from '../movimento/preferencias'

interface Props {
  dias: readonly DataISO[]
  selecionado: DataISO
  hoje: DataISO
  aoSelecionar: (dia: DataISO) => void
  temAula?: (dia: DataISO) => boolean
}

/**
 * Faixa horizontal de dias. A pílula do dia escolhido é um elemento só, que desliza por
 * transform até o novo dia (em vez de cada botão trocar de fundo).
 */
export function FaixaDias({ dias, selecionado, hoje, aoSelecionar, temAula }: Props) {
  const faixa = useRef<HTMLDivElement>(null)
  const indicador = useRef<HTMLDivElement>(null)
  const jaMediu = useRef(false)

  useLayoutEffect(() => {
    const f = faixa.current
    const i = indicador.current
    const botao = f?.querySelector<HTMLElement>(`[data-dia="${selecionado}"]`)
    if (!f || !i || !botao) return
    const primeiraVez = !jaMediu.current
    if (primeiraVez) i.style.transition = 'none'
    i.style.transform = `translateX(${botao.offsetLeft}px)`
    if (primeiraVez) {
      // força o estilo inicial antes de religar a transição
      void i.offsetWidth
      i.style.transition = ''
      jaMediu.current = true
      f.classList.add('faixa--medida')
    }
    const alvo = botao.offsetLeft - (f.clientWidth - botao.offsetWidth) / 2
    f.scrollTo({ left: alvo, behavior: primeiraVez || movimentoReduzido.peek() ? 'auto' : 'smooth' })
  }, [selecionado, dias])

  return (
    <div ref={faixa} class="faixa" role="group" aria-label="Escolha o dia">
      <div ref={indicador} class="faixa-indicador" aria-hidden="true" />
      {dias.map((dia) => {
        const ehHoje = dia === hoje
        const classes = ['dia', 'tocavel', ehHoje ? 'dia--hoje' : '', temAula && !temAula(dia) ? 'dia--sem-aula' : '']
          .filter(Boolean)
          .join(' ')
        return (
          <button
            key={dia}
            type="button"
            class={classes}
            data-dia={dia}
            aria-pressed={dia === selecionado}
            aria-label={`${dataPorExtenso(dia)}${ehHoje ? ', hoje' : ''}`}
            onClick={() => aoSelecionar(dia)}
          >
            <span class="dia-semana">{ehHoje ? 'hoje' : nomeCurtoDoDia(dia)}</span>
            <span class="dia-numero">{Number(dia.slice(8, 10))}</span>
          </button>
        )
      })}
    </div>
  )
}
