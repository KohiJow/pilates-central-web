// Ações de cadastro e lançamento da administração. Cada uma confere a regra do domínio, grava
// tudo de uma vez e, quando faz sentido, devolve como desfazer (calculado na hora de desfazer).
import { agoraDoApp, hoje } from '../app/relogio'
import { montarAluno, montarFinanceiro, mudarSituacao, validarAluno, validarPlano } from '../dominio/alunos'
import type { RascunhoAluno, RascunhoPlano } from '../dominio/alunos'
import { validarConfiguracao } from '../dominio/configuracao'
import {
  convidar,
  desativarMembro,
  editarMembro,
  mudarPapel,
  reativarMembro,
  transferirTitularidade,
} from '../dominio/equipe'
import type { RascunhoMembro } from '../dominio/equipe'
import { novoPagamento, validarPagamento } from '../dominio/pagamentos'
import type { RascunhoPagamento } from '../dominio/pagamentos'
import { aceito, recusado, semErros } from '../dominio/resultado'
import type { ErrosDeCampo, Resultado } from '../dominio/resultado'
import { normalizarTelefone } from '../dominio/texto'
import type { Aluno, Configuracao, Id, MembroEquipe, Pagamento, Papel, SituacaoAluno, Turma, Unidade } from '../dominio/tipos'
import { colocarNaTurma, editarTurma, encerrarTurma, lugaresReservados, novaTurma, tirarDaTurma, validarTurma } from '../dominio/turmas'
import type { RascunhoTurma } from '../dominio/turmas'
import { desativarUnidade, montarUnidade, validarUnidade } from '../dominio/unidades'
import type { RascunhoUnidade } from '../dominio/unidades'
import { alunosPorId, base, creditos, equipePorId, financeiro, gravarComDesfazer, pagamentos } from './estado'

type ComDesfazer = { desfazer?: () => Promise<void> }

/** Id novo e curto, com o tipo na frente para facilitar a leitura do banco. */
export function idNovo(prefixo: string): string {
  const aleatorio =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12)
  return `${prefixo}-${aleatorio}`
}

function primeiroErro(erros: ErrosDeCampo): string {
  return Object.values(erros)[0] ?? 'Confira os dados.'
}

const turmas = () => base.peek()?.turmas ?? []
const turmaPorId = (id: Id) => turmas().find((t) => t.id === id)
const situacaoDe = (id: Id) => alunosPorId.peek().get(id)?.situacao

// ---------- alunos ----------

/** Cadastra ou atualiza o aluno (e o plano, quando quem salva é a administração). */
export async function salvarAluno(
  r: RascunhoAluno,
  plano: RascunhoPlano | null,
  alunoId?: Id,
): Promise<Resultado<{ aluno: Aluno }>> {
  const b = base.peek()
  if (!b) return recusado('nada-a-fazer', 'Os dados ainda não carregaram.')
  const anterior = alunoId ? alunosPorId.peek().get(alunoId) : undefined
  const erros = {
    ...validarAluno(r, { unidades: b.unidades, turmas: b.turmas, hoje: hoje.peek(), ...(alunoId ? { alunoId } : {}) }),
    ...(plano ? validarPlano(plano) : {}),
  }
  if (!semErros(erros)) return recusado('dados-invalidos', primeiroErro(erros))
  const aluno = montarAluno(r, alunoId ?? idNovo('a'), anterior)
  const finAtual = financeiro.peek().get(aluno.id)
  const fin = plano ? montarFinanceiro(plano, aluno) : finAtual ? { ...finAtual, unidadeId: aluno.unidadeId } : undefined
  const g = await gravarComDesfazer({ alunos: [aluno], ...(fin ? { financeiro: [fin] } : {}) })
  return g.ok ? aceito({ aluno }) : g
}

/** Pausar, arquivar ou voltar a ativo. Desfazer devolve a situação e as turmas. */
export async function mudarSituacaoDoAluno(alunoId: Id, nova: SituacaoAluno): Promise<Resultado<ComDesfazer>> {
  const aluno = alunosPorId.peek().get(alunoId)
  if (!aluno) return recusado('nada-a-fazer', 'Aluno não encontrado.')
  const marcadas = [...creditos.peek().values()]
    .filter((c) => c.alunoId === alunoId && c.usadoEm && c.usadoEm.data >= hoje.peek())
    .map((c) => c.usadoEm?.data ?? '')
  const r = mudarSituacao(aluno, nova, turmas(), marcadas)
  if (!r.ok) return r
  const anterior = aluno.situacao
  const saiuDe = turmas().filter((t) => t.alunosFixos.includes(alunoId) && r.valor.turmas.some((m) => m.id === t.id))
  return gravarComDesfazer({ alunos: [r.valor.aluno], turmas: r.valor.turmas }, () => {
    const atual = alunosPorId.peek().get(alunoId)
    if (!atual) return null
    const devolvidas: Turma[] = []
    for (const original of saiuDe) {
      const t = turmaPorId(original.id)
      if (!t || t.alunosFixos.includes(alunoId)) continue
      const desde = original.fixosDesde?.[alunoId]
      devolvidas.push({
        ...t,
        alunosFixos: [...t.alunosFixos, alunoId],
        fixosDesde: desde ? { ...t.fixosDesde, [alunoId]: desde } : { ...t.fixosDesde },
      })
    }
    return { alunos: [{ ...atual, situacao: anterior }], turmas: devolvidas }
  })
}

