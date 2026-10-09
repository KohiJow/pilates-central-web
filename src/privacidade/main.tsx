import '../estilos/fontes.css'
import '../estilos/tokens.css'
import '../estilos/base.css'
import '../estilos/movimento.css'
import '../estilos/componentes.css'
import '../estilos/telas.css'
import '../estilos/conta.css'
import '../estilos/vitrine.css'
import { render } from 'preact'
import { acompanharTemaDoSistema } from '../app/tema'
import { AvisoDePrivacidade } from './AvisoDePrivacidade'

acompanharTemaDoSistema()

const raiz = document.getElementById('app')
if (raiz) render(<AvisoDePrivacidade />, raiz)
