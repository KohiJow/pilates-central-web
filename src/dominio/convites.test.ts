import { describe, expect, it } from 'vitest'
import { conviteVencido, linkDeEntrada, mensagemDoConvite, prazoDoConvite, vencimentoDoConvite } from './convites'

const ENVIADO = '2026-10-09T13:00:00.000Z'

describe('prazo do convite', () => {
  it('vale pelos dias combinados a partir do registro, e depois vence', () => {
    expect(vencimentoDoConvite(ENVIADO, 7)).toBe(new Date('2026-10-16T13:00:00.000Z').getTime())
    expect(conviteVencido(ENVIADO, 7, new Date('2026-10-16T12:59:00.000Z'))).toBe(false)
    expect(conviteVencido(ENVIADO, 7, new Date('2026-10-16T13:01:00.000Z'))).toBe(true)
    expect(conviteVencido(ENVIADO, 1, new Date('2026-10-10T14:00:00.000Z'))).toBe(true)
  })

  it('diz até quando vale, ou desde quando venceu, no relógio do estúdio', () => {
    expect(prazoDoConvite(ENVIADO, 7, new Date('2026-10-10T13:00:00.000Z'))).toBe('vale até 16/10')
    expect(prazoDoConvite(ENVIADO, 7, new Date('2026-10-20T13:00:00.000Z'))).toBe('venceu em 16/10')
    // 23h em UTC do dia 16 ainda é dia 16 em Campinas (UTC-3)
    expect(prazoDoConvite('2026-10-09T23:30:00.000Z', 7, new Date('2026-10-10T13:00:00.000Z'))).toBe('vale até 16/10')
  })
})

describe('mensagem do convite', () => {
  it('leva o link de entrada (sem nada pessoal na URL), o e-mail no texto e o prazo', () => {
    const link = linkDeEntrada('https://pilates-central.github.io', '/')
    expect(link).toBe('https://pilates-central.github.io/?entrar')
    expect(linkDeEntrada('https://kohijow.github.io', '/pilates-central-web/')).toBe('https://kohijow.github.io/pilates-central-web/?entrar')
    const equipe = mensagemDoConvite('equipe', 'Bruna Teixeira', 'bruna@example.com', link, 7)
    expect(equipe).toContain('Olá, Bruna!')
    expect(equipe).toContain('equipe do estúdio')
    expect(equipe).toContain(link)
    expect(equipe).toContain('bruna@example.com')
    expect(equipe).toContain('O convite vale por 7 dias.')
    const aluno = mensagemDoConvite('aluno', 'Beatriz Barbosa', 'aluno11@example.com', link, 1)
    expect(aluno).toContain('acesso ao app das aulas')
    expect(aluno).toContain('escolhe a reposição')
    expect(aluno).toContain('O convite vale por 1 dia.')
  })
})