// ---------- turmas ----------

export async function salvarTurma(r: RascunhoTurma, turmaId?: Id): Promise<Resultado<{ turma: Turma }>> {
  const b = base.peek()
  if (!b) return recusado('nada-a-fazer', 'Os dados ainda não carregaram.')
  const atual = turmaId ? turmaPorId(turmaId) : undefined
  const erros = validarTurma(r, {
    turmas: b.turmas,
    equipe: b.equipe,
    unidades: b.unidades,
    ...(turmaId ? { turmaId } : {}),
    reservados: atual ? lugaresReservados(atual, situacaoDe) : 0,
  })
  if (!semErros(erros)) return recusado('dados-invalidos', primeiroErro(erros))
  const turma = atual ? editarTurma(atual, r) : novaTurma(r, idNovo('t'), hoje.peek())
  const g = await gravarComDesfazer({ turmas: [turma] })
  return g.ok ? aceito({ turma }) : g
}

export async function encerrarTurmaAcao(turmaId: Id): Promise<Resultado<ComDesfazer>> {
  const t = turmaPorId(turmaId)
  if (!t) return recusado('nada-a-fazer', 'Turma não encontrada.')
  const r = encerrarTurma(t)
  if (!r.ok) return r
  return gravarComDesfazer({ turmas: [r.valor] }, () => {
    const agora = turmaPorId(turmaId)
    return agora ? { turmas: [{ ...agora, ativa: true }] } : null
  })
}

export async function colocarAlunoNaTurma(turmaId: Id, alunoId: Id): Promise<Resultado<ComDesfazer>> {
  const t = turmaPorId(turmaId)
  const aluno = alunosPorId.peek().get(alunoId)
  if (!t || !aluno) return recusado('nada-a-fazer', 'Turma ou aluno não encontrado.')
  const r = colocarNaTurma(t, aluno, turmas(), situacaoDe, hoje.peek())
  if (!r.ok) return r
  return gravarComDesfazer({ turmas: [r.valor] }, () => {
    const agora = turmaPorId(turmaId)
    if (!agora) return null
    const tirada = tirarDaTurma(agora, alunoId)
    return tirada.ok ? { turmas: [tirada.valor] } : null
  })
}

export async function tirarAlunoDaTurma(turmaId: Id, alunoId: Id): Promise<Resultado<ComDesfazer>> {
  const t = turmaPorId(turmaId)
  if (!t) return recusado('nada-a-fazer', 'Turma não encontrada.')
  const r = tirarDaTurma(t, alunoId)
  if (!r.ok) return r
  const desde = t.fixosDesde?.[alunoId]
  return gravarComDesfazer({ turmas: [r.valor] }, () => {
    const agora = turmaPorId(turmaId)
    if (!agora || agora.alunosFixos.includes(alunoId)) return null
    return {
      turmas: [
        {
          ...agora,
          alunosFixos: [...agora.alunosFixos, alunoId],
          fixosDesde: desde ? { ...agora.fixosDesde, [alunoId]: desde } : { ...agora.fixosDesde },
        },
      ],
    }
  })
}

// ---------- pagamentos ----------

export async function lancarPagamento(
  r: RascunhoPagamento,
  alunoId: Id,
  autorId: Id,
): Promise<Resultado<ComDesfazer & { pagamento: Pagamento }>> {
  const aluno = alunosPorId.peek().get(alunoId)
  if (!aluno) return recusado('nada-a-fazer', 'Escolha o aluno.')
  const erros = validarPagamento(r, hoje.peek())
  if (!semErros(erros)) return recusado('dados-invalidos', primeiroErro(erros))
  const pagamento = novoPagamento(r, aluno, idNovo('pg'), autorId)
  if (!pagamento) return recusado('dados-invalidos', 'Confira o valor e a forma.')
  const g = await gravarComDesfazer({ pagamentos: [pagamento] }, () => ({ pagamentosRemovidos: [pagamento.id] }))
  return g.ok ? aceito({ ...g.valor, pagamento }) : g
}

export async function apagarPagamento(id: Id): Promise<Resultado<ComDesfazer>> {
  const p = pagamentos.peek().get(id)
  if (!p) return recusado('nada-a-fazer', 'Lançamento não encontrado.')
  return gravarComDesfazer({ pagamentosRemovidos: [id] }, () => ({ pagamentos: [p] }))
}

