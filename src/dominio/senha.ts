// Força da senha, para a pessoa ver enquanto digita. O mínimo é o comprimento (8); nenhum
// símbolo é exigido: uma frase comprida vale mais que "S3nh@!" e é mais fácil de lembrar.

export const SENHA_MINIMA = 8

export type NivelDaSenha = 0 | 1 | 2 | 3

export interface ForcaDaSenha {
  /** 0 = não serve (menos de 8), 1 = fraca, 2 = boa, 3 = forte */
  nivel: NivelDaSenha
  rotulo: string
  dica: string
}

// senhas que todo mundo tenta primeiro
const MUITO_COMUNS = new Set(['12345678', '123456789', '1234567890', 'password', 'password1', 'senha123', 'senha1234', 'qwertyui', 'abcdefgh', '11111111', '00000000', 'pilates1', 'pilates123'])

function tiposDeCaractere(senha: string): number {
  let tipos = 0
  if (/[a-z]/.test(senha)) tipos += 1
  if (/[A-Z]/.test(senha)) tipos += 1
  if (/[0-9]/.test(senha)) tipos += 1
  if (/[^A-Za-z0-9]/.test(senha)) tipos += 1
  return tipos
}

/** "aaaaaaaa", "12121212", "abcdefgh": sem variedade nenhuma */
function semVariedade(senha: string): boolean {
  if (new Set(senha).size <= 2) return true
  if (/^(..?)\1+$/.test(senha)) return true
  const codigos = [...senha].map((c) => c.charCodeAt(0))
  const passos = new Set(codigos.slice(1).map((c, i) => c - (codigos[i] ?? 0)))
  return passos.size === 1
}

export function forcaDaSenha(senha: string): ForcaDaSenha {
  if (senha.length < SENHA_MINIMA) {
    const faltam = SENHA_MINIMA - senha.length
    return { nivel: 0, rotulo: 'Curta demais', dica: `Faltam ${faltam} ${faltam === 1 ? 'caractere' : 'caracteres'}.` }
  }
  if (MUITO_COMUNS.has(senha.toLowerCase()) || semVariedade(senha)) {
    return { nivel: 1, rotulo: 'Fraca', dica: 'Todo mundo tenta esta primeiro. Junte palavras que só você lembra.' }
  }
  const tipos = tiposDeCaractere(senha)
  if (senha.length >= 14 || (senha.length >= 12 && tipos >= 2) || (senha.length >= 10 && tipos >= 3)) {
    return { nivel: 3, rotulo: 'Forte', dica: 'Boa escolha.' }
  }
  if (senha.length >= 10 || tipos >= 2) return { nivel: 2, rotulo: 'Boa', dica: 'Mais comprida fica ainda melhor.' }
  return { nivel: 1, rotulo: 'Fraca', dica: 'Serve, mas uma frase mais comprida protege melhor.' }
}
