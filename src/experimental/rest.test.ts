import { describe, expect, it } from 'vitest'
import { momentoDe } from '../dominio/datas'
import { horariosAindaAbertos } from '../dominio/experimental'
import { codificarHorario } from '../dominio/projecoes'
import { decodificarCampos, enderecoDoDocumento, paginaPublicaDe } from './rest'

describe('documento público pela API REST', () => {
  it('desfaz os tipos do Firestore em objeto simples', () => {
    const campos = {
      nomeEstudio: { stringValue: 'Pilates Central' },
      experimental: { booleanValue: true },
      horarios: { arrayValue: { values: [{ stringValue: '2026-10-09 18:00-18:50 u-centro 2' }] } },
      unidades: { arrayValue: { values: [{ mapValue: { fields: { id: { stringValue: 'u-centro' }, nome: { stringValue: 'Centro' } } } }] } },
      vagas: { integerValue: '2' },
      nada: { nullValue: null },
    }
    expect(decodificarCampos(campos)).toEqual({
      nomeEstudio: 'Pilates Central',
      experimental: true,
      horarios: ['2026-10-09 18:00-18:50 u-centro 2'],
      unidades: [{ id: 'u-centro', nome: 'Centro' }],
      vagas: 2,
      nada: null,
    })
  })

  it('horário torto gravado por alguém da equipe não derruba a página: fica de fora', () => {
    const bom = { data: '2026-10-13', inicio: '18:00', fim: '18:50', unidadeId: 'u-centro', vagas: 2 }
    const tortos = [
      'texto solto',
      null,
      { ...bom },
      '20261013 18:00-18:50 u-centro 2',
      '2026-02-30 18:00-18:50 u-centro 2',
      '2026-10-13 18h-18h50 u-centro 2',
      '2026-10-13 18:00-18:50 ../alunos 2',
      '2026-10-13 18:00-18:50 u-centro dois',
      '2026-10-13 18:00-18:50 u-centro 2.5',
      '2026-10-13 18:00-18:50 u-centro 999',
    ]
    const agora = momentoDe(new Date('2026-10-09T13:00:00Z'))
    // antes, o documento passava direto para a tela: o filtro dos horários quebrava no primeiro torto
    expect(() => horariosAindaAbertos([...tortos, bom] as never, agora)).toThrow()

    const pagina = paginaPublicaDe({
      nomeEstudio: 'Estúdio',
      whatsapp: '5511900000000',
      unidades: { 'u-centro': 'Centro|Rua Exemplo, 100', 'x y': 'Torta|', 'u-lixo': 'lixo', 'u-vazio': '|Rua' },
      experimental: true,
      horarios: [...tortos, codificarHorario(bom)],
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
    expect(pagina).toEqual({
      nomeEstudio: 'Pilates Central',
      whatsapp: '',
      fraseCurta: '',
      focos: [],
      endereco: '',
      linkDoMapa: '',
      instagram: '',
      unidades: [],
      experimental: false,
      horarios: [],
      atualizadoEm: '',
    })
  })

  it('os textos do estúdio chegam com os tetos e só o link https vira link', () => {
    const pagina = paginaPublicaDe({
      fraseCurta: 'Um estúdio pequeno.',
      // só os três primeiros contam, e só os que são texto no tamanho
      focos: ['Fortalecimento', 7, 'Postura', 'Mobilidade'],
      endereco: 'Rua Exemplo, 100',
      linkDoMapa: 'javascript:alert(1)',
      instagram: 'estudio.exemplo',
    })
    expect(pagina).toMatchObject({ fraseCurta: 'Um estúdio pequeno.', focos: ['Fortalecimento', 'Postura'], endereco: 'Rua Exemplo, 100', linkDoMapa: '', instagram: 'estudio.exemplo' })
    expect(paginaPublicaDe({ focos: ['x'.repeat(41), ''] }).focos).toEqual([])
    expect(paginaPublicaDe({ linkDoMapa: 'https://maps.app.goo.gl/abc', instagram: 'nome com espaço' })).toMatchObject({ linkDoMapa: 'https://maps.app.goo.gl/abc', instagram: '' })
  })

  it('respeita os mesmos tetos das regras (100 horários, 10 unidades)', () => {
    const h = '2026-10-13 18:00-18:50 u-centro 1'
    const unidades = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`u-${i}`, `Unidade ${i}|`]))
    const pagina = paginaPublicaDe({ horarios: Array(500).fill(h), unidades, experimental: true })
    expect(pagina.horarios).toHaveLength(100)
    expect(pagina.unidades).toHaveLength(10)
  })

  it('monta o endereço do projeto ou do emulador', () => {
    expect(enderecoDoDocumento({ projeto: 'demo-pilates', caminho: 'publico/estudio', chave: 'k', emulador: 'http://127.0.0.1:8824' })).toBe(
      'http://127.0.0.1:8824/v1/projects/demo-pilates/databases/(default)/documents/publico/estudio?key=k',
    )
    expect(enderecoDoDocumento({ projeto: 'p', caminho: 'publico/estudio', chave: 'k' })).toMatch(/^https:\/\/firestore\.googleapis\.com\/v1\//)
  })
})

describe('uma leitura por sessão do documento público', () => {
  it('guarda os campos com a hora, e devolve enquanto valem e forem do mesmo projeto', async () => {
    const { guardarCacheDaPagina, lerCacheDaPagina, VALIDADE_DO_CACHE_MS } = await import('./rest')
    const campos = { nomeEstudio: 'E', horarios: ['2026-10-13 18:00-18:50 u-centro 2'] }
    const texto = guardarCacheDaPagina('pilates-x', 1_000_000, campos)
    expect(lerCacheDaPagina(texto, 'pilates-x', 1_000_000 + VALIDADE_DO_CACHE_MS - 1)).toEqual(campos)
    expect(lerCacheDaPagina(texto, 'pilates-x', 1_000_000 + VALIDADE_DO_CACHE_MS + 1)).toBeNull()
    expect(lerCacheDaPagina(texto, 'outro-projeto', 1_000_000)).toBeNull()
    // relógio que voltou (outro aparelho, hora trocada): não confia
    expect(lerCacheDaPagina(texto, 'pilates-x', 999_999)).toBeNull()
    expect(lerCacheDaPagina(null, 'pilates-x', 1_000_000)).toBeNull()
    expect(lerCacheDaPagina('{lixo', 'pilates-x', 1_000_000)).toBeNull()
    expect(lerCacheDaPagina('{"projeto":"pilates-x","lidoEm":"x","campos":{}}', 'pilates-x', 1_000_000)).toBeNull()
    expect(VALIDADE_DO_CACHE_MS).toBe(10 * 60_000)
  })
})
