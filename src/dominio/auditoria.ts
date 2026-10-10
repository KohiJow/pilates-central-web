// Registro de alterações (auditoria mínima): quem lançou ou apagou um pagamento, excluiu um
// cadastro, mexeu no acesso de alguém ou passou a conta, com a data. Só códigos ficam gravados;
// os nomes são procurados na hora de mostrar, então um aluno excluído aparece só pelo código.
import { dataCurta, horaFalada, momentoDe } from './datas'
import { emReais, nomeDaCompetencia } from './pagamentos'
import { NOME_DO_PAPEL } from './permissoes'
import type { AcaoAuditada, Centavos, Competencia, Id, Instante, Papel, RegistroDeAuditoria } from './tipos'

export const ACOES_AUDITADAS: readonly AcaoAuditada[] = [
  'pagamento-lancado',
  'pagamento-apagado',
  'aluno-excluido',
  'acesso-do-aluno-liberado',
  'acesso-do-aluno-tirado',
  'papel-mudado',
  'acesso-da-equipe-desligado',
  'acesso-da-equipe-religado',
  'conta-passada',
  'convite-revogado',
  'convite-reenviado',
]

/** Teto do complemento (o mesmo das regras do Firestore). */
export const DETALHE_MAXIMO = 120

/** Quantas linhas a tela mostra. */
export const LINHAS_DO_REGISTRO = 60

export function registroDeAuditoria(id: Id, acao: AcaoAuditada, porId: Id, alvoId: Id, em: Instante, detalhe = ''): RegistroDeAuditoria {
  return { id, acao, porId, alvoId, detalhe: detalhe.slice(0, DETALHE_MAXIMO), em }
}

/** Complemento de um pagamento: valor e mês, sem o nome de ninguém. */
export function detalheDoPagamento(valor: Centavos, competencia: Competencia): string {
  return `${emReais(valor)}, ${nomeDaCompetencia(competencia)}`
}

export function detalheDoPapel(papel: Papel): string {
  return NOME_DO_PAPEL[papel]
}

export interface Nomes {
  /** nome de alguém da equipe pelo id, ou undefined se não existe mais */
  equipe: (id: Id) => string | undefined
  /** nome do aluno pelo id, ou undefined se foi excluído */
  aluno: (id: Id) => string | undefined
}

const semAluno = (id: Id) => `aluno removido (${id})`

/** A linha como a administração lê: "Helena lançou R$ 280,00, outubro de 2026, de Ana Almeida". */
export function descreverAuditoria(r: RegistroDeAuditoria, nomes: Nomes): string {
  const quem = nomes.equipe(r.porId) ?? `alguém da equipe (${r.porId})`
  const aluno = () => nomes.aluno(r.alvoId) ?? semAluno(r.alvoId)
  const membro = () => nomes.equipe(r.alvoId) ?? `pessoa da equipe (${r.alvoId})`
  switch (r.acao) {
    case 'pagamento-lancado':
      return `${quem} lançou ${r.detalhe} de ${aluno()}`
    case 'pagamento-apagado':
      return `${quem} apagou o lançamento de ${r.detalhe} de ${aluno()}`
    case 'aluno-excluido':
      return `${quem} excluiu o cadastro ${r.alvoId} a pedido do aluno`
    case 'acesso-do-aluno-liberado':
      return `${quem} liberou o app para ${aluno()}`
    case 'acesso-do-aluno-tirado':
      return `${quem} tirou o app de ${aluno()}`
    case 'papel-mudado':
      return `${quem} mudou ${membro()} para ${r.detalhe}`
    case 'acesso-da-equipe-desligado':
      return `${quem} desligou o acesso de ${membro()}`
    case 'acesso-da-equipe-religado':
      return `${quem} religou o acesso de ${membro()}`
    case 'conta-passada':
      return `${quem} passou a conta do estúdio para ${membro()}`
    case 'convite-revogado':
      return `${quem} revogou o convite de ${membro()}`
    // o alvo pode ser alguém da equipe ou um aluno: o complemento diz qual
    case 'convite-reenviado':
      return `${quem} mandou de novo o convite de ${r.detalhe === 'aluno' ? aluno() : membro()}`
  }
}

/** "9/10 às 14h03" no relógio do estúdio. */
export function quandoFoi(em: Instante): string {
  const m = momentoDe(new Date(em))
  const hora = `${String(Math.floor(m.minutos / 60)).padStart(2, '0')}:${String(m.minutos % 60).padStart(2, '0')}`
  return `${dataCurta(m.data)} às ${horaFalada(hora)}`
}

/** Do mais recente para o mais antigo. */
export function ordenarAuditoria(lista: readonly RegistroDeAuditoria[]): RegistroDeAuditoria[] {
  return [...lista].sort((a, b) => b.em.localeCompare(a.em) || b.id.localeCompare(a.id))
}
