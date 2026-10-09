import { describe, expect, it } from 'vitest'
import { decodificarCampos, enderecoDoDocumento } from './rest'

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

  it('monta o endereço do projeto ou do emulador', () => {
    expect(enderecoDoDocumento({ projeto: 'demo-pilates', caminho: 'publico/estudio', chave: 'k', emulador: 'http://127.0.0.1:8824' })).toBe(
      'http://127.0.0.1:8824/v1/projects/demo-pilates/databases/(default)/documents/publico/estudio?key=k',
    )
    expect(enderecoDoDocumento({ projeto: 'p', caminho: 'publico/estudio', chave: 'k' })).toMatch(/^https:\/\/firestore\.googleapis\.com\/v1\//)
  })
})
