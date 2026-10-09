// localStorage pode não existir ou lançar erro (aba anônima, dados do site bloqueados).
// Tudo passa por aqui para o app nunca quebrar por causa disso.
export function lerLocal(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave)
  } catch {
    return null
  }
}

export function gravarLocal(chave: string, valor: string | null): void {
  try {
    if (valor === null) window.localStorage.removeItem(chave)
    else window.localStorage.setItem(chave, valor)
  } catch {
    // sem armazenamento: a preferência vale só até fechar o app
  }
}

export function armazenamentoDisponivel(): Storage | null {
  try {
    const s = window.localStorage
    const teste = '__pc_teste__'
    s.setItem(teste, '1')
    s.removeItem(teste)
    return s
  } catch {
    return null
  }
}
