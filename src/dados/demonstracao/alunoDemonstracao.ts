// App do aluno no modo demonstração: lê e grava no mesmo banco fictício da equipe, usando as
// mesmas regras do domínio. O que o aluno faz aqui aparece na agenda da equipe e vice-versa.
import { montarAula } from '../../dominio/agenda'
import { momentoDe, somarDias } from '../../dominio/datas'
import type { MinhaAula } from '../../dominio/minhasAulas'
import { marcar } from '../../dominio/presenca'
import type { Contexto } from '../../dominio/presenca'
import { DIAS_DA_JANELA, portalDoAluno, vagasDaJanela } from '../../dominio/projecoes'
import { desfazerEncaixe, encaixar } from '../../dominio/reposicao'
import type { CreditoReposicao, Id, Instante, RegistroAula, VagaDaAula } from '../../dominio/tipos'
import type { DadosBase, Repositorio } from '../repositorio'
import { RecusaDoAluno } from '../repositorioDoAluno'
import type { RepositorioDoAluno } from '../repositorioDoAluno'

export function criarAlunoDeDemonstracao(repo: Repositorio, alunoId: Id, agora: () => Date): RepositorioDoAluno {
  async function ler() {
    const hoje = momentoDe(agora()).data
    const [base, registros, creditos] = await Promise.all([
      repo.carregarBase(),
      repo.registros({ de: somarDias(hoje, -1), ate: somarDias(hoje, DIAS_DA_JANELA + 1) }),
      repo.creditos(),
    ])
    return { base, registros: new Map(registros.map((r) => [r.id, r])), creditos }
  }

  function contexto(base: DadosBase, creditos: CreditoReposicao[], instante: Instante): Contexto {
    const quando = new Date(instante)
    return {
      agora: momentoDe(quando),
      instante,
      config: base.configuracao,
      creditosDoAluno: (id) => creditos.filter((c) => c.alunoId === id),
    }
  }

  function aulaDe(base: DadosBase, registros: Map<string, RegistroAula>, turmaId: Id, data: string) {
    const turma = base.turmas.find((t) => t.id === turmaId)
    if (!turma) throw new RecusaDoAluno('Esta aula não existe mais.')
    const ativos = new Set(base.alunos.filter((a) => a.situacao === 'ativo').map((a) => a.id))
    return montarAula(turma, data, registros.get(`${turmaId}_${data}`), { ehAtivo: (id) => ativos.has(id) })
  }

  function falhou(r: { ok: false; mensagem: string }): never {
    throw new RecusaDoAluno(r.mensagem)
  }

  return {
    modo: 'demonstracao',

    async carregar() {
      const { base, registros, creditos } = await ler()
      const aluno = base.alunos.find((a) => a.id === alunoId)
      if (!aluno) throw new RecusaDoAluno('Este aluno não está mais no estúdio.')
      const agoraJa = agora()
      const instante = agoraJa.toISOString()
      const estado = {
        configuracao: base.configuracao,
        unidades: base.unidades,
        alunos: base.alunos,
        turmas: base.turmas,
        registro: (id: string) => registros.get(id),
      }
      const vagas = [...vagasDaJanela(estado, momentoDe(agoraJa).data, instante).values()]
      const avisadas = [...registros.values()].filter((r) => r.marcacoes[alunoId] === 'avisou').map((r) => r.id)
      return {
        portal: portalDoAluno(aluno, base.turmas, instante),
        creditos: creditos.filter((c) => c.alunoId === alunoId),
        vagas,
        configuracao: base.configuracao,
        unidades: base.unidades,
        avisadas,
      }
    },

    async avisar(aula: MinhaAula, _credito: CreditoReposicao | undefined, instante: Instante) {
      const { base, registros, creditos } = await ler()
      const a = aulaDe(base, registros, aula.turmaId, aula.data)
      const r = marcar(a, registros.get(a.id), alunoId, 'avisou', (id) => creditos.find((c) => c.id === id), contexto(base, creditos, instante))
      if (!r.ok) falhou(r)
      await repo.salvar(r.valor.alteracoes)
    },

    async desfazerAviso(aula: MinhaAula, _creditoId: Id | undefined, instante: Instante) {
      const { base, registros, creditos } = await ler()
      const a = aulaDe(base, registros, aula.turmaId, aula.data)
      if (a.vagas <= 0) throw new RecusaDoAluno('Alguém já ocupou o seu lugar nesta aula. Fale com o estúdio pelo WhatsApp.')
      const r = marcar(a, registros.get(a.id), alunoId, null, (id) => creditos.find((c) => c.id === id), contexto(base, creditos, instante))
      if (!r.ok) falhou(r)
      await repo.salvar(r.valor.alteracoes)
    },

    async encaixar(vaga: VagaDaAula, credito: CreditoReposicao, instante: Instante) {
      const { base, registros, creditos } = await ler()
      const a = aulaDe(base, registros, vaga.turmaId, vaga.data)
      const atual = creditos.find((c) => c.id === credito.id) ?? credito
      const r = encaixar(a, registros.get(a.id), atual, contexto(base, creditos, instante))
      if (!r.ok) falhou(r)
      await repo.salvar(r.valor)
    },

    async desistir(aula: MinhaAula, _creditoId: Id, instante: Instante) {
      const { base, registros, creditos } = await ler()
      const a = aulaDe(base, registros, aula.turmaId, aula.data)
      const r = desfazerEncaixe(a, registros.get(a.id), alunoId, (id) => creditos.find((c) => c.id === id), contexto(base, creditos, instante))
      if (!r.ok) falhou(r)
      await repo.salvar(r.valor)
    },
  }
}
