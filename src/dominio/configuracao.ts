import type { ErrosDeCampo } from './resultado'
import { normalizarTelefone, primeiroNome } from './texto'
import type { Configuracao, TextosDoEstudio } from './tipos'

/** Tetos dos textos do estúdio (os mesmos das regras do Firestore). */
export const TAMANHOS = {
  nomeEstudio: 80,
  fraseCurta: 160,
  focos: 3,
  foco: 40,
  endereco: 200,
  linkDoMapa: 300,
  instagram: 30,
} as const

export const CONFIGURACAO_PADRAO: Configuracao = {
  nomeEstudio: 'Pilates Central',
  whatsapp: '',
  fraseCurta: '',
  focos: [],
  endereco: '',
  linkDoMapa: '',
  instagram: '',
  validadeCreditoDias: 30,
  antecedenciaAvisoHoras: 3,
  limiteReposicoesMes: 0,
  alertaAusenciasSeguidas: 3,
  capacidadePadrao: 5,
  // os dois começam desligados: a administração liga quando quiser
  acessoDoAluno: false,
  paginaExperimental: false,
}

export type CampoConfiguracao = keyof Configuracao

function inteiroEntre(valor: number, min: number, max: number): boolean {
  return Number.isInteger(valor) && valor >= min && valor <= max
}

/** Texto numa linha só, sem espaços sobrando nem a barra vertical (separador no banco). */
function linha(texto: string): string {
  return texto.replace(/[|\n\r]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** O usuário do Instagram como a pessoa digita ("@estudio", "instagram.com/estudio/") vira só o nome. */
export function normalizarInstagram(texto: string): string {
  return texto
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?].*$/, '')
}

export function ehInstagramValido(usuario: string): boolean {
  return /^[A-Za-z0-9._]{1,30}$/.test(usuario)
}

export function ehLinkDoMapaValido(link: string): boolean {
  if (link.length > TAMANHOS.linkDoMapa) return false
  try {
    const u = new URL(link)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

/** Os textos do estúdio como ficam guardados: aparados, sem separadores, nos tetos. */
export function limparTextosDoEstudio(t: TextosDoEstudio): TextosDoEstudio {
  return {
    fraseCurta: linha(t.fraseCurta).slice(0, TAMANHOS.fraseCurta),
    focos: t.focos.map(linha).filter(Boolean).slice(0, TAMANHOS.focos).map((f) => f.slice(0, TAMANHOS.foco)),
    endereco: t.endereco.replace(/\|/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, TAMANHOS.endereco),
    linkDoMapa: t.linkDoMapa.trim(),
    instagram: normalizarInstagram(t.instagram),
  }
}

/** Problemas por campo, em português simples; objeto vazio quando está tudo certo. */
export function validarConfiguracao(c: Configuracao): ErrosDeCampo<CampoConfiguracao> {
  const erros: ErrosDeCampo<CampoConfiguracao> = {}
  const nome = c.nomeEstudio.trim()
  if (nome.length < 2) erros.nomeEstudio = 'Informe o nome do estúdio.'
  else if (nome.length > TAMANHOS.nomeEstudio) erros.nomeEstudio = `Use no máximo ${TAMANHOS.nomeEstudio} letras.`
  if (c.whatsapp && !normalizarTelefone(c.whatsapp)) erros.whatsapp = 'Use DDD e número, por exemplo (19) 90000-0000.'
  const textos = limparTextosDoEstudio(c)
  if (linha(c.fraseCurta).length > TAMANHOS.fraseCurta) erros.fraseCurta = `Use no máximo ${TAMANHOS.fraseCurta} letras.`
  if (c.focos.some((f) => linha(f).length > TAMANHOS.foco)) erros.focos = `Cada foco tem no máximo ${TAMANHOS.foco} letras.`
  if (c.endereco.trim().length > TAMANHOS.endereco) erros.endereco = `Use no máximo ${TAMANHOS.endereco} letras.`
  if (textos.linkDoMapa && !ehLinkDoMapaValido(textos.linkDoMapa)) erros.linkDoMapa = 'Cole o link completo do mapa, começando com https://.'
  if (textos.instagram && !ehInstagramValido(textos.instagram)) erros.instagram = 'Use só o nome do perfil, como no Instagram (letras, números, ponto e sublinhado).'
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
  return { ...CONFIGURACAO_PADRAO, ...parcial, focos: Array.isArray(parcial.focos) ? parcial.focos : [] }
}

/** A palavra da marca d'água: a primeira do nome do estúdio, em caixa alta. */
export function palavraDaMarca(nomeEstudio: string): string {
  return (primeiroNome(nomeEstudio) || primeiroNome(CONFIGURACAO_PADRAO.nomeEstudio)).toUpperCase()
}

/** Endereço da página do Instagram, a partir do usuário guardado. */
export function linkDoInstagram(usuario: string): string {
  return `https://www.instagram.com/${encodeURIComponent(usuario)}/`
}

/** Link do mapa: o configurado ou a busca pelo endereço. */
export function linkDoMapaDe(endereco: string, linkConfigurado = ''): string {
  return linkConfigurado || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`
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
