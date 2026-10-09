import './estilos/fontes.css'
import './estilos/tokens.css'
import './estilos/base.css'
import './estilos/movimento.css'
import './estilos/componentes.css'
import './estilos/telas.css'
import './estilos/gestao.css'
import './estilos/conta.css'
import { render } from 'preact'
import { App } from './app/App'
import { iniciar } from './app/conta'
import { acompanharInstalacao } from './app/instalacao'
import { modo } from './app/modo'
import { acompanharHistorico } from './app/navegacao'
import { acompanharSessao } from './app/perfil'
import { iniciarRelogio } from './app/relogio'
import { acompanharTemaDoSistema } from './app/tema'
import { deveUsarTransicaoDeVista, movimentoReduzido, transicaoDeVista } from './movimento/preferencias'
import { ativarRetornoDeToque } from './movimento/toque'

iniciarRelogio()
acompanharTemaDoSistema()
acompanharInstalacao()
ativarRetornoDeToque()
acompanharSessao()
acompanharHistorico()
transicaoDeVista.ligada = deveUsarTransicaoDeVista(location.search) && !movimentoReduzido.peek()

// a porta já escolhida neste aparelho abre direto; senão, a tela das duas portas decide
const escolhido = modo.peek()
if (escolhido) iniciar(escolhido)

const raiz = document.getElementById('app')
if (raiz) render(<App />, raiz)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
  })
}
