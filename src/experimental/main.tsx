import '../estilos/fontes.css'
import '../estilos/tokens.css'
import '../estilos/base.css'
import '../estilos/movimento.css'
import '../estilos/componentes.css'
import '../estilos/telas.css'
import '../estilos/gestao.css'
import '../estilos/conta.css'
import '../estilos/vitrine.css'
import { render } from 'preact'
import { fixarAgora, iniciarRelogio, lerAgoraDaUrl } from '../app/relogio'
import { acompanharTemaDoSistema } from '../app/tema'
import { ativarRetornoDeToque } from '../movimento/toque'
import { origemDaPagina } from './dados'
import { PaginaExperimental } from './PaginaExperimental'

// ?agora= só na demonstração (fotos e testes num dia conhecido)
if (origemDaPagina() === 'demonstracao') fixarAgora(lerAgoraDaUrl(location.search))
iniciarRelogio()
acompanharTemaDoSistema()
ativarRetornoDeToque()

const raiz = document.getElementById('app')
if (raiz) render(<PaginaExperimental />, raiz)
