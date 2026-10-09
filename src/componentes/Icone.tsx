// Ícones de traço próprios, no estilo das capas dos destaques do estúdio: linha média,
// cantos arredondados, sem preenchimento. Grade de 24px, traço de 1,75px.

const CAMINHOS = {
  hoje: 'M12 6.5v2M6.3 9.8l1.4 1.4M17.7 9.8l-1.4 1.4M3.5 15h2M18.5 15h2M8 18a4 4 0 0 1 8 0M3 18h18M7 21h10',
  agenda:
    'M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5zM4 10h16M8.5 3v4M15.5 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01',
  mais: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM8 12h.01M12 12h.01M16 12h.01',
  alunos:
    'M9 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM3.5 19.5a5.5 5.5 0 0 1 11 0M16.5 6.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM16 14.1a4.5 4.5 0 0 1 4.5 5.4',
  financeiro: 'M4 7.5A2.5 2.5 0 0 1 6.5 5H17v3M4 7.5v10A2.5 2.5 0 0 0 6.5 20H20V8H6.5A2.5 2.5 0 0 1 4 5.5M16 14h.01',
  presente: 'M5 12.5l4.5 4.5L19 7.5',
  faltou: 'M7 7l10 10M17 7 7 17',
  avisou:
    'M5 5.5h14A1.5 1.5 0 0 1 20.5 7v8.5A1.5 1.5 0 0 1 19 17h-8.5l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5zM8 10h8M8 13h5',
  reposicao: 'M4.5 12a7.5 7.5 0 0 1 13-5.1M19.5 12a7.5 7.5 0 0 1-13 5.1M17.5 3.5V7H14M6.5 20.5V17H10',
  relogio: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM12 7.5V12l3 2',
  local: 'M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-4.5a2 2 0 0 1 4 0V20',
  voltar: 'M14.5 6l-6 6 6 6',
  avancar: 'M9.5 6l6 6-6 6',
  fechar: 'M7 7l10 10M17 7 7 17',
  busca: 'M11 4.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM16 16l4 4',
  tema: 'M12 3.5a8.5 8.5 0 1 0 8.5 8.5A6.5 6.5 0 0 1 12 3.5z',
  recomecar: 'M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4 4.5v4h4',
  sair: 'M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4M10 8l-4 4 4 4M6 12h9',
  instalar:
    'M8 3.5h8A1.5 1.5 0 0 1 17.5 5v14a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 19V5A1.5 1.5 0 0 1 8 3.5zM12 8v6M9.5 11.5 12 14l2.5-2.5',
  compartilhar:
    'M12 3.5v11M8.5 7 12 3.5 15.5 7M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7a1.5 1.5 0 0 0-1.5-1.5H16',
  info: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM12 11v5M12 8h.01',
  pessoa: 'M12 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM5.5 20a6.5 6.5 0 0 1 13 0',
  adicionar: 'M12 5v14M5 12h14',
  desfazer: 'M9 7 4.5 11.5 9 16M5 11.5h9.5a5 5 0 0 1 0 10H12',
  coracao: 'M12 19.5s-7.5-4.5-7.5-10A4 4 0 0 1 12 7.4a4 4 0 0 1 7.5 2.1c0 5.5-7.5 10-7.5 10z',
  pausa: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM10 9v6M14 9v6',
  folga: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM6 6l12 12',
  menos: 'M5 12h14',
  editar: 'M15 5l4 4L9 19H5v-4L15 5zM13 7l4 4',
  mensagem: 'M12 3.5a8.5 8.5 0 0 1 7.4 12.7l1.1 4.3-4.3-1.1A8.5 8.5 0 1 1 12 3.5zM8.5 11h7M8.5 14h4',
  telefone: 'M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z',
  arquivo: 'M4 5.5h16v4H4zM5.5 9.5v9a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-9M10 13.5h4',
  baixar: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14',
  grade: 'M5.5 4.5h13A1.5 1.5 0 0 1 20 6v12.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5V6a1.5 1.5 0 0 1 1.5-1.5zM4 9.5h16M9.5 9.5V20M14.5 9.5V20',
  convidar: 'M10 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM3.5 20a6.5 6.5 0 0 1 11.2-4.5M18 13v6M15 16h6',
  regras: 'M9.5 6.5H20M9.5 12H20M9.5 17.5H20M4 6.5l1.2 1.2L7 5.5M4 12l1.2 1.2L7 11M4 17.5l1.2 1.2L7 16.5',
  dinheiro: 'M4.5 6.5h15A1.5 1.5 0 0 1 21 8v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16V8a1.5 1.5 0 0 1 1.5-1.5zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM6.5 10v4M17.5 10v4',
  alerta: 'M12 4.5l8.5 15h-17L12 4.5zM12 10v4M12 17h.01',
  trocar: 'M7 7.5h12l-3.5-3.5M17 16.5H5l3.5 3.5',
} as const

export type NomeDoIcone = keyof typeof CAMINHOS

interface Props {
  nome: NomeDoIcone
  tamanho?: number
  traco?: number
  class?: string
  /** texto para leitor de tela; sem ele o ícone é decorativo */
  rotulo?: string
}

export function Icone({ nome, tamanho = 24, traco = 1.75, class: classe, rotulo }: Props) {
  return (
    <svg
      class={classe}
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={traco}
      stroke-linecap="round"
      stroke-linejoin="round"
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : 'true'}
      focusable="false"
    >
      <path d={CAMINHOS[nome]} />
    </svg>
  )
}

/** Chevrons duplos de contorno, como nas artes do estúdio ("passe para o lado"). */
export function Chevrons({ tamanho = 28, class: classe }: { tamanho?: number; class?: string }) {
  return (
    <svg
      class={`chevrons ${classe ?? ''}`}
      width={tamanho * 1.4}
      height={tamanho}
      viewBox="0 0 34 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 2l10 10L2 22v-5l5-5-5-5zM18 2l10 10-10 10v-5l5-5-5-5z" />
    </svg>
  )
}
