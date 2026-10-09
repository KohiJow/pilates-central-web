import { signal } from '@preact/signals'
import type { ConfiguracaoDoFirebase } from '../config/firebase'
import { CONFIGURACAO_DO_FIREBASE, EMULADOR } from '../config/firebase'
import { gravarLocal, lerLocal } from './armazenamento'

// Duas portas: o estúdio de verdade (login no Firebase) ou a demonstração (dados fictícios no
// aparelho). A escolha fica guardada no aparelho; sem projeto configurado, só há demonstração.

export type Modo = 'demonstracao' | 'firebase'

const CHAVE_MODO = 'pc-modo'
const CHAVE_EMULADOR = 'pc-emulador'

function ehLocal(): boolean {
  return location.hostname === 'localhost' || location.hostname === '127.0.0.1'
}

/**
 * Emuladores do Firebase: só em localhost e só depois de pedir com `?emulador=1` (fica guardado
 * para as navegações seguintes; `?emulador=0` desliga). No site publicado nunca liga.
 */
function lerEmulador(busca: string): boolean {
  if (!ehLocal()) return false
  const pedido = new URLSearchParams(busca).get('emulador')
  if (pedido === '1') gravarLocal(CHAVE_EMULADOR, '1')
  if (pedido === '0') gravarLocal(CHAVE_EMULADOR, null)
  return lerLocal(CHAVE_EMULADOR) === '1'
}

export const usaEmulador = lerEmulador(location.search)

export const configuracaoAtiva: ConfiguracaoDoFirebase | null = usaEmulador
  ? {
      apiKey: EMULADOR.apiKey,
      authDomain: EMULADOR.authDomain,
      projectId: EMULADOR.projectId,
      storageBucket: '',
      messagingSenderId: '',
      appId: 'emulador',
    }
  : CONFIGURACAO_DO_FIREBASE

export const temProjeto = configuracaoAtiva !== null

function modoInicial(busca: string): Modo | null {
  if (!temProjeto) return 'demonstracao'
  const params = new URLSearchParams(busca)
  // link direto para a demonstração (README, página pública)
  if (params.has('demo')) {
    gravarLocal(CHAVE_MODO, 'demonstracao')
    return 'demonstracao'
  }
  const guardado = lerLocal(CHAVE_MODO)
  return guardado === 'demonstracao' || guardado === 'firebase' ? guardado : null
}

/** null = ainda não escolheu a porta */
export const modo = signal<Modo | null>(modoInicial(location.search))

export function escolherModo(m: Modo): void {
  gravarLocal(CHAVE_MODO, m)
  modo.value = m
}

/** Volta às duas portas (só faz sentido com projeto configurado). */
export function voltarAsPortas(): void {
  gravarLocal(CHAVE_MODO, null)
  modo.value = temProjeto ? null : 'demonstracao'
}
