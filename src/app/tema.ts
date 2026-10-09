import { signal } from '@preact/signals'
import { gravarLocal, lerLocal } from './armazenamento'

export type Tema = 'automatico' | 'claro' | 'escuro'

const CHAVE = 'pc-tema'
const COR_DA_BARRA = { claro: '#F5F1EE', escuro: '#1C120D' }

function ler(): Tema {
  const t = lerLocal(CHAVE)
  return t === 'light' ? 'claro' : t === 'dark' ? 'escuro' : 'automatico'
}

export const tema = signal<Tema>(ler())

const escuroDoSistema = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

/** Aplica o tema no <html> e pinta a barra do sistema (theme-color) com a cor do fundo. */
export function aplicarTema(t: Tema = tema.peek()): void {
  const raiz = document.documentElement
  if (t === 'automatico') raiz.removeAttribute('data-theme')
  else raiz.setAttribute('data-theme', t === 'escuro' ? 'dark' : 'light')
  const escuro = t === 'escuro' || (t === 'automatico' && escuroDoSistema())
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? COR_DA_BARRA.escuro : COR_DA_BARRA.claro)
}

export function escolherTema(t: Tema): void {
  tema.value = t
  gravarLocal(CHAVE, t === 'automatico' ? null : t === 'escuro' ? 'dark' : 'light')
  aplicarTema(t)
}

export function acompanharTemaDoSistema(): void {
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => aplicarTema())
  aplicarTema()
}
