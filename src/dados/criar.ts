import { armazenamentoDisponivel } from '../app/armazenamento'
import { agoraDoApp } from '../app/relogio'
import { criarRepositorioDeDemonstracao } from './demonstracao/repositorioDemonstracao'
import type { RepositorioDeDemonstracao } from './repositorio'

/**
 * Escolhe a camada de dados. Sem projeto Firebase configurado (etapa 2), o app roda em
 * modo demonstração, com dados fictícios guardados no aparelho.
 */
export function criarRepositorio(busca: string): RepositorioDeDemonstracao {
  const atraso = Number(new URLSearchParams(busca).get('atraso') ?? 0)
  return criarRepositorioDeDemonstracao({
    armazenamento: armazenamentoDisponivel(),
    agora: agoraDoApp,
    atrasoMs: Number.isFinite(atraso) ? Math.min(Math.max(atraso, 0), 5000) : 0,
  })
}
