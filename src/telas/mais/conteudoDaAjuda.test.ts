import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CARTOES_DE_AJUDA } from './conteudoDaAjuda'

// a ajuda do app e o guia em texto (docs/guia-da-equipe.md, o que o dono manda no WhatsApp)
// dizem a mesma coisa: mudou um, muda o outro
const guia = readFileSync(new URL('../../../docs/guia-da-equipe.md', import.meta.url), 'utf8').replace(/\s+/g, ' ')
const junto = (texto: string) => texto.replace(/\s+/g, ' ')

describe('ajuda dentro do app', () => {
  it('cada card está no guia da equipe, com o mesmo texto', () => {
    for (const c of CARTOES_DE_AJUDA) {
      expect(guia, c.titulo).toContain(`*${c.titulo}*`)
      for (const p of [...c.paragrafos, ...(c.passos ?? []), ...(c.depois ?? [])]) expect(guia, c.titulo).toContain(junto(p))
    }
  })

  it('os assuntos pedidos estão lá, curtos e sem jargão', () => {
    const titulos = CARTOES_DE_AJUDA.map((c) => c.titulo)
    for (const t of ['Pôr o app na tela inicial', 'Fazer a chamada', 'Reposição', 'Lançar um pagamento', 'Convidar alguém para o app', 'O que o professor vê', 'O que o aluno vê', 'Sem internet', 'Privacidade']) {
      expect(titulos).toContain(t)
    }
    for (const c of CARTOES_DE_AJUDA) {
      // cards curtos: no máximo quatro blocos de texto, frases que cabem numa tela de celular
      expect(c.paragrafos.length + (c.depois?.length ?? 0)).toBeLessThanOrEqual(4)
      for (const p of [...c.paragrafos, ...(c.passos ?? []), ...(c.depois ?? [])]) {
        expect(p.length, p).toBeLessThanOrEqual(240)
        expect(p, p).not.toMatch(/Firebase|Firestore|PWA|login|backend|sincroniz/i)
      }
    }
  })
})
