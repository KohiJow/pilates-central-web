// No Safari do iPhone, :active só é aplicado se houver algum ouvinte de touchstart na página.
// Sem isso, o botão não "afunda" no toque. Um ouvinte vazio e passivo resolve sem custo.
export function ativarRetornoDeToque(): void {
  document.addEventListener('touchstart', () => undefined, { passive: true })
}
