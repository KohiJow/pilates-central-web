import { describe, expect, it } from 'vitest'
import { momentoDe } from '../dominio/datas'
import { horariosAindaAbertos } from '../dominio/experimental'
import { decodificarCampos, enderecoDoDocumento, paginaPublicaDe } from './rest'

describe('documento público pela API REST', () => {
  it('desfaz os tipos do Firestore em objeto simples', () => {
    const campos = {
      nomeEstudio: { stringValue: 'Pilates Central' },
      experimental: { booleanValue: true },
      horarios: {
        arrayValue: {
          values: [
            {
              mapValue: {
                fields: {
                  data: { stringValue: '2026-10-09' },
                  inicio: { stringValue: '18:00' },
                  vagas: { integerValue: '2' },
                },
              },
            },
          ],
        },
      },
      unidades: { arrayValue: {} },
      nada: { nullValue: null },
    }
    expect(decodificarCampos(campos)).toEqual({
      nomeEstudio: 'Pilates Central',
      experimental: true,
      horarios: [{ data: '2026-10-09', inicio: '18:00', vagas: 2 }],
      unidades: [],
      nada: null,
    })
  })

  it('horário torto gravado por alguém da equipe não derruba a página: fica de fora', () => {
    const bom = { data: '2026-10-13', inicio: '18:00', fim: '18:50', unidadeId: 'u-centro', vagas: 2 }
    const tortos = [
      'texto solto',
      null,
      { ...bom, data: 20261013 },
      { ...bom, data: '2026-02-30' },
      { ...bom, inicio: '18h' },
      { ...bom, fim: undefined },
      { ...bom, unidadeId: '../alunos' },
      { ...bom, vagas: '2' },
      { ...bom, vagas: 2.5 },
      { ...bom, vagas: 999 },
    ]
    const agora = momentoDe(new Date('2026-10-09T13:00:00Z'))
    // antes, o documento passava direto para a tela: o filtro dos horários quebrava no primeiro torto
    expect(() => horariosAindaAbertos([...tortos, bom] as never, agora)).toThrow()

    const pagina = paginaPublicaDe({
      nomeEstudio: 'Estúdio',
      whatsapp: '5511900000000',
      unidades: [{ id: 'u-centro', nome: 'Centro', endereco: 'Rua Exemplo, 100' }, { id: 'x y', nome: 'Torta' }, 'lixo'],
      experimental: true,
      horarios: [...tortos, bom],
      atualizadoEm: '2026-10-09T12:00:00.000Z',
    })
    expect(pagina.horarios).toEqual([bom])
    expect(pagina.unidades).toEqual([{ id: 'u-centro', nome: 'Centro', endereco: 'Rua Exemplo, 100' }])
    expect(horariosAindaAbertos(pagina.horarios, agora)).toEqual([bom])
  })

  it('campos de cima com tipo errado viram o valor neutro', () => {
    const pagina = paginaPublicaDe({
      nomeEstudio: 'x'.repeat(500),
      whatsapp: 'javascript:alert(1)',
      unidades: 'nada',
      experimental: 'sim',
      horarios: { 0: 'a' },
      atualizadoEm: 7,
    })
    expect(pagina).toEqual({ nomeEstudio: 'Pilates Central', whatsapp: '', unidades: [], experimental: false, horarios: [], atualizadoEm: '' })
  })

  it('respeita os mesmos tetos das regras (120 horários, 10 unidades)', () => {
    const h = { data: '2026-10-13', inicio: '18:00', fim: '18:50', unidadeId: 'u-centro', vagas: 1 }
    const u = { id: 'u-centro', nome: 'Centro', endereco: '' }
    const pagina = paginaPublicaDe({ horarios: Array(500).fill(h), unidades: Array(50).fill(u), experimental: true })
    expect(pagina.horarios).toHaveLength(120)
    expect(pagina.unidades).toHaveLength(10)
  })

  it('monta o endereço do projeto ou do emulador', () => {
    expect(enderecoDoDocumento({ projeto: 'demo-pilates', caminho: 'publico/estudio', chave: 'k', emulador: 'http://127.0.0.1:8824' })).toBe(
      'http://127.0.0.1:8824/v1/projects/demo-pilates/databases/(default)/documents/publico/estudio?key=k',
    )
    expect(enderecoDoDocumento({ projeto: 'p', caminho: 'publico/estudio', chave: 'k' })).toMatch(/^https:\/\/firestore\.googleapis\.com\/v1\//)
  })
})
