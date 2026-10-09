import { armazenamentoDisponivel } from '../app/armazenamento'
import { agoraDoApp } from '../app/relogio'
import { criarRepositorioDeDemonstracao } from './demonstracao/repositorioDemonstracao'
import type { RepositorioDeDemonstracao } from './repositorio'

/**
 * Camada de dados do modo demonstração: dados fictícios guardados no aparelho. A do Firebase
 * chega por import() em app/conta.ts, só quando a pessoa escolhe Entrar.
 */
export function criarRepositorio(busca: string): RepositorioDeDemonstracao {
  const atraso = Number(new URLSearchParams(busca).get('atraso') ?? 0)
  return criarRepositorioDeDemonstracao({
    armazenamento: armazenamentoDisponivel(),
    agora: agoraDoApp,
    atrasoMs: Number.isFinite(atraso) ? Math.min(Math.max(atraso, 0), 5000) : 0,
  })
}
