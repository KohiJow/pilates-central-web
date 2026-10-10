import { CHAVE_DO_APP_CHECK } from '../config/firebase'

/**
 * Com o App Check ligado, o reCAPTCHA v3 roda invisível nas páginas que falam com o Firebase. O
 * selo dele fica escondido (a política de estilos não deixa o selo se posicionar), e o Google
 * pede em troca esta frase, com os dois links.
 */
export function AvisoDoRecaptcha() {
  if (!CHAVE_DO_APP_CHECK) return null
  return (
    <p class="entrar-rodape aviso-recaptcha">
      Este site é protegido pelo reCAPTCHA; valem a{' '}
      <a class="link" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
        política de privacidade
      </a>{' '}
      e os{' '}
      <a class="link" href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
        termos de serviço
      </a>{' '}
      do Google.
    </p>
  )
}
