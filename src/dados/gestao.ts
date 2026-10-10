// Ações de cadastro e lançamento da administração. Cada uma confere a regra do domínio, grava
// tudo de uma vez e, quando faz sentido, devolve como desfazer (calculado na hora de desfazer).
import { membro as quemEstaAgindo } from '../app/perfil'
import { agoraDoApp, hoje } from '../app/relogio'
import { montarAluno, montarFinanceiro, mudarSituacao, validarAluno, validarPlano } from '../dominio/alunos'
import { detalheDoPagamento, detalheDoPapel, registroDeAuditoria } from '../dominio/auditoria'
import type { RascunhoAluno, RascunhoPlano } from '../dominio/alunos'
import { limparTextosDoEstudio, validarConfiguracao } from '../dominio/configuracao'
import {
  convidar,
  desativarMembro,
  editarMembro,
  mudarPapel,
  reativarMembro,
  renovarConvite,
  revogarConvite,
  transferirTitularidade,
} from '../dominio/equipe'
import type { RascunhoMembro } from '../dominio/equipe'
import { novoPagamento, validarPagamento } from '../dominio/pagamentos'
import type { RascunhoPagamento } from '../dominio/pagamentos'
import { aceito, recusado, semErros } from '../dominio/resultado'
import type { ErrosDeCampo, Resultado } from '../dominio/resultado'
import { normalizarTelefone } from '../dominio/texto'
import type { AcaoAuditada, Aluno, Configuracao, Id, MembroEquipe, Pagamento, Papel, RegistroDeAuditoria, SituacaoAluno, Turma, Unidade } from '../dominio/tipos'
import { colocarNaTurma, editarTurma, encerrarTurma, lugaresReservados, novaTurma, tirarDaTurma, validarTurma } from '../dominio/turmas'
import type { RascunhoTurma } from '../dominio/turmas'
import { desativarUnidade, montarUnidade, validarUnidade } from '../dominio/unidades'
import type { RascunhoUnidade } from '../dominio/unidades'
import { exclusaoDoAluno } from '../dominio/privacidade'
import { vincularAluno } from '../dominio/aulaExperimental'
import { ehEmailValido } from '../dominio/texto'
import { alunosPorId, base, creditos, equipePorId, financeiro, gravarComDesfazer, pagamentos, registros } from './estado'

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

/** Uma linha do registro de alterações, feita por quem está agindo agora. */
function anotar(acao: AcaoAuditada, alvoId: Id, detalhe = '', porId = quemEstaAgindo.peek()?.id ?? ''): RegistroDeAuditoria {
  return registroDeAuditoria(idNovo('au'), acao, porId, alvoId, agoraDoApp().toISOString(), detalhe)
}

const turmas = () => base.peek()?.turmas ?? []
const turmaPorId = (id: Id) => turmas().find((t) => t.id === id)
const situacaoDe = (id: Id) => alunosPorId.peek().get(id)?.situacao

// ---------- alunos ----------

/** De que aula experimental o cadastro nasceu: o registro dela passa a apontar para o aluno novo. */
export interface OrigemExperimental {
  aulaId: string
  experimentalId: Id
}

