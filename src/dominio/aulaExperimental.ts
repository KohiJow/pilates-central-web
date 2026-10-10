// Aula experimental registrada na agenda: quem pediu pelo WhatsApp (ou na porta) entra numa aula
// com vaga, pelo nome e pelo telefone, sem virar aluno antes da hora. Ocupa um lugar, aparece na
// chamada, recebe presença ou falta e, se ficar, vira aluno com um toque. Nada disso gera
// crédito de reposição: não há plano por trás.
import { faseDaAula } from './agenda'
import type { Alteracoes, Contexto } from './presenca'
import { registroDe } from './presenca'
import { aceito, recusado } from './resultado'
import type { ErrosDeCampo, Resultado } from './resultado'
import { normalizarTelefone } from './texto'
import type { Aula, Experimental, Id, RegistroAula } from './tipos'

/** Teto por aula (o mesmo das regras do Firestore). */
export const MAXIMO_DE_EXPERIMENTAIS = 10

/** Tamanho do nome, como no cadastro do aluno (e nas regras). */
export const NOME_MAXIMO = 80

export interface RascunhoExperimental {
  nome: string
  telefone: string
}

export type CampoExperimental = keyof RascunhoExperimental

/** O nome como fica guardado: sem espaços sobrando nem a barra vertical e a quebra de linha, que o banco usa para separar. */
export function limparNome(nome: string): string {
  return nome.replace(/[|\n\r]/g, ' ').trim().replace(/\s+/g, ' ').slice(0, NOME_MAXIMO)
}

export function validarExperimental(r: RascunhoExperimental): ErrosDeCampo<CampoExperimental> {
  const erros: ErrosDeCampo<CampoExperimental> = {}
  if (limparNome(r.nome).length < 2) erros.nome = 'Escreva o nome da pessoa.'
  if (!normalizarTelefone(r.telefone)) erros.telefone = 'Use DDD e número, por exemplo (19) 90000-0000.'
  return erros
}

/**
 * Registra a pessoa na aula. Só com vaga, na aula de pé e antes de ela terminar; a mesma pessoa
 * (pelo telefone) não entra duas vezes na mesma aula.
 */
export function registrarExperimental(
  aula: Aula,
  registro: RegistroAula | undefined,
  id: Id,
  r: RascunhoExperimental,
  ctx: Contexto,
): Resultado<{ alteracoes: Alteracoes; experimental: Experimental }> {
  const erros = validarExperimental(r)
  const primeiroErro = Object.values(erros)[0]
  if (primeiroErro) return recusado('dados-invalidos', primeiroErro)
  if (aula.cancelamento) return recusado('aula-cancelada', 'Esta aula foi cancelada.')
  if (faseDaAula(aula, ctx.agora) === 'encerrada') return recusado('aula-encerrada', 'Esta aula já terminou.')
  if (aula.vagas <= 0) return recusado('sem-vaga', 'A aula está lotada.')
  const telefone = normalizarTelefone(r.telefone) ?? ''
  const atuais = registro?.experimentais ?? {}
  if (Object.values(atuais).some((e) => e.telefone === telefone)) {
    return recusado('nada-a-fazer', 'Essa pessoa já está registrada nesta aula.')
  }
  if (Object.keys(atuais).length >= MAXIMO_DE_EXPERIMENTAIS) {
    return recusado('sem-vaga', `Esta aula já tem ${MAXIMO_DE_EXPERIMENTAIS} aulas experimentais.`)
  }
  const experimental: Experimental = { nome: limparNome(r.nome), telefone }
  const novo = registroDe(aula, registro, ctx.instante)
  novo.experimentais = { ...atuais, [id]: experimental }
  return aceito({ alteracoes: { registros: [novo], creditos: [], creditosRemovidos: [] }, experimental })
}

/** Tira a pessoa da aula (desistiu, não vem mais). Depois que a aula terminou, fica no histórico. */
export function tirarExperimental(aula: Aula, registro: RegistroAula | undefined, id: Id, ctx: Contexto): Resultado<Alteracoes> {
  if (!registro?.experimentais?.[id]) return recusado('aluno-fora-da-aula', 'Esta pessoa não está nesta aula.')
  if (faseDaAula(aula, ctx.agora) === 'encerrada') {
    return recusado('aula-encerrada', 'A aula já terminou: a aula experimental fica no histórico.')
  }
  const novo = registroDe(aula, registro, ctx.instante)
  const experimentais = { ...registro.experimentais }
  delete experimentais[id]
  if (Object.keys(experimentais).length > 0) novo.experimentais = experimentais
  else delete novo.experimentais
  delete novo.marcacoes[id]
  return aceito({ registros: [novo], creditos: [], creditosRemovidos: [] })
}

/** A pessoa virou aluno: o registro da aula experimental passa a apontar para o cadastro. */
export function vincularAluno(registro: RegistroAula, id: Id, alunoId: Id, instante: string): RegistroAula | null {
  const atual = registro.experimentais?.[id]
  if (!atual || atual.alunoId) return null
  return { ...registro, experimentais: { ...registro.experimentais, [id]: { ...atual, alunoId } }, atualizadoEm: instante }
}

/** Quem veio experimentar nesta aula e ainda não virou aluno. */
export function experimentaisSemCadastro(registro: RegistroAula | undefined): [Id, Experimental][] {
  return Object.entries(registro?.experimentais ?? {}).filter(([, e]) => !e.alunoId)
}
