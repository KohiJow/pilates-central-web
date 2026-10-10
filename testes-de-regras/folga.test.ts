// Folga do teto de expressões por pedido nas regras que o aluno aciona sozinho. O Firestore
// avalia no máximo 1000 expressões por pedido; passando disso, recusa (sempre para o lado
// seguro, mas o aluno ficaria sem remarcar). Este teste carrega as regras com comparações a mais
// enfiadas na função de cada caminho (como quem mede a altura de uma porta empilhando caixas) e
// prova que as gravações legítimas continuam passando com pelo menos FOLGA expressões de sobra.
// Com MEDIR_FOLGA=<arquivo>, em vez de provar, procura o ponto exato em que cada caminho estoura
// e escreve a tabela nesse arquivo.
import { assertSucceeds } from '@firebase/rules-unit-testing'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { writeFileSync } from 'node:fs'
import { deleteField, doc, increment, setDoc, writeBatch } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { afterAll, describe, expect, it } from 'vitest'
import { AMANHA, aulaId, banco, credito, criarAmbiente, DEPOIS, regrasDoArquivo, semear } from './cenario'

/**
 * Expressões a mais que cada caminho do aluno aguenta, no mínimo. Medido com MEDIR_FOLGA: de 51
 * (encaixar numa aula que já tem registro de outra pessoa) a 110 (a vaga no aviso); antes da
 * revisão o encaixe aguentava de 8 a 15. O piso fica abaixo do medido para o teste não oscilar
 * com uma versão nova do emulador que conte um pouco diferente.
 */
export const FOLGA = 40

const instante = '2026-10-09T12:00:00.000Z'
const AULA = aulaId('t-1', AMANHA.data)
const AULA_LIVRE = aulaId('t-livre', DEPOIS.data)
const CREDITO_DO_AVISO = `cr_a-1_t-1_${AMANHA.data}`

