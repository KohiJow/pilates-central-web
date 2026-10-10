// Porta de entrada do Firebase, carregada com import() só quando o app abre com projeto
// configurado. Tudo o que usa o SDK sai daqui, para ficar num pedaço só.
export { ligarSdk } from './sdk'
export type { Sdk } from './sdk'
export {
  conferirConfirmacao,
  criarConta,
  entrarComEmail,
  ErroDeConta,
  observarUsuario,
  recuperarSenha,
  reenviarConfirmacao,
  sairDaConta,
  trocarSenha,
} from './autenticacao'
export type { Usuario } from './autenticacao'
export { reivindicarEstudio, resolverAcesso } from './acesso'
export type { Acesso, DadosDoPrimeiroAcesso } from './acesso'
export { criarRepositorioDaEquipe } from './repositorioDaEquipe'
export { criarRepositorioDoAluno } from './repositorioDoAluno'
