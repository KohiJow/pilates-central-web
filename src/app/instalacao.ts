import { signal } from '@preact/signals'

// Android/Chrome avisa que dá para instalar (beforeinstallprompt). No iPhone não existe esse
// evento: o app explica o caminho (Compartilhar > Adicionar à Tela de Início).
interface EventoDeInstalacao extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const pedido = signal<EventoDeInstalacao | null>(null)
export const podeInstalar = signal(false)

export const ehIPhone = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export const estaInstalado = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export function acompanharInstalacao(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    pedido.value = e as EventoDeInstalacao
    podeInstalar.value = true
  })
  window.addEventListener('appinstalled', () => {
    pedido.value = null
    podeInstalar.value = false
  })
}

export async function instalar(): Promise<boolean> {
  const e = pedido.peek()
  if (!e) return false
  await e.prompt()
  const escolha = await e.userChoice
  pedido.value = null
  podeInstalar.value = false
  return escolha.outcome === 'accepted'
}
