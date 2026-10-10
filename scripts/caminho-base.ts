// O caminho base do site numa fonte só, para o Vite, o manifesto e os testes lerem o mesmo valor.
// Vem da variável BASE_PATH: no GitHub Actions o workflow a deriva do nome do repositório ('/'
// quando o repositório se chama <alguem>.github.io, '/<nome>/' nos outros); fora dele vale o
// padrão. O resultado sempre começa e termina com barra, do jeito que o Vite espera.

export const CAMINHO_BASE_PADRAO = '/pilates-central-web/'

export function caminhoBase(valor: string | undefined = process.env.BASE_PATH): string {
  if (valor === undefined || valor.trim() === '') return CAMINHO_BASE_PADRAO
  const miolo = valor.trim().replace(/^\/+|\/+$/g, '')
  return miolo ? `/${miolo}/` : '/'
}
