// Erros do login traduzidos para quem está na tela, sem depender do SDK (testável sem ele).
// Cada código do Firebase vira uma frase em português simples; o código bruto fica guardado
// para quem está configurando o projeto ver em "Detalhes". As mensagens não dizem se um e-mail
// tem conta ou não.

/** O que a pessoa estava tentando fazer: a mesma falha pede frases diferentes. */
export type Operacao = 'entrar' | 'criar' | 'senhaNova' | 'reenviar' | 'conferir' | 'trocarSenha' | 'sair'

/** Erro com mensagem pronta para a tela e o código bruto para "Detalhes". */
export class ErroDeConta extends Error {
  readonly codigo: string
  readonly detalhe: string

  constructor(mensagem: string, codigo = '', detalhe = '') {
    super(mensagem)
    this.name = 'ErroDeConta'
    this.codigo = codigo
    this.detalhe = detalhe || codigo
  }
}

export const SENHA_MINIMA = 8

const NAO_ATIVADO =
  'O login por e-mail e senha ainda não foi ativado no Firebase deste projeto. Quem cuida do projeto resolve no passo 2 de docs/firebase.md (Authentication, Começar, e depois E-mail/senha).'

const NAO_CONFEREM = 'E-mail ou senha não conferem.'

const SEM_REDE = 'Sem conexão com o login. Confira a internet (e se algum bloqueador está travando o site) e tente de novo.'

/** Código do erro como o SDK manda ("auth/..."), ou vazio. */
export function codigoDoErro(erro: unknown): string {
  if (typeof erro !== 'object' || erro === null) return ''
  const codigo = (erro as { code?: unknown }).code
  return typeof codigo === 'string' ? codigo : ''
}

function mensagemDoSdk(erro: unknown): string {
  return erro instanceof Error ? erro.message : ''
}

/**
 * A frase para o código. O SDK transforma códigos do servidor que não conhece em
 * "auth/<código-em-minúsculas>", então CONFIGURATION_NOT_FOUND (o Authentication nunca foi
 * iniciado no console) chega como auth/configuration-not-found.
 */
export function fraseDoCodigo(codigo: string, operacao: Operacao): string | null {
  const c = codigo.replace(/^auth\//, '')
  if (c === 'configuration-not-found' || c === 'operation-not-allowed' || c === 'admin-restricted-operation' || c === 'password-login-disabled') {
    return NAO_ATIVADO
  }
  if (c === 'network-request-failed' || c === 'timeout') return SEM_REDE
  if (c === 'too-many-requests') return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
  if (c === 'quota-exceeded') return 'O limite de e-mails do dia foi atingido. Tente de novo amanhã ou fale com quem cuida do projeto.'
  if (c === 'unauthorized-domain' || c === 'unauthorized-continue-uri') {
    return 'Este endereço do site não está autorizado no Firebase (Authentication, Configurações, Domínios autorizados).'
  }
  if (c.startsWith('api-key') || c.startsWith('requests-from-referer') || c === 'invalid-api-key' || c === 'app-not-authorized') {
    return 'A chave do projeto Firebase não vale para este site. Confira as variáveis FIREBASE_* e a restrição da chave no Google Cloud.'
  }
  if (c.startsWith('firebase-app-check') || c === 'missing-app-check-token' || c === 'invalid-app-check-token') {
    return 'O App Check não reconheceu este aparelho. Recarregue a página; se continuar, fale com quem cuida do projeto.'
  }
  if (c === 'invalid-email' || c === 'missing-email') return 'Confira o e-mail: parece que está faltando alguma coisa.'
  if (c === 'missing-password') return 'Digite a senha.'
  if (c === 'weak-password' || c === 'password-does-not-meet-requirements') {
    return `Use uma senha com pelo menos ${SENHA_MINIMA} caracteres.`
  }
  if (c === 'user-disabled') return 'Esta conta foi desativada no Firebase. Fale com a administração do estúdio.'
  if (c === 'requires-recent-login' || c === 'user-token-expired' || c === 'invalid-user-token') {
    return 'Por segurança, saia e entre de novo antes de fazer isto.'
  }
  if (c === 'user-mismatch') return 'A senha atual não confere.'
  if (c === 'email-already-in-use') {
    // mesma frase de qualquer outra recusa ao criar: a tela não diz se o e-mail tem conta
    return operacao === 'criar' ? fraseGenerica('criar') : null
  }
  if (c === 'invalid-credential' || c === 'wrong-password' || c === 'user-not-found' || c === 'invalid-login-credentials') {
    if (operacao === 'trocarSenha') return 'A senha atual não confere.'
    return operacao === 'entrar' ? NAO_CONFEREM : fraseGenerica(operacao)
  }
  return null
}

/** A frase quando o código não diz nada de útil (ou não há código). */
export function fraseGenerica(operacao: Operacao): string {
  switch (operacao) {
    case 'entrar':
      return NAO_CONFEREM
    case 'criar':
      // com a proteção contra enumeração do Firebase, "e-mail já usado" e "não deu" chegam
      // iguais: a frase cobre os dois sem dizer se a conta existe
      return 'Não deu para criar a conta com este e-mail. Se você já tem conta, toque em Já tenho conta ou em Esqueci a senha.'
    case 'senhaNova':
      return 'Não deu para pedir a senha nova agora. Tente de novo em alguns minutos.'
    case 'reenviar':
      return 'Não deu para reenviar agora. Tente de novo em alguns minutos.'
    case 'conferir':
      return 'Não deu para conferir a conta agora. Confira a internet e tente de novo.'
    case 'trocarSenha':
      return 'Não deu para trocar a senha agora. Tente de novo.'
    case 'sair':
      return 'Não deu para sair agora. Tente de novo.'
  }
}

/** Traduz qualquer erro do SDK (ou outro) para um ErroDeConta com frase, código e detalhe. */
export function erroDeConta(erro: unknown, operacao: Operacao): ErroDeConta {
  if (erro instanceof ErroDeConta) return erro
  const codigo = codigoDoErro(erro)
  const detalhe = [codigo, mensagemDoSdk(erro)].filter(Boolean).join(': ')
  return new ErroDeConta(fraseDoCodigo(codigo, operacao) ?? fraseGenerica(operacao), codigo, detalhe)
}
