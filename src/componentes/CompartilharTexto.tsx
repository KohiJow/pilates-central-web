import { avisar } from './Avisos'
import { Botao } from './Botao'

/**
 * Passa adiante um texto pronto (um convite, com o link do app dentro): no celular abre o
 * compartilhar do sistema (WhatsApp, e-mail, o que a pessoa escolher); sem ele, copia o texto.
 */
export function CompartilharTexto({ titulo, texto, rotulo = 'Copiar o convite' }: { titulo: string; texto: string; rotulo?: string }) {
  const podeCompartilhar = typeof navigator.share === 'function'
  const compartilhar = async () => {
    if (podeCompartilhar) {
      try {
        await navigator.share({ title: titulo, text: texto })
      } catch {
        // a pessoa fechou o compartilhar: nada a fazer
      }
      return
    }
    try {
      await navigator.clipboard.writeText(texto)
      avisar({ texto: 'Convite copiado. É só colar na conversa com a pessoa.', icone: 'compartilhar' })
    } catch {
      avisar({ texto: 'Não deu para copiar. Mande pelo WhatsApp.', icone: 'info', duracao: 6000 })
    }
  }
  return (
    <Botao variante="secundario" icone="compartilhar" largo onClick={() => void compartilhar()}>
      {podeCompartilhar ? 'Compartilhar o convite' : rotulo}
    </Botao>
  )
}
