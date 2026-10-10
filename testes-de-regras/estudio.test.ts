// Os textos do estúdio (frase, focos, endereço, mapa, Instagram) na configuração e no documento
// público: só a administração grava, cada texto no seu teto, os focos conferidos de uma vez.
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { banco, CONFIG, criarAmbiente, semear } from './cenario'
import type { Quem } from './cenario'

let ambiente: RulesTestEnvironment

beforeAll(async () => {
  ambiente = await criarAmbiente()
})

afterAll(async () => {
  await ambiente?.cleanup()
})

beforeEach(async () => {
  await semear(ambiente)
})

const como = (quem: Quem): Firestore => banco(ambiente, quem)
const instante = '2026-10-09T12:00:00.000Z'

const TEXTOS = {
  fraseCurta: 'Um estúdio pequeno, com turmas de até seis pessoas.',
  focos: ['Fortalecimento', 'Postura', 'Mobilidade'],
  endereco: 'Rua Exemplo, 100, sala 2\nCentro',
  linkDoMapa: 'https://maps.app.goo.gl/abc',
  instagram: 'estudio.exemplo',
}

describe('textos do estúdio na configuração', () => {
  it('a administração grava os textos; o professor não', async () => {
    await assertSucceeds(setDoc(doc(como('adm'), 'configuracao/estudio'), { ...CONFIG, ...TEXTOS }))
    await assertSucceeds(setDoc(doc(como('titular'), 'configuracao/estudio'), { ...CONFIG, ...TEXTOS, focos: [], linkDoMapa: '', instagram: '' }))
    await assertFails(setDoc(doc(como('prof'), 'configuracao/estudio'), { ...CONFIG, ...TEXTOS }))
  })

  const tortos: [string, Record<string, unknown>][] = [
    ['frase com 161 letras', { fraseCurta: 'a'.repeat(161) }],
    ['quatro focos', { focos: ['Um', 'Dois', 'Três', 'Quatro'] }],
    ['foco com 41 letras', { focos: ['b'.repeat(41)] }],
    ['foco vazio', { focos: ['Postura', ''] }],
    ['foco com barra', { focos: ['Postura|Mobilidade'] }],
    ['foco que não é texto', { focos: [7] }],
    ['focos que não são lista', { focos: 'Postura' }],
    ['endereço com 201 letras', { endereco: 'c'.repeat(201) }],
    ['link do mapa sem https', { linkDoMapa: 'http://exemplo.com/mapa' }],
    ['link do mapa com script', { linkDoMapa: 'javascript:alert(1)' }],
    ['link do mapa com espaço', { linkDoMapa: 'https://exemplo.com/um mapa' }],
    ['link do mapa com 301 letras', { linkDoMapa: `https://exemplo.com/${'d'.repeat(290)}` }],
    ['instagram com espaço', { instagram: 'estudio exemplo' }],
    ['instagram com arroba', { instagram: '@estudio' }],
    ['instagram com 31 letras', { instagram: 'e'.repeat(31) }],
    ['campo faltando', { focos: undefined }],
  ]
  for (const [nome, campos] of tortos) {
    it(`recusa ${nome}`, async () => {
      const dados: Record<string, unknown> = { ...CONFIG, ...TEXTOS, ...campos }
      for (const chave of Object.keys(dados)) if (dados[chave] === undefined) delete dados[chave]
      await assertFails(setDoc(doc(como('adm'), 'configuracao/estudio'), dados))
    })
  }
})

describe('textos do estúdio no documento público', () => {
  it('a administração grava; o professor só mexe nos horários', async () => {
    await assertSucceeds(updateDoc(doc(como('adm'), 'publico/estudio'), { ...TEXTOS, atualizadoEm: instante }))
    await assertFails(updateDoc(doc(como('prof'), 'publico/estudio'), { fraseCurta: 'Outra frase', atualizadoEm: instante }))
    await assertFails(updateDoc(doc(como('prof'), 'publico/estudio'), { instagram: 'outro', horarios: [], atualizadoEm: instante }))
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { focos: ['Um', 'Dois', 'Três', 'Quatro'], atualizadoEm: instante }))
    await assertFails(updateDoc(doc(como('adm'), 'publico/estudio'), { linkDoMapa: 'javascript:alert(1)', atualizadoEm: instante }))
    await assertFails(updateDoc(doc(como('anonimo'), 'publico/estudio'), { instagram: 'invasor' }))
  })
})
