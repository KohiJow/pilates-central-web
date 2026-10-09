import type { ErrosDeCampo } from './resultado'
import { normalizarTelefone } from './texto'
import type { Configuracao } from './tipos'

export const CONFIGURACAO_PADRAO: Configuracao = {
  nomeEstudio: 'Pilates Central',
  whatsapp: '',
  validadeCreditoDias: 30,
  antecedenciaAvisoHoras: 3,
  limiteReposicoesMes: 0,
  alertaAusenciasSeguidas: 3,
  capacidadePadrao: 5,
}

export type CampoConfiguracao = keyof Configuracao

function inteiroEntre(valor: number, min: number, max: number): boolean {
  return Number.isInteger(valor) && valor >= min && valor <= max
}

/** Problemas por campo, em português simples; objeto vazio quando está tudo certo. */
export function validarConfiguracao(c: Configuracao): ErrosDeCampo<CampoConfiguracao> {
  const erros: ErrosDeCampo<CampoConfiguracao> = {}
  if (c.nomeEstudio.trim().length < 2) erros.nomeEstudio = 'Informe o nome do estúdio.'
  if (c.whatsapp && !normalizarTelefone(c.whatsapp)) erros.whatsapp = 'Use DDD e número, por exemplo (19) 90000-0000.'
  if (!inteiroEntre(c.validadeCreditoDias, 1, 180)) erros.validadeCreditoDias = 'A validade deve ficar entre 1 e 180 dias.'
  if (!inteiroEntre(c.antecedenciaAvisoHoras, 0, 72)) {
    erros.antecedenciaAvisoHoras = 'A antecedência deve ficar entre 0 e 72 horas.'
  }
  if (!inteiroEntre(c.limiteReposicoesMes, 0, 20)) erros.limiteReposicoesMes = 'Use um número de 0 a 20 (0 = sem limite).'
  if (!inteiroEntre(c.alertaAusenciasSeguidas, 2, 10)) {
    erros.alertaAusenciasSeguidas = 'Use um número de 2 a 10.'
  }
  if (!inteiroEntre(c.capacidadePadrao, 1, 20)) erros.capacidadePadrao = 'A capacidade deve ficar entre 1 e 20 alunos.'
  return erros
}

/** Lê a configuração guardada completando campos que vieram depois (dados antigos). */
export function completarConfiguracao(parcial: Partial<Configuracao>): Configuracao {
  return { ...CONFIGURACAO_PADRAO, ...parcial }
}

/** Resumo das regras de reposição, para quem não pode mudar (professor) saber como funciona. */
export function textoDasRegras(c: Configuracao): string {
  const aviso =
    c.antecedenciaAvisoHoras === 0
      ? 'Avisar a falta até o começo da aula'
      : `Avisar a falta com ${c.antecedenciaAvisoHoras} ${c.antecedenciaAvisoHoras === 1 ? 'hora' : 'horas'} de antecedência`
  const limite =
    c.limiteReposicoesMes > 0
      ? ` Até ${c.limiteReposicoesMes} ${c.limiteReposicoesMes === 1 ? 'reposição' : 'reposições'} por mês.`
      : ''
  return `${aviso} dá direito a uma reposição, que vale ${c.validadeCreditoDias} dias.${limite}`
}
