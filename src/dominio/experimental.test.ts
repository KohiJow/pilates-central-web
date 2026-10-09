import { describe, expect, it } from 'vitest'
import { horariosAindaAbertos, mensagemDaExperimental } from './experimental'
import type { HorarioPublico } from './tipos'

const h = (data: string, inicio: string, vagas = 1): HorarioPublico => ({ data, inicio, fim: '23:00', unidadeId: 'u-centro', vagas })

describe('aula experimental', () => {
  it('só horários com vaga e com duas horas de folga, em ordem', () => {
    const agora = { data: '2026-10-09', minutos: 10 * 60 }
    const lista = [h('2026-10-10', '07:00'), h('2026-10-09', '11:00'), h('2026-10-09', '12:00'), h('2026-10-09', '18:00', 0)]
    expect(horariosAindaAbertos(lista, agora).map((x) => `${x.data} ${x.inicio}`)).toEqual(['2026-10-09 12:00', '2026-10-10 07:00'])
  })

  it('mensagem pronta com dia e hora (e a unidade, quando há mais de uma)', () => {
    expect(mensagemDaExperimental({ ...h('2026-10-16', '18:00'), unidade: '' })).toBe(
      'Olá! Vi a página do estúdio e quero marcar uma aula experimental: sexta, 16 de outubro, às 18h. Meu nome é ',
    )
    expect(mensagemDaExperimental({ ...h('2026-10-16', '18:30'), unidade: 'Jardim' })).toContain('às 18h30, na unidade Jardim.')
    expect(mensagemDaExperimental(null)).toMatch(/Quais horários/)
  })
})
