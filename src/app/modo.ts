import { signal } from '@preact/signals'
import type { ConfiguracaoDoFirebase } from '../config/firebase'
import { CONFIGURACAO_DO_FIREBASE, EMULADOR } from '../config/firebase'
import { gravarLocal, lerLocal } from './armazenamento'

// Duas portas: o estúdio de verdade (login no Firebase) ou a demonstração (dados fictícios no
// aparelho). A escolha fica guardada no aparelho; sem projeto configurado, só há demonstração.

export type Modo = 'demonstracao' | 'firebase'

const CHAVE_MODO = 'pc-modo'
const CHAVE_EMULADOR = 'pc-emulador'

/** Projetos de teste do emulador começam com "demo-" (o Firebase não aceita outro sem login). */
const PROJETO_DE_TESTE = /^demo-[a-z0-9-]{1,40}$/

/**
 * Emuladores do Firebase: só em localhost e só depois de pedir com `?emulador=1` (projeto
 * demo-pilates) ou `?emulador=demo-outro` (outro projeto de teste, para começar do zero). Fica
 * guardado para as navegações seguintes; `?emulador=0` desliga. Em qualquer outro endereço, nunca.
 */
export function decidirEmulador(hostname: string, pedido: string | null, guardado: string | null): string | null {
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') return null
  if (pedido === '0') return null
  if (pedido === '1') return EMULADOR.projectId
  if (pedido !== null) return PROJETO_DE_TESTE.test(pedido) ? pedido : null
  return guardado !== null && PROJETO_DE_TESTE.test(guardado) ? guardado : null
}

function lerEmulador(busca: string): string | null {
  const pedido = new URLSearchParams(busca).get('emulador')
  const projeto = decidirEmulador(location.hostname, pedido, lerLocal(CHAVE_EMULADOR))
  if (pedido !== null && projeto !== lerLocal(CHAVE_EMULADOR)) gravarLocal(CHAVE_EMULADOR, projeto)
  return projeto
}

const projetoDoEmulador = lerEmulador(location.search)
export const usaEmulador = projetoDoEmulador !== null

export const configuracaoAtiva: ConfiguracaoDoFirebase | null = projetoDoEmulador
  ? {
      apiKey: EMULADOR.apiKey,
      authDomain: `${projetoDoEmulador}.firebaseapp.com`,
      projectId: projetoDoEmulador,
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
