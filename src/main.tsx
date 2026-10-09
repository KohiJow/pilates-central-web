import './estilos/fontes.css'
import './estilos/tokens.css'
import './estilos/base.css'
import './estilos/movimento.css'
import './estilos/componentes.css'
import './estilos/telas.css'
import { render } from 'preact'
import { App } from './app/App'
import { acompanharInstalacao } from './app/instalacao'
import { acompanharSessao } from './app/perfil'
import { fixarAgora, hoje, iniciarRelogio, lerAgoraDaUrl } from './app/relogio'
import { acompanharTemaDoSistema } from './app/tema'
import { criarRepositorio } from './dados/criar'
import { carregar } from './dados/estado'
import { deveUsarTransicaoDeVista, movimentoReduzido, transicaoDeVista } from './movimento/preferencias'
import { ativarRetornoDeToque } from './movimento/toque'

// ?agora= só faz sentido na demonstração; com o Firebase (etapa 3) isto precisa ficar desligado,
// senão um link mudaria a data das marcações gravadas
fixarAgora(lerAgoraDaUrl(location.search))
iniciarRelogio()
acompanharTemaDoSistema()
acompanharInstalacao()
ativarRetornoDeToque()
acompanharSessao()
transicaoDeVista.ligada = deveUsarTransicaoDeVista(location.search) && !movimentoReduzido.peek()

const repositorio = criarRepositorio(location.search)
void carregar(repositorio, hoje.peek())

const raiz = document.getElementById('app')
if (raiz) render(<App repositorio={repositorio} />, raiz)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
  })
}
