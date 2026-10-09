// De onde a página pública tira os horários. Com o projeto do estúdio: o documento
// publico/estudio, mantido pelo app da equipe (só horários e vagas, sem nome de ninguém).
// Na demonstração: os mesmos cálculos sobre os dados fictícios guardados neste aparelho, então
// a vaga que alguém abriu avisando falta na demonstração aparece aqui.
import { armazenamentoDisponivel } from '../app/armazenamento'
import { configuracaoAtiva, modo, usaEmulador } from '../app/modo'
import { EMULADOR } from '../config/firebase'
import { criarRepositorioDeDemonstracao } from '../dados/demonstracao/repositorioDemonstracao'
import { momentoDe, somarDias } from '../dominio/datas'
import { DIAS_DA_JANELA, paginaPublica } from '../dominio/projecoes'
import type { PaginaPublica } from '../dominio/tipos'
import { decodificarCampos, enderecoDoDocumento } from './rest'
import type { ValorDoFirestore } from './rest'

export type Origem = 'demonstracao' | 'estudio'

/** Demonstração quando não há projeto, quando o link pede (?demo) ou quando o aparelho escolheu. */
export function origemDaPagina(): Origem {
  return modo.peek() === 'firebase' || (modo.peek() === null && configuracaoAtiva !== null) ? 'estudio' : 'demonstracao'
}

async function daDemonstracao(agora: Date): Promise<PaginaPublica> {
  const repo = criarRepositorioDeDemonstracao({ armazenamento: armazenamentoDisponivel(), agora: () => agora })
  const hoje = momentoDe(agora).data
  const [base, registros] = await Promise.all([repo.carregarBase(), repo.registros({ de: hoje, ate: somarDias(hoje, DIAS_DA_JANELA) })])
  const porId = new Map(registros.map((r) => [r.id, r]))
  return paginaPublica(
    { configuracao: base.configuracao, unidades: base.unidades, alunos: base.alunos, turmas: base.turmas, registro: (id) => porId.get(id) },
    momentoDe(agora),
    agora.toISOString(),
  )
}

async function doEstudio(): Promise<PaginaPublica | null> {
  const config = configuracaoAtiva
  if (!config) return null
  const url = enderecoDoDocumento({
    projeto: config.projectId,
    caminho: 'publico/estudio',
    chave: config.apiKey,
    ...(usaEmulador ? { emulador: `http://${EMULADOR.firestore.host}:${EMULADOR.firestore.porta}` } : {}),
  })
  const r = await fetch(url, { headers: { Accept: 'application/json' } })
  // sem o documento (o estúdio ainda não publicou) ou sem permissão: a página mostra só o contato
  if (r.status === 404 || r.status === 403) return null
  if (!r.ok) throw new Error(`página pública: ${r.status}`)
  const corpo = (await r.json()) as { fields?: Record<string, ValorDoFirestore> }
  return decodificarCampos(corpo.fields ?? {}) as unknown as PaginaPublica
}

export function carregarPagina(origem: Origem, agora: Date): Promise<PaginaPublica | null> {
  return origem === 'demonstracao' ? daDemonstracao(agora) : doEstudio()
}
