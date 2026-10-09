import type { Configuracao } from './tipos'

export const CONFIGURACAO_PADRAO: Configuracao = {
  nomeEstudio: 'Pilates Central',
  whatsapp: '',
  validadeCreditoDias: 30,
  antecedenciaAvisoHoras: 3,
  capacidadePadrao: 5,
}

/** Lista de problemas em texto simples; vazia quando está tudo certo. */
export function validarConfiguracao(c: Configuracao): string[] {
  const erros: string[] = []
  if (c.nomeEstudio.trim().length < 2) erros.push('Informe o nome do estúdio.')
  if (c.whatsapp && !/^55\d{10,11}$/.test(c.whatsapp)) {
    erros.push('WhatsApp: use DDI 55, DDD e número, só dígitos.')
  }
  if (!Number.isInteger(c.validadeCreditoDias) || c.validadeCreditoDias < 1 || c.validadeCreditoDias > 180) {
    erros.push('A validade do crédito deve ficar entre 1 e 180 dias.')
  }
  if (!Number.isInteger(c.antecedenciaAvisoHoras) || c.antecedenciaAvisoHoras < 0 || c.antecedenciaAvisoHoras > 72) {
    erros.push('A antecedência do aviso deve ficar entre 0 e 72 horas.')
  }
  if (!Number.isInteger(c.capacidadePadrao) || c.capacidadePadrao < 1 || c.capacidadePadrao > 20) {
    erros.push('A capacidade padrão deve ficar entre 1 e 20 alunos.')
  }
  return erros
}
