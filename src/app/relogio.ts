import { computed, signal } from '@preact/signals'
import { momentoDe } from '../dominio/datas'

// Relógio do app. Na demonstração dá para fixar o "agora" pela URL (?agora=2026-10-09T10:00,
// hora de Campinas): os testes ficam previsíveis e dá para mostrar o app num dia cheio.
let deslocamentoMs = 0

export function lerAgoraDaUrl(busca: string): Date | undefined {
  const valor = new URLSearchParams(busca).get('agora')
  if (!valor || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return undefined
  const data = new Date(`${valor}:00-03:00`)
  return Number.isNaN(data.getTime()) ? undefined : data
}

export function fixarAgora(agora: Date | undefined): void {
  deslocamentoMs = agora ? agora.getTime() - Date.now() : 0
  instante.value = agoraDoApp()
}

export function agoraDoApp(): Date {
  return new Date(Date.now() + deslocamentoMs)
}

/** Atualizado a cada 30 s e quando o app volta para a frente. */
export const instante = signal(agoraDoApp())
export const momento = computed(() => momentoDe(instante.value))
export const hoje = computed(() => momento.value.data)

let iniciado = false
export function iniciarRelogio(): void {
  if (iniciado) return
  iniciado = true
  const tic = () => {
    instante.value = agoraDoApp()
  }
  setInterval(tic, 30_000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tic()
  })
}
