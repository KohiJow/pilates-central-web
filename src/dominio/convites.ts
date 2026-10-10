// Convites: a administração registra o convite (equipe ou aluno), a pessoa cria a conta com o
// e-mail convidado dentro do prazo e o papel passa a valer. O app não manda e-mail (plano
// gratuito, sem Cloud Functions): o convite vai pelo WhatsApp ou por um link copiado, com a
// mensagem pronta. O prazo é o mesmo que as regras do Firestore conferem na hora de aceitar.
import { dataCurta, momentoDe } from './datas'
import { primeiroNome } from './texto'
import type { Instante } from './tipos'

const MS_POR_DIA = 86_400_000

/** Até quando o convite vale: o instante do registro mais os dias combinados, em milissegundos. */
export function vencimentoDoConvite(enviadoEm: Instante, validadeDias: number): number {
  return new Date(enviadoEm).getTime() + validadeDias * MS_POR_DIA
}

export function conviteVencido(enviadoEm: Instante, validadeDias: number, agora: Date): boolean {
  return agora.getTime() > vencimentoDoConvite(enviadoEm, validadeDias)
}

/** "vale até 16/10" ou "venceu em 16/10", no relógio do estúdio. */
export function prazoDoConvite(enviadoEm: Instante, validadeDias: number, agora: Date): string {
  const dia = dataCurta(momentoDe(new Date(vencimentoDoConvite(enviadoEm, validadeDias))).data)
  return conviteVencido(enviadoEm, validadeDias, agora) ? `venceu em ${dia}` : `vale até ${dia}`
}

/**
 * O endereço que a pessoa convidada abre: o app, já na porta de entrar. Nada pessoal na URL (o
 * e-mail vai no texto da mensagem, não no link).
 */
export function linkDeEntrada(origem: string, base: string): string {
  return `${origem}${base}?entrar`
}

export type TipoDeConvite = 'equipe' | 'aluno'

/** A mensagem do convite, pronta para o WhatsApp ou para colar em qualquer lugar. */
export function mensagemDoConvite(tipo: TipoDeConvite, nome: string, email: string, link: string, validadeDias: number): string {
  const prazo = `O convite vale por ${validadeDias === 1 ? '1 dia' : `${validadeDias} dias`}.`
  if (tipo === 'aluno') {
    return (
      `Olá, ${primeiroNome(nome)}! O estúdio liberou o seu acesso ao app das aulas. Abra ${link}, toque em ` +
      `"Primeiro acesso? Criar conta" com o e-mail ${email} e confirme o e-mail no link que chegar. ` +
      `Pelo app você vê as suas aulas, avisa quando não puder vir e escolhe a reposição. ${prazo}`
    )
  }
  return (
    `Olá, ${primeiroNome(nome)}! Você foi convidado para a equipe do estúdio no app. Abra ${link}, toque em ` +
    `"Primeiro acesso? Criar conta" com o e-mail ${email} e confirme o e-mail no link que chegar. ${prazo}`
  )
}
