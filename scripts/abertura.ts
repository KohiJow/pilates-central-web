// Tela de abertura do app instalado no iPhone (apple-touch-startup-image): o iOS mostra uma
// imagem enquanto o app abre, e só com uma imagem exata para o tamanho e a densidade da tela de
// cada aparelho (sem ela, a tela fica lisa até o app pintar). As imagens são geradas por
// scripts/gerar-abertura.mjs em public/abertura/, e as <link> entram no index.html no build
// (plugin em scripts/plugin-offline.ts), uma por tamanho e por tema.

export interface TamanhoDeAbertura {
  /** largura e altura lógicas, em pontos CSS (device-width e device-height) */
  largura: number
  altura: number
  /** densidade (-webkit-device-pixel-ratio) */
  escala: 2 | 3
  /** aparelhos que usam este tamanho (só para quem lê) */
  aparelhos: string
}

/** Os iPhones com iOS 16.4 ou mais novo (o piso do app), do menor ao maior. */
export const TAMANHOS_DE_ABERTURA: readonly TamanhoDeAbertura[] = [
  { largura: 375, altura: 667, escala: 2, aparelhos: 'iPhone SE (2a e 3a geração), 8' },
  { largura: 414, altura: 896, escala: 2, aparelhos: 'iPhone XR, 11' },
  { largura: 375, altura: 812, escala: 3, aparelhos: 'iPhone X, XS, 11 Pro, 12 mini, 13 mini' },
  { largura: 414, altura: 896, escala: 3, aparelhos: 'iPhone XS Max, 11 Pro Max' },
  { largura: 390, altura: 844, escala: 3, aparelhos: 'iPhone 12, 13, 14, 16e' },
  { largura: 428, altura: 926, escala: 3, aparelhos: 'iPhone 12 Pro Max, 13 Pro Max, 14 Plus' },
  { largura: 393, altura: 852, escala: 3, aparelhos: 'iPhone 14 Pro, 15, 15 Pro, 16' },
  { largura: 430, altura: 932, escala: 3, aparelhos: 'iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus' },
  { largura: 402, altura: 874, escala: 3, aparelhos: 'iPhone 16 Pro, 17' },
  { largura: 440, altura: 956, escala: 3, aparelhos: 'iPhone 16 Pro Max, 17 Pro Max' },
  { largura: 420, altura: 912, escala: 3, aparelhos: 'iPhone Air' },
]

export type TemaDeAbertura = 'claro' | 'escuro'

/** Nome do arquivo em public/abertura/: "1170x2532.png" e "1170x2532-escuro.png". */
export function arquivoDeAbertura(t: TamanhoDeAbertura, tema: TemaDeAbertura): string {
  return `abertura/${t.largura * t.escala}x${t.altura * t.escala}${tema === 'escuro' ? '-escuro' : ''}.png`
}

/** As <link rel="apple-touch-startup-image"> de todos os tamanhos, nos dois temas, com o caminho base. */
export function linksDeAbertura(base: string): string[] {
  const links: string[] = []
  for (const t of TAMANHOS_DE_ABERTURA) {
    for (const tema of ['claro', 'escuro'] as const) {
      const media = [
        'screen',
        `(device-width: ${t.largura}px)`,
        `(device-height: ${t.altura}px)`,
        `(-webkit-device-pixel-ratio: ${t.escala})`,
        '(orientation: portrait)',
        `(prefers-color-scheme: ${tema === 'escuro' ? 'dark' : 'light'})`,
      ].join(' and ')
      links.push(`<link rel="apple-touch-startup-image" media="${media}" href="${base}${arquivoDeAbertura(t, tema)}" />`)
    }
  }
  return links
}
