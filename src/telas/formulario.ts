/**
 * Depois de mostrar os erros de um formulário, leva o foco (e a tela) ao primeiro campo com
 * problema: com o teclado do celular aberto, a pessoa não precisa procurar o que corrigir.
 */
export function focarPrimeiroErro(raiz: HTMLElement | null): void {
  requestAnimationFrame(() => {
    const campo = raiz?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (!campo) return
    campo.focus({ preventScroll: true })
    campo.scrollIntoView({ block: 'center' })
  })
}
