// O service worker e a versão nova. O SW guarda o app para abrir sem internet; quando sai uma
// versão nova, ela fica esperando (não toma o lugar da que está na tela) até a pessoa tocar em
// "Atualizar": trocar o código com o app aberto deixaria duas versões convivendo. O aviso volta
// toda vez que o app ganha o foco, enquanto a versão nova esperar.
import { avisar } from '../componentes/Avisos'

const MENSAGEM = 'Tem uma versão nova do app.'
const INTERVALO_DE_BUSCA_MS = 60 * 60_000

let avisando = false
let pediuParaAtivar = false

function pedirParaAtivar(registro: ServiceWorkerRegistration): void {
  pediuParaAtivar = true
  registro.waiting?.postMessage({ tipo: 'ativar' })
}

function avisarVersaoNova(registro: ServiceWorkerRegistration): void {
  if (!registro.waiting || avisando) return
  avisando = true
  avisar({
    texto: MENSAGEM,
    icone: 'recomecar',
    duracao: 30_000,
    acao: { rotulo: 'Atualizar', executar: () => pedirParaAtivar(registro) },
  })
  setTimeout(() => (avisando = false), 30_000)
}

export function registrarServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  const sw = navigator.serviceWorker
  // na primeira visita a página não tem controlador e a primeira versão assume sem recarregar
  // nada; depois disso, o controlador só troca quando uma versão nova assumiu (pelo "Atualizar"
  // daqui ou de outra aba), e aí a página recarrega para rodar só ela
  const tinhaControlador = Boolean(sw.controller)
  let recarregando = false
  sw.addEventListener('controllerchange', () => {
    if (recarregando || !sw.controller || !(tinhaControlador || pediuParaAtivar)) return
    recarregando = true
    location.reload()
  })
  window.addEventListener('load', () => {
    void sw
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then((registro) => {
        if (registro.waiting && sw.controller) avisarVersaoNova(registro)
        registro.addEventListener('updatefound', () => {
          const novo = registro.installing
          if (!novo) return
          novo.addEventListener('statechange', () => {
            // instalado com outro no comando: é uma versão nova esperando
            if (novo.state === 'installed' && sw.controller) avisarVersaoNova(registro)
          })
        })
        // procura versão nova ao voltar para o app e de hora em hora
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState !== 'visible') return
          if (registro.waiting) avisarVersaoNova(registro)
          else void registro.update().catch(() => undefined)
        })
        setInterval(() => void registro.update().catch(() => undefined), INTERVALO_DE_BUSCA_MS)
      })
      .catch(() => undefined)
  })
}
