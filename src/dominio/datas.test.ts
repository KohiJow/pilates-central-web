import { describe, expect, it } from 'vitest'
import {
  competenciaDe,
  dataCurta,
  dataPorExtenso,
  diaDaSemana,
  diaRelativo,
  diasDoIntervalo,
  diasEntre,
  ehDataValida,
  ehHoraValida,
  horaDe,
  horaFalada,
  inicioDaSemana,
  minutosDe,
  minutosEntre,
  momentoDe,
  periodoDe,
  somarDias,
} from './datas'

describe('relógio do estúdio', () => {
  it('converte um instante UTC para data e minutos em Campinas', () => {
    expect(momentoDe(new Date('2026-10-09T13:30:00Z'))).toEqual({ data: '2026-10-09', minutos: 630 })
  })

  it('perto da meia-noite UTC ainda é o dia anterior no estúdio', () => {
    expect(momentoDe(new Date('2026-10-10T02:15:00Z'))).toEqual({ data: '2026-10-09', minutos: 23 * 60 + 15 })
  })

  it('aceita outro fuso quando pedido', () => {
    expect(momentoDe(new Date('2026-10-09T13:30:00Z'), 'UTC').minutos).toBe(13 * 60 + 30)
  })
})

describe('aritmética de datas', () => {
  it('soma dias atravessando mês e ano', () => {
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28')
    expect(somarDias('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('conta dias entre datas', () => {
    expect(diasEntre('2026-10-09', '2026-11-08')).toBe(30)
    expect(diasEntre('2026-10-09', '2026-10-01')).toBe(-8)
  })

  it('sabe o dia da semana', () => {
    expect(diaDaSemana('2026-10-09')).toBe(5) // sexta
    expect(diaDaSemana('2026-10-11')).toBe(0) // domingo
  })

  it('a semana começa na segunda', () => {
    expect(inicioDaSemana('2026-10-09')).toBe('2026-10-05')
    expect(inicioDaSemana('2026-10-05')).toBe('2026-10-05')
    expect(inicioDaSemana('2026-10-11')).toBe('2026-10-05')
  })

  it('lista os dias de um intervalo, inclusive as pontas', () => {
    expect(diasDoIntervalo('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
  })

  it('valida datas e horas', () => {
    expect(ehDataValida('2026-02-28')).toBe(true)
    expect(ehDataValida('2026-02-30')).toBe(false)
    expect(ehDataValida('09/10/2026')).toBe(false)
    expect(ehHoraValida('07:00')).toBe(true)
    expect(ehHoraValida('24:00')).toBe(false)
    expect(() => minutosDe('7h')).toThrow()
  })

  it('converte hora em minutos e volta', () => {
    expect(minutosDe('18:30')).toBe(1110)
    expect(horaDe(1110)).toBe('18:30')
    expect(horaDe(7 * 60 + 50)).toBe('07:50')
  })

  it('mede minutos entre dois momentos, inclusive em dias diferentes', () => {
    expect(minutosEntre({ data: '2026-10-09', minutos: 1380 }, { data: '2026-10-10', minutos: 60 })).toBe(120)
    expect(minutosEntre({ data: '2026-10-09', minutos: 600 }, { data: '2026-10-09', minutos: 540 })).toBe(-60)
  })

  it('separa manhã, tarde e noite', () => {
    expect(periodoDe('06:00')).toBe('manha')
    expect(periodoDe('11:59')).toBe('manha')
    expect(periodoDe('12:00')).toBe('tarde')
    expect(periodoDe('17:59')).toBe('tarde')
    expect(periodoDe('18:00')).toBe('noite')
  })

  it('competência é o mês da data', () => {
    expect(competenciaDe('2026-10-09')).toBe('2026-10')
  })
})

describe('texto de datas em português', () => {
  it('escreve datas por extenso e curtas', () => {
    expect(dataPorExtenso('2026-10-09')).toBe('sexta, 9 de outubro')
    expect(dataPorExtenso('2026-03-01')).toBe('domingo, 1 de março')
    expect(dataCurta('2026-10-09')).toBe('9/10')
  })

  it('fala a hora como se fala no Brasil', () => {
    expect(horaFalada('07:00')).toBe('7h')
    expect(horaFalada('18:30')).toBe('18h30')
  })

  it('usa hoje, amanhã e ontem quando cabe', () => {
    expect(diaRelativo('2026-10-09', '2026-10-09')).toBe('hoje')
    expect(diaRelativo('2026-10-10', '2026-10-09')).toBe('amanhã')
    expect(diaRelativo('2026-10-08', '2026-10-09')).toBe('ontem')
    expect(diaRelativo('2026-10-12', '2026-10-09')).toBe('segunda')
  })
})