function validade(data: string, dias: number): string {
  const d = new Date(`${data}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/**
 * As regras com `n` comparações a mais no começo do `return` da função pedida. O compilador
 * recusa uma expressão comprida demais, então as comparações vão em blocos de 16, cada um numa
 * função própria, e o `return` ganha a cadeia de chamadas.
 */
export function comFolga(regras: string, funcao: string, n: number): string {
  const inicio = regras.indexOf(`function ${funcao}(`)
  if (inicio < 0) throw new Error(`as regras não têm a função ${funcao}`)
  const blocos = Math.ceil(n / 16)
  const ajudantes = Array.from({ length: blocos }, (_, i) => {
    const termos = Math.min(16, n - i * 16)
    return `    function folga${i}() { return ${Array.from({ length: termos }, () => '1 == 1').join(' && ')}; }\n`
  }).join('')
  const abertura = regras.indexOf('match /databases/{database}/documents {')
  const fim = regras.indexOf('\n', abertura) + 1
  const comAjudantes = regras.slice(0, fim) + ajudantes + regras.slice(fim)
  const inicio2 = comAjudantes.indexOf(`function ${funcao}(`)
  const retorno = comAjudantes.indexOf('return ', inicio2) + 'return '.length
  const chamada = Array.from({ length: blocos }, (_, i) => `folga${i}() && `).join('')
  return comAjudantes.slice(0, retorno) + chamada + comAjudantes.slice(retorno)
}

function avisar(db: Firestore) {
  const b = writeBatch(db)
  b.set(
    doc(db, `registros/${AULA}`),
    { id: AULA, turmaId: 't-1', unidadeId: 'u-centro', data: AMANHA.data, marcacoes: { 'a-1': 'avisou' }, atualizadoEm: instante },
    { merge: true },
  )
  b.set(doc(db, `creditos/${CREDITO_DO_AVISO}`), credito(CREDITO_DO_AVISO, 'a-1', { turmaId: 't-1', data: AMANHA.data }, { validoAte: validade(AMANHA.data, 30) }))
  b.update(doc(db, `vagas/${AULA}`), { ocupadas: increment(-1), atualizadoEm: instante })
  return b.commit()
}

function desfazerAviso(db: Firestore) {
  const b = writeBatch(db)
  b.update(doc(db, `registros/${AULA}`), { 'marcacoes.a-1': deleteField(), atualizadoEm: instante })
  b.delete(doc(db, `creditos/${CREDITO_DO_AVISO}`))
  b.update(doc(db, `vagas/${AULA}`), { ocupadas: increment(1), atualizadoEm: instante })
  return b.commit()
}

function encaixar(db: Firestore) {
  const b = writeBatch(db)
  b.set(
    doc(db, `registros/${AULA_LIVRE}`),
    { id: AULA_LIVRE, turmaId: 't-livre', unidadeId: 'u-centro', data: DEPOIS.data, reposicoes: { 'a-1': 'cr-a1' }, atualizadoEm: instante },
    { merge: true },
  )
  b.update(doc(db, 'creditos/cr-a1'), { usadoEm: { turmaId: 't-livre', data: DEPOIS.data } })
  b.update(doc(db, `vagas/${AULA_LIVRE}`), { ocupadas: increment(1), atualizadoEm: instante })
  return b.commit()
}

function desistir(db: Firestore) {
  const b = writeBatch(db)
  b.update(doc(db, `registros/${AULA_LIVRE}`), { 'reposicoes.a-1': deleteField(), atualizadoEm: instante })
  b.update(doc(db, 'creditos/cr-a1'), { usadoEm: deleteField() })
  b.update(doc(db, `vagas/${AULA_LIVRE}`), { ocupadas: increment(-1), atualizadoEm: instante })
  return b.commit()
}

/** registro já existente (de outra pessoa) na aula: o caminho é o de alterar, não o de criar */
async function registroDeOutro(ambiente: RulesTestEnvironment, aula: string, turmaId: string, data: string) {
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, `registros/${aula}`), {
      id: aula,
      turmaId,
      unidadeId: 'u-centro',
      data,
      marcacoes: { 'a-5': 'avisou' },
      reposicoes: {},
      atualizadoEm: instante,
    })
  })
}

interface Caminho {
  nome: string
  /** função das regras que ganha as comparações a mais */
  funcao: string
  /** o que fazer antes, com as regras de verdade */
  antes?: (ambiente: RulesTestEnvironment) => Promise<void>
  acao: (db: Firestore) => Promise<void>
}

const CAMINHOS: Caminho[] = [
  { nome: 'avisar (registro novo)', funcao: 'avisoValido', acao: avisar },
  { nome: 'avisar (registro de outro)', funcao: 'avisoValido', antes: (a) => registroDeOutro(a, AULA, 't-1', AMANHA.data), acao: avisar },
  { nome: 'desfazer o aviso', funcao: 'desfazerAvisoValido', antes: async (a) => void (await assertSucceeds(avisar(banco(a, 'aluno')))), acao: desfazerAviso },
  { nome: 'encaixar (registro novo)', funcao: 'encaixeValido', acao: encaixar },
  { nome: 'encaixar (registro de outro)', funcao: 'encaixeValido', antes: (a) => registroDeOutro(a, AULA_LIVRE, 't-livre', DEPOIS.data), acao: encaixar },
  { nome: 'desistir', funcao: 'desistirValido', antes: async (a) => void (await assertSucceeds(encaixar(banco(a, 'aluno')))), acao: desistir },
  { nome: 'a vaga no aviso', funcao: 'alunoMexeNaVaga', acao: avisar },
  { nome: 'a vaga no encaixe', funcao: 'alunoMexeNaVaga', acao: encaixar },
  { nome: 'o crédito do aviso', funcao: 'alunoCriaCredito', acao: avisar },
  { nome: 'o crédito no encaixe', funcao: 'alunoMexeNoCredito', acao: encaixar },
]

const ambientes: RulesTestEnvironment[] = []

afterAll(async () => {
  for (const a of ambientes) await a.cleanup()
})

/** true se o caminho passa com `n` comparações a mais. */
async function passa(c: Caminho, n: number): Promise<boolean> {
  // o preparo usa as regras de verdade; a ação, as regras com as comparações a mais
  const real = await criarAmbiente()
  ambientes.push(real)
  await semear(real)
  await c.antes?.(real)
  const cheio = await criarAmbiente(comFolga(regrasDoArquivo(), c.funcao, n))
  ambientes.push(cheio)
  try {
    await c.acao(banco(cheio, 'aluno'))
    return true
  } catch {
    return false
  }
}

describe('folga do teto de 1000 expressões nas regras do aluno', () => {
  if (process.env.MEDIR_FOLGA) {
    it('mede onde cada caminho estoura (só para olhar)', async () => {
      const linhas: string[] = []
      for (const c of CAMINHOS) {
        // dobra até estourar, depois afina entre o último que passou e o primeiro que falhou
        let bom = 0
        let ruim = 32
        while (ruim <= 1024 && (await passa(c, ruim))) {
          bom = ruim
          ruim *= 2
        }
        while (ruim - bom > 1) {
          const meio = Math.floor((bom + ruim) / 2)
          if (await passa(c, meio)) bom = meio
          else ruim = meio
        }
        linhas.push(`${c.nome}: aguenta ${bom} comparações a mais`)
      }
      writeFileSync(String(process.env.MEDIR_FOLGA), `${linhas.join('\n')}\n`)
    }, 600_000)
    return
  }

  for (const c of CAMINHOS) {
    it(`${c.nome} aguenta pelo menos ${FOLGA} comparações a mais`, async () => {
      expect(await passa(c, FOLGA)).toBe(true)
    })
  }
})