// ---------- configuração e unidades ----------

export async function salvarConfiguracao(c: Configuracao): Promise<Resultado<ComDesfazer>> {
  const erros = validarConfiguracao(c)
  if (!semErros(erros)) return recusado('dados-invalidos', primeiroErro(erros))
  return gravarComDesfazer({
    configuracao: { ...c, nomeEstudio: c.nomeEstudio.trim(), whatsapp: c.whatsapp ? (normalizarTelefone(c.whatsapp) ?? '') : '' },
  })
}

export async function salvarUnidade(r: RascunhoUnidade, unidadeId?: Id): Promise<Resultado<{ unidade: Unidade }>> {
  const lista = base.peek()?.unidades ?? []
  const erros = validarUnidade(r, lista, unidadeId)
  if (!semErros(erros)) return recusado('dados-invalidos', primeiroErro(erros))
  const anterior = lista.find((u) => u.id === unidadeId)
  const unidade = montarUnidade(r, unidadeId ?? idNovo('u'), anterior)
  const g = await gravarComDesfazer({ unidades: [unidade] })
  return g.ok ? aceito({ unidade }) : g
}

export async function mudarAberturaDaUnidade(unidadeId: Id, aberta: boolean): Promise<Resultado<ComDesfazer>> {
  const b = base.peek()
  const u = b?.unidades.find((x) => x.id === unidadeId)
  if (!b || !u) return recusado('nada-a-fazer', 'Unidade não encontrada.')
  if (aberta) {
    if (u.ativa) return recusado('nada-a-fazer', 'A unidade já está aberta.')
    return gravarComDesfazer({ unidades: [{ ...u, ativa: true }] })
  }
  const r = desativarUnidade(u, b.turmas, b.alunos, b.unidades)
  if (!r.ok) return r
  return gravarComDesfazer({ unidades: [r.valor] }, () => ({ unidades: [{ ...r.valor, ativa: true }] }))
}

// ---------- equipe ----------

const membro = (id: Id) => equipePorId.peek().get(id)
const equipe = () => base.peek()?.equipe ?? []
const todasAsUnidades = () => base.peek()?.unidades ?? []

export async function convidarParaEquipe(ator: MembroEquipe, r: RascunhoMembro): Promise<Resultado<{ membro: MembroEquipe }>> {
  const c = convidar(ator, r, equipe(), todasAsUnidades(), idNovo('e'), agoraDoApp().toISOString())
  if (!c.ok) return c
  const g = await gravarComDesfazer({ equipe: [c.valor] })
  return g.ok ? aceito({ membro: c.valor }) : g
}

export async function salvarMembro(ator: MembroEquipe, alvoId: Id, r: Omit<RascunhoMembro, 'papel'>): Promise<Resultado<ComDesfazer>> {
  const alvo = membro(alvoId)
  if (!alvo) return recusado('nada-a-fazer', 'Pessoa não encontrada.')
  const e = editarMembro(ator, alvo, r, equipe(), todasAsUnidades())
  if (!e.ok) return e
  return gravarComDesfazer({ equipe: [e.valor] })
}

export async function mudarPapelDoMembro(ator: MembroEquipe, alvoId: Id, novo: Exclude<Papel, 'titular'>): Promise<Resultado<ComDesfazer>> {
  const alvo = membro(alvoId)
  if (!alvo) return recusado('nada-a-fazer', 'Pessoa não encontrada.')
  const r = mudarPapel(ator, alvo, novo)
  if (!r.ok) return r
  const anterior = alvo.papel
  return gravarComDesfazer({ equipe: [r.valor] }, () => {
    const agora = membro(alvoId)
    return agora ? { equipe: [{ ...agora, papel: anterior }] } : null
  })
}

export async function mudarAcessoDoMembro(ator: MembroEquipe, alvoId: Id, ativo: boolean): Promise<Resultado<ComDesfazer>> {
  const alvo = membro(alvoId)
  if (!alvo) return recusado('nada-a-fazer', 'Pessoa não encontrada.')
  const r = ativo ? reativarMembro(ator, alvo) : desativarMembro(ator, alvo, turmas())
  if (!r.ok) return r
  return gravarComDesfazer({ equipe: [r.valor] }, () => {
    const agora = membro(alvoId)
    return agora ? { equipe: [{ ...agora, ativo: !ativo }] } : null
  })
}

export async function passarAConta(ator: MembroEquipe, alvoId: Id): Promise<Resultado<ComDesfazer>> {
  const alvo = membro(alvoId)
  if (!alvo) return recusado('nada-a-fazer', 'Pessoa não encontrada.')
  const r = transferirTitularidade(ator, alvo)
  if (!r.ok) return r
  // sem desfazer: depois da troca, quem fez já não é titular para destrocar
  return gravarComDesfazer({ equipe: r.valor })
}