/** Cadastra ou atualiza o aluno (e o plano, quando quem salva é a administração). */
export async function salvarAluno(
  r: RascunhoAluno,
  plano: RascunhoPlano | null,
  alunoId?: Id,
  origem?: OrigemExperimental,
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
  const registroDaExperimental = origem ? registros.peek().get(origem.aulaId) : undefined
  const vinculado = registroDaExperimental && !anterior ? vincularAluno(registroDaExperimental, origem?.experimentalId ?? '', aluno.id, agoraDoApp().toISOString()) : null
  const g = await gravarComDesfazer({
    alunos: [aluno],
    ...(fin ? { financeiro: [fin] } : {}),
    ...(vinculado ? { registros: [vinculado] } : {}),
  })
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

// ---------- app do aluno e LGPD ----------

/** Libera o app do aluno (no Firebase, grava o convite para o e-mail dele). */
export async function liberarAcessoDoAluno(alunoId: Id, ator: MembroEquipe): Promise<Resultado<ComDesfazer>> {
  const aluno = alunosPorId.peek().get(alunoId)
  if (!aluno) return recusado('nada-a-fazer', 'Aluno não encontrado.')
  if (!base.peek()?.configuracao.acessoDoAluno) return recusado('nada-a-fazer', 'O app do aluno está desligado nos ajustes do estúdio.')
  if (!ehEmailValido(aluno.email)) return recusado('dados-invalidos', 'Cadastre o e-mail do aluno antes: é por ele que o aluno entra.')
  if (aluno.situacao === 'inativo') return recusado('nada-a-fazer', 'Aluno arquivado não tem acesso ao app.')
  if (aluno.acesso) return recusado('nada-a-fazer', 'O acesso já está liberado.')
  return gravarComDesfazer(
    {
      alunos: [{ ...aluno, acesso: { convidadoEm: agoraDoApp().toISOString(), porId: ator.id } }],
      auditoria: [anotar('acesso-do-aluno-liberado', alunoId, '', ator.id)],
    },
    () => {
      const agora = alunosPorId.peek().get(alunoId)
      if (!agora) return null
      const semAcesso = { ...agora }
      delete semAcesso.acesso
      return { alunos: [semAcesso], auditoria: [anotar('acesso-do-aluno-tirado', alunoId, '', ator.id)] }
    },
  )
}

export async function tirarAcessoDoAluno(alunoId: Id): Promise<Resultado<ComDesfazer>> {
  const aluno = alunosPorId.peek().get(alunoId)
  if (!aluno?.acesso) return recusado('nada-a-fazer', 'O acesso já está desligado.')
  const semAcesso = { ...aluno }
  delete semAcesso.acesso
  return gravarComDesfazer({ alunos: [semAcesso], auditoria: [anotar('acesso-do-aluno-tirado', alunoId)] })
}

/**
 * Exclui o aluno a pedido dele (LGPD): some o cadastro, a mensalidade, o acesso e os créditos;
 * sai das turmas e das aulas de hoje em diante. Sem desfazer: a confirmação vem antes.
 */
export async function excluirAluno(alunoId: Id): Promise<Resultado<ComDesfazer>> {
  const aluno = alunosPorId.peek().get(alunoId)
  if (!aluno) return recusado('nada-a-fazer', 'Aluno não encontrado.')
  const e = exclusaoDoAluno(
    alunoId,
    turmas(),
    [...registros.peek().values()],
    [...creditos.peek().values()],
    hoje.peek(),
    agoraDoApp().toISOString(),
  )
  return gravarComDesfazer({
    alunosRemovidos: [alunoId],
    financeiroRemovido: [alunoId],
    turmas: e.turmas,
    registros: e.registros,
    creditosRemovidos: e.creditosRemovidos,
    auditoria: [anotar('aluno-excluido', alunoId)],
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
  const detalhe = detalheDoPagamento(pagamento.valor, pagamento.competencia)
  const g = await gravarComDesfazer({ pagamentos: [pagamento], auditoria: [anotar('pagamento-lancado', alunoId, detalhe, autorId)] }, () => ({
    pagamentosRemovidos: [pagamento.id],
    auditoria: [anotar('pagamento-apagado', alunoId, detalhe, autorId)],
  }))
  return g.ok ? aceito({ ...g.valor, pagamento }) : g
}

export async function apagarPagamento(id: Id): Promise<Resultado<ComDesfazer>> {
  const p = pagamentos.peek().get(id)
  if (!p) return recusado('nada-a-fazer', 'Lançamento não encontrado.')
  const detalhe = detalheDoPagamento(p.valor, p.competencia)
  return gravarComDesfazer({ pagamentosRemovidos: [id], auditoria: [anotar('pagamento-apagado', p.alunoId, detalhe)] }, () => ({
    pagamentos: [p],
    auditoria: [anotar('pagamento-lancado', p.alunoId, detalhe)],
  }))
}

// ---------- configuração e unidades ----------

export async function salvarConfiguracao(c: Configuracao): Promise<Resultado<ComDesfazer>> {
  const erros = validarConfiguracao(c)
  if (!semErros(erros)) return recusado('dados-invalidos', primeiroErro(erros))
  return gravarComDesfazer({
    configuracao: {
      ...c,
      ...limparTextosDoEstudio(c),
      nomeEstudio: c.nomeEstudio.trim().replace(/\s+/g, ' '),
      whatsapp: c.whatsapp ? (normalizarTelefone(c.whatsapp) ?? '') : '',
    },
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
  return gravarComDesfazer({ equipe: [r.valor], auditoria: [anotar('papel-mudado', alvoId, detalheDoPapel(novo), ator.id)] }, () => {
    const agora = membro(alvoId)
    return agora ? { equipe: [{ ...agora, papel: anterior }], auditoria: [anotar('papel-mudado', alvoId, detalheDoPapel(anterior), ator.id)] } : null
  })
}

export async function mudarAcessoDoMembro(ator: MembroEquipe, alvoId: Id, ativo: boolean): Promise<Resultado<ComDesfazer>> {
  const alvo = membro(alvoId)
  if (!alvo) return recusado('nada-a-fazer', 'Pessoa não encontrada.')
  const r = ativo ? reativarMembro(ator, alvo) : desativarMembro(ator, alvo, turmas())
  if (!r.ok) return r
  const acao = (ligado: boolean): AcaoAuditada => (ligado ? 'acesso-da-equipe-religado' : 'acesso-da-equipe-desligado')
  return gravarComDesfazer({ equipe: [r.valor], auditoria: [anotar(acao(ativo), alvoId, '', ator.id)] }, () => {
    const agora = membro(alvoId)
    return agora ? { equipe: [{ ...agora, ativo: !ativo }], auditoria: [anotar(acao(!ativo), alvoId, '', ator.id)] } : null
  })
}

/** Revoga um convite pendente: a pessoa fica sem acesso e, no Firebase, o convite do e-mail some. */
export async function revogarConviteDaEquipe(ator: MembroEquipe, alvoId: Id): Promise<Resultado<ComDesfazer>> {
  const alvo = membro(alvoId)
  if (!alvo) return recusado('nada-a-fazer', 'Pessoa não encontrada.')
  const r = revogarConvite(ator, alvo)
  if (!r.ok) return r
  return gravarComDesfazer({ equipe: [r.valor], auditoria: [anotar('convite-revogado', alvoId, '', ator.id)] }, () => {
    const agora = membro(alvoId)
    if (!agora) return null
    const volta = renovarConvite(ator, agora, agoraDoApp().toISOString())
    return volta.ok ? { equipe: [volta.valor], auditoria: [anotar('convite-reenviado', alvoId, 'equipe', ator.id)] } : null
  })
}

/** Manda o convite de novo (venceu, ou tinha sido revogado): o prazo recomeça agora. */
export async function renovarConviteDaEquipe(ator: MembroEquipe, alvoId: Id): Promise<Resultado<ComDesfazer>> {
  const alvo = membro(alvoId)
  if (!alvo) return recusado('nada-a-fazer', 'Pessoa não encontrada.')
  const r = renovarConvite(ator, alvo, agoraDoApp().toISOString())
  if (!r.ok) return r
  return gravarComDesfazer({ equipe: [r.valor], auditoria: [anotar('convite-reenviado', alvoId, 'equipe', ator.id)] })
}

/** O convite do aluno de novo (venceu antes de ele criar a conta): o prazo recomeça agora. */
export async function renovarConviteDoAluno(alunoId: Id, ator: MembroEquipe): Promise<Resultado<ComDesfazer>> {
  const aluno = alunosPorId.peek().get(alunoId)
  if (!aluno?.acesso) return recusado('nada-a-fazer', 'O acesso ainda não foi liberado.')
  return gravarComDesfazer({
    alunos: [{ ...aluno, acesso: { convidadoEm: agoraDoApp().toISOString(), porId: ator.id } }],
    auditoria: [anotar('convite-reenviado', alunoId, 'aluno', ator.id)],
  })
}

export async function passarAConta(ator: MembroEquipe, alvoId: Id): Promise<Resultado<ComDesfazer>> {
  const alvo = membro(alvoId)
  if (!alvo) return recusado('nada-a-fazer', 'Pessoa não encontrada.')
  const r = transferirTitularidade(ator, alvo)
  if (!r.ok) return r
  // sem desfazer: depois da troca, quem fez já não é titular para destrocar
  return gravarComDesfazer({ equipe: r.valor, auditoria: [anotar('conta-passada', alvoId, '', ator.id)] })
}
