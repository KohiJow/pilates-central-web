// Como o app começa em cada porta. Demonstração: dados fictícios no aparelho, com relógio
// ajustável pela URL. Firebase: o SDK chega por import() (fora do pacote inicial), o login diz
// quem é a pessoa e o acesso gravado no banco diz o papel.
import { batch, signal } from '@preact/signals'
import { carregarAluno, dadosDoAluno, repositorioDoAluno } from '../dados/aluno'
import { criarRepositorio } from '../dados/criar'
import { criarAlunoDeDemonstracao } from '../dados/demonstracao/alunoDemonstracao'
import { base, carregar, equipePorId, repositorio, situacao } from '../dados/estado'
import type { Repositorio } from '../dados/repositorio'
import type * as ModuloDoFirebase from '../dados/firebase/firebase'
import type { DadosDoPrimeiroAcesso, Sdk, Usuario } from '../dados/firebase/firebase'
import type { Id } from '../dominio/tipos'
import { configuracaoAtiva, usaEmulador } from './modo'
import type { Modo } from './modo'
import { agoraDoApp, fixarAgora, hoje, lerAgoraDaUrl } from './relogio'
import { configurarSessao, entrar, entrarComoAluno, sessaoDoAluno } from './sessao'

type Nuvem = typeof ModuloDoFirebase

/** Uma falha pronta para a tela: a frase para a pessoa e, para quem configura, o detalhe bruto. */
export interface ErroNaTela {
  mensagem: string
  detalhe?: string
}

export type EstadoDaConta =
  | { etapa: 'carregando' }
  | { etapa: 'falhou'; mensagem: string }
  | { etapa: 'fora' }
  /** enviadoEm: quando o último e-mail de confirmação saiu (a espera para reenviar conta daí) */
  | { etapa: 'confirmar'; email: string; enviadoEm?: number; falhaNoEnvio?: ErroNaTela }
  | { etapa: 'verificando' }
  | { etapa: 'primeiroAcesso'; email: string }
  | { etapa: 'semAcesso'; email: string; mensagem: string }
  | { etapa: 'equipe' }
  | { etapa: 'aluno' }

export const conta = signal<EstadoDaConta>({ etapa: 'carregando' })

let iniciado: Modo | null = null
let repoDemonstracao: Repositorio | null = null
let nuvem: Nuvem | null = null
let sdk: Sdk | null = null
let usuario: Usuario | null = null

// ---------- demonstração ----------

function iniciarDemonstracao(): void {
  configurarSessao({ guardar: true, aoSair: null })
  // ?agora= e ?atraso= só existem aqui: no Firebase, um link mudaria a data das marcações
  fixarAgora(lerAgoraDaUrl(location.search))
  const repo = criarRepositorio(location.search)
  repoDemonstracao = repo
  void carregar(repo, hoje.peek())
  const aluno = sessaoDoAluno.peek()
  if (aluno) void carregarAluno(criarAlunoDeDemonstracao(repo, aluno.alunoId, agoraDoApp))
}

/** Explorar como aluno, na demonstração. */
export function entrarComoAlunoDaDemonstracao(alunoId: Id): void {
  if (!repoDemonstracao) return
  entrarComoAluno(alunoId)
  void carregarAluno(criarAlunoDeDemonstracao(repoDemonstracao, alunoId, agoraDoApp))
}

// ---------- Firebase ----------

const ERRO_DE_CARGA = 'Não deu para abrir o app. Confira a internet e recarregue a página (pode ter saído uma versão nova).'

function limparDados(): void {
  batch(() => {
    repositorio.value = null
    base.value = null
    situacao.value = 'carregando'
    repositorioDoAluno.value = null
    dadosDoAluno.value = null
  })
}

async function iniciarFirebase(): Promise<void> {
  configurarSessao({ guardar: false, aoSair: () => void sairDaConta() })
  conta.value = { etapa: 'carregando' }
  const config = configuracaoAtiva
  if (!config) {
    conta.value = { etapa: 'falhou', mensagem: ERRO_DE_CARGA }
    return
  }
  try {
    nuvem = await import('../dados/firebase/firebase')
  } catch {
    conta.value = { etapa: 'falhou', mensagem: ERRO_DE_CARGA }
    return
  }
  sdk = nuvem.ligarSdk(config, usaEmulador)
  nuvem.observarUsuario(sdk, (u) => void aoMudarUsuario(u))
}

async function aoMudarUsuario(u: Usuario | null): Promise<void> {
  usuario = u
  if (!u) {
    limparDados()
    conta.value = { etapa: 'fora' }
    return
  }
  if (!u.emailConfirmado) {
    // a criação da conta já pode ter posto a tela de confirmar, com a hora do envio
    const atual = conta.peek()
    if (atual.etapa !== 'confirmar' || atual.email !== u.email) conta.value = { etapa: 'confirmar', email: u.email }
    return
  }
  await abrirConta(u)
}

