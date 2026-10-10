import { describe, expect, it } from 'vitest'
import {
  completarConfiguracao,
  CONFIGURACAO_PADRAO,
  limparTextosDoEstudio,
  linkDoInstagram,
  linkDoMapaDe,
  normalizarInstagram,
  palavraDaMarca,
  TAMANHOS,
  textoDasRegras,
  validarConfiguracao,
} from './configuracao'

describe('configuração', () => {
  it('o padrão é válido', () => {
    expect(validarConfiguracao(CONFIGURACAO_PADRAO)).toEqual({})
  })

  it('aponta cada problema no campo certo, em português simples', () => {
    const erros = validarConfiguracao({
      ...CONFIGURACAO_PADRAO,
      nomeEstudio: ' ',
      whatsapp: '11 9999',
      validadeCreditoDias: 0,
      antecedenciaAvisoHoras: 100,
      limiteReposicoesMes: -1,
      alertaAusenciasSeguidas: 1,
      capacidadePadrao: 1.5,
    })
    expect(Object.keys(erros).sort()).toEqual([
      'alertaAusenciasSeguidas',
      'antecedenciaAvisoHoras',
      'capacidadePadrao',
      'limiteReposicoesMes',
      'nomeEstudio',
      'validadeCreditoDias',
      'whatsapp',
    ])
    expect(erros.whatsapp).toBe('Use DDD e número, por exemplo (19) 90000-0000.')
  })

  it('aceita o WhatsApp como a pessoa digita', () => {
    expect(validarConfiguracao({ ...CONFIGURACAO_PADRAO, whatsapp: '(19) 90000-0000' })).toEqual({})
  })

  it('completa configuração antiga com os campos novos', () => {
    const antiga = { nomeEstudio: 'X', whatsapp: '', validadeCreditoDias: 15, antecedenciaAvisoHoras: 2, capacidadePadrao: 5 }
    expect(completarConfiguracao(antiga)).toMatchObject({ validadeCreditoDias: 15, limiteReposicoesMes: 0, alertaAusenciasSeguidas: 3, focos: [], fraseCurta: '', instagram: '' })
    expect(completarConfiguracao({ focos: 'não é lista' as unknown as string[] }).focos).toEqual([])
  })

  it('explica as regras para quem não pode mudar', () => {
    expect(textoDasRegras(CONFIGURACAO_PADRAO)).toBe(
      'Avisar a falta com 3 horas de antecedência dá direito a uma reposição, que vale 30 dias.',
    )
    expect(textoDasRegras({ ...CONFIGURACAO_PADRAO, antecedenciaAvisoHoras: 1, limiteReposicoesMes: 2 })).toBe(
      'Avisar a falta com 1 hora de antecedência dá direito a uma reposição, que vale 30 dias. Até 2 reposições por mês.',
    )
  })
})

describe('os textos do estúdio na página pública', () => {
  it('cada texto tem o seu teto, o mesmo das regras do banco', () => {
    const erros = validarConfiguracao({
      ...CONFIGURACAO_PADRAO,
      fraseCurta: 'a'.repeat(TAMANHOS.fraseCurta + 1),
      focos: ['Fortalecimento', 'b'.repeat(TAMANHOS.foco + 1)],
      endereco: 'c'.repeat(TAMANHOS.endereco + 1),
      linkDoMapa: 'maps.app.goo.gl/x',
      instagram: 'nome com espaço',
    })
    expect(Object.keys(erros).sort()).toEqual(['endereco', 'focos', 'fraseCurta', 'instagram', 'linkDoMapa'])
    expect(erros.linkDoMapa).toBe('Cole o link completo do mapa, começando com https://.')
    expect(validarConfiguracao({ ...CONFIGURACAO_PADRAO, linkDoMapa: 'https://maps.app.goo.gl/abc', instagram: '@estudio.exemplo' })).toEqual({})
    expect(validarConfiguracao({ ...CONFIGURACAO_PADRAO, linkDoMapa: 'http://exemplo.com/mapa' })).toHaveProperty('linkDoMapa')
  })

  it('guarda os textos aparados, sem a barra que o banco usa para separar, e o Instagram só com o nome', () => {
    expect(
      limparTextosDoEstudio({
        fraseCurta: '  Um estúdio | pequeno\n e atento  ',
        focos: ['  Fortalecimento ', '', 'Postura', 'Mobilidade', 'Um a mais'],
        endereco: ' Rua Exemplo, 100\nCentro ',
        linkDoMapa: ' https://maps.app.goo.gl/abc ',
        instagram: 'https://www.instagram.com/estudio.exemplo/?hl=pt',
      }),
    ).toEqual({
      fraseCurta: 'Um estúdio pequeno e atento',
      focos: ['Fortalecimento', 'Postura', 'Mobilidade'],
      endereco: 'Rua Exemplo, 100\nCentro',
      linkDoMapa: 'https://maps.app.goo.gl/abc',
      instagram: 'estudio.exemplo',
    })
    expect(normalizarInstagram('@Estudio_Exemplo')).toBe('Estudio_Exemplo')
    expect(normalizarInstagram('instagram.com/estudio')).toBe('estudio')
  })

  it('a marca d\'água é a primeira palavra do nome, em caixa alta', () => {
    expect(palavraDaMarca('Pilates Central')).toBe('PILATES')
    expect(palavraDaMarca('Estúdio Corpo e Alma')).toBe('ESTÚDIO')
    expect(palavraDaMarca('   ')).toBe('PILATES')
  })

  it('links do mapa e do Instagram', () => {
    expect(linkDoMapaDe('Rua Exemplo, 100', 'https://maps.app.goo.gl/abc')).toBe('https://maps.app.goo.gl/abc')
    expect(linkDoMapaDe('Rua Exemplo, 100')).toBe('https://www.google.com/maps/search/?api=1&query=Rua%20Exemplo%2C%20100')
    expect(linkDoInstagram('estudio.exemplo')).toBe('https://www.instagram.com/estudio.exemplo/')
  })
})