async function abrirConta(u: Usuario): Promise<void> {
  if (!nuvem || !sdk) return
  conta.value = { etapa: 'verificando' }
  try {
    const acesso = await nuvem.resolverAcesso(sdk, u)
    if (acesso.tipo === 'equipe') {
      const repo = nuvem.criarRepositorioDaEquipe(sdk, { uid: u.uid, membroId: acesso.membroId, agora: agoraDoApp })
      await carregar(repo, hoje.peek())
      const eu = equipePorId.peek().get(acesso.membroId)
      if (situacao.peek() !== 'pronto' || !eu || !eu.ativo) {
        conta.value = { etapa: 'semAcesso', email: u.email, mensagem: 'O seu acesso à equipe foi desligado. Fale com a administração do estúdio.' }
        return
      }
      entrar({ papel: eu.papel, membroId: eu.id })
      conta.value = { etapa: 'equipe' }
      return
    }
    if (acesso.tipo === 'aluno') {
      entrarComoAluno(acesso.alunoId)
      await carregarAluno(nuvem.criarRepositorioDoAluno(sdk, acesso.alunoId, agoraDoApp))
      conta.value = { etapa: 'aluno' }
      return
    }
    if (acesso.tipo === 'primeiroAcesso') {
      conta.value = { etapa: 'primeiroAcesso', email: u.email }
      return
    }
    conta.value = {
      etapa: 'semAcesso',
      email: u.email,
      mensagem: 'Este e-mail ainda não tem convite. Peça à administração do estúdio para convidar você com este e-mail.',
    }
  } catch (erro) {
    conta.value = {
      etapa: 'semAcesso',
      email: u.email,
      mensagem: descreverErro(erro, 'Não deu para conferir o seu acesso agora. Confira a internet e tente de novo.').mensagem,
    }
  }
}

function precisaDaNuvem(): { nuvem: Nuvem; sdk: Sdk } {
  if (!nuvem || !sdk) throw new Error('Firebase ainda não carregou')
  return { nuvem, sdk }
}

/** Frase pronta para a tela, venha o erro de onde vier, com o detalhe bruto para quem configura. */
export function descreverErro(erro: unknown, padrao = 'Algo deu errado. Tente de novo.'): ErroNaTela {
  if (nuvem && erro instanceof nuvem.ErroDeConta) return erro.detalhe ? { mensagem: erro.message, detalhe: erro.detalhe } : { mensagem: erro.message }
  const detalhe = erro instanceof Error ? erro.message : ''
  return detalhe ? { mensagem: padrao, detalhe } : { mensagem: padrao }
}

export async function entrarNaConta(email: string, senha: string, lembrar = true): Promise<void> {
  const n = precisaDaNuvem()
  await n.nuvem.entrarComEmail(n.sdk, email, senha, lembrar)
}

export async function criarContaNova(email: string, senha: string, lembrar = true): Promise<void> {
  const n = precisaDaNuvem()
  try {
    const u = await n.nuvem.criarConta(n.sdk, email, senha, lembrar)
    conta.value = { etapa: 'confirmar', email: u.email, enviadoEm: Date.now() }
  } catch (erro) {
    // a conta já existe e só o e-mail de confirmação falhou: a tela de confirmar diz o motivo
    const criada = n.sdk.auth.currentUser
    if (criada?.email) {
      conta.value = { etapa: 'confirmar', email: criada.email.toLowerCase(), falhaNoEnvio: descreverErro(erro) }
      return
    }
    throw erro
  }
}

export async function pedirNovaSenha(email: string): Promise<void> {
  const n = precisaDaNuvem()
  await n.nuvem.recuperarSenha(n.sdk, email)
}

export async function reenviarEmailDeConfirmacao(): Promise<void> {
  const n = precisaDaNuvem()
  const atual = conta.peek()
  await n.nuvem.reenviarConfirmacao(n.sdk)
  if (atual.etapa === 'confirmar') conta.value = { etapa: 'confirmar', email: atual.email, enviadoEm: Date.now() }
}

/** "Já confirmei": recarrega a conta; devolve false se o e-mail ainda não foi confirmado. */
export async function jaConfirmei(): Promise<boolean> {
  const n = precisaDaNuvem()
  const u = await n.nuvem.conferirConfirmacao(n.sdk)
  if (!u) {
    conta.value = { etapa: 'fora' }
    return false
  }
  if (!u.emailConfirmado) return false
  usuario = u
  await abrirConta(u)
  return true
}

export async function trocarSenhaDaConta(senhaAtual: string, senhaNova: string): Promise<void> {
  const n = precisaDaNuvem()
  await n.nuvem.trocarSenha(n.sdk, senhaAtual, senhaNova)
}

export async function reivindicar(dados: DadosDoPrimeiroAcesso): Promise<void> {
  const n = precisaDaNuvem()
  if (!usuario) throw new Error('sem conta')
  await n.nuvem.reivindicarEstudio(n.sdk, usuario, dados)
  await abrirConta(usuario)
}

export async function sairDaConta(): Promise<void> {
  if (!nuvem || !sdk) return
  await nuvem.sairDaConta(sdk)
}

/** Tenta de novo depois de uma falha de rede ao conferir o acesso. */
export function tentarDeNovo(): void {
  if (usuario?.emailConfirmado) void abrirConta(usuario)
}

/** E-mail da conta que entrou (Firebase), para a tela de ajustes. */
export function emailDaConta(): string | null {
  return usuario?.email ?? null
}

// ---------- início ----------

/** Liga a porta escolhida (uma vez por carregamento da página). */
export function iniciar(m: Modo): void {
  if (iniciado === m) return
  if (iniciado !== null) {
    // trocar de porta com o app aberto: começa do zero
    location.reload()
    return
  }
  iniciado = m
  if (m === 'demonstracao') iniciarDemonstracao()
  else void iniciarFirebase()
}
