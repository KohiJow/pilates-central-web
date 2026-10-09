// App do aluno sobre o Firestore. O aluno não lê o registro da aula (tem os nomes dos colegas):
// grava só a marcação ou a reposição dele, por mescla. A vaga e o crédito são lidos dentro de
// uma transação; se outro aluno pegar o último lugar no mesmo instante, a transação refaz a
// conta e recusa. As regras conferem tudo de novo do lado do banco.
import { collection, deleteField, doc, getDoc, getDocs, query, runTransaction, where } from 'firebase/firestore/lite'
import { somarDias, momentoDe } from '../../dominio/datas'
import type { MinhaAula } from '../../dominio/minhasAulas'
import { DIAS_DA_JANELA } from '../../dominio/projecoes'
import type { CreditoReposicao, Id, Instante, PortalDoAluno, Unidade, VagaDaAula } from '../../dominio/tipos'
import { RecusaDoAluno } from '../repositorioDoAluno'
import type { RepositorioDoAluno } from '../repositorioDoAluno'
import { configuracaoDoDocumento, semIndefinidos } from './conversao'
import type { Sdk } from './sdk'

export function criarRepositorioDoAluno(sdk: Sdk, alunoId: Id, agora: () => Date): RepositorioDoAluno {
  const { db } = sdk
  const idDaAula = (turmaId: Id, data: string) => `${turmaId}_${data}`

  async function vagaNaTransacao(lerVaga: () => Promise<VagaDaAula | undefined>): Promise<VagaDaAula> {
    const v = await lerVaga()
    if (!v) throw new RecusaDoAluno('Esta aula saiu da agenda. Atualize a tela.')
    if (v.cancelada) throw new RecusaDoAluno('Esta aula foi cancelada pelo estúdio.')
    return v
  }

  return {
    modo: 'firebase',

    async carregar() {
      const hoje = momentoDe(agora()).data
      const [portal, creditos, vagas, cfg, unidades] = await Promise.all([
        getDoc(doc(db, 'portal', alunoId)),
        getDocs(query(collection(db, 'creditos'), where('alunoId', '==', alunoId))),
        getDocs(query(collection(db, 'vagas'), where('data', '>=', hoje), where('data', '<=', somarDias(hoje, DIAS_DA_JANELA)))),
        getDoc(doc(db, 'configuracao', 'estudio')),
        getDocs(collection(db, 'unidades')),
      ])
      if (!portal.exists()) throw new RecusaDoAluno('Seu acesso ainda está sendo preparado pelo estúdio. Tente daqui a pouco.')
      return {
        portal: portal.data() as PortalDoAluno,
        creditos: creditos.docs.map((d) => d.data() as CreditoReposicao),
        vagas: vagas.docs.map((d) => d.data() as VagaDaAula),
        configuracao: configuracaoDoDocumento(cfg.exists() ? cfg.data() : undefined),
        unidades: unidades.docs.map((d) => d.data() as Unidade),
        avisadas: [],
      }
    },

    async avisar(aula: MinhaAula, credito: CreditoReposicao | undefined, instante: Instante) {
      const refVaga = doc(db, 'vagas', aula.id)
      await runTransaction(db, async (tx) => {
        const v = await vagaNaTransacao(async () => {
          const s = await tx.get(refVaga)
          return s.exists() ? (s.data() as VagaDaAula) : undefined
        })
        tx.set(
          doc(db, 'registros', aula.id),
          { id: aula.id, turmaId: aula.turmaId, unidadeId: v.unidadeId, data: aula.data, marcacoes: { [alunoId]: 'avisou' }, atualizadoEm: instante },
          { merge: true },
        )
        if (credito) tx.set(doc(db, 'creditos', credito.id), semIndefinidos(credito))
        tx.update(refVaga, { ocupadas: v.ocupadas - 1, atualizadoEm: instante })
      })
    },

    async desfazerAviso(aula: MinhaAula, creditoId: Id | undefined, instante: Instante) {
      const refVaga = doc(db, 'vagas', aula.id)
      await runTransaction(db, async (tx) => {
        const v = await vagaNaTransacao(async () => {
          const s = await tx.get(refVaga)
          return s.exists() ? (s.data() as VagaDaAula) : undefined
        })
        if (v.ocupadas >= v.capacidade) throw new RecusaDoAluno('Alguém já ocupou o seu lugar nesta aula. Fale com o estúdio pelo WhatsApp.')
        tx.update(doc(db, 'registros', aula.id), { [`marcacoes.${alunoId}`]: deleteField(), atualizadoEm: instante })
        if (creditoId) tx.delete(doc(db, 'creditos', creditoId))
        tx.update(refVaga, { ocupadas: v.ocupadas + 1, atualizadoEm: instante })
      })
    },

    async encaixar(vaga: VagaDaAula, credito: CreditoReposicao, instante: Instante) {
      const id = idDaAula(vaga.turmaId, vaga.data)
      const refVaga = doc(db, 'vagas', id)
      const refCredito = doc(db, 'creditos', credito.id)
      await runTransaction(db, async (tx) => {
        const v = await vagaNaTransacao(async () => {
          const s = await tx.get(refVaga)
          return s.exists() ? (s.data() as VagaDaAula) : undefined
        })
        const c = await tx.get(refCredito)
        if (!c.exists() || (c.data() as CreditoReposicao).usadoEm) throw new RecusaDoAluno('Este crédito já foi usado.')
        if (v.ocupadas >= v.capacidade) throw new RecusaDoAluno('A aula acabou de lotar. Escolha outro horário.')
        tx.set(
          doc(db, 'registros', id),
          { id, turmaId: vaga.turmaId, unidadeId: vaga.unidadeId, data: vaga.data, reposicoes: { [alunoId]: credito.id }, atualizadoEm: instante },
          { merge: true },
        )
        tx.update(refCredito, { usadoEm: { turmaId: vaga.turmaId, data: vaga.data } })
        tx.update(refVaga, { ocupadas: v.ocupadas + 1, atualizadoEm: instante })
      })
    },

    async desistir(aula: MinhaAula, creditoId: Id, instante: Instante) {
      const refVaga = doc(db, 'vagas', aula.id)
      await runTransaction(db, async (tx) => {
        const v = await vagaNaTransacao(async () => {
          const s = await tx.get(refVaga)
          return s.exists() ? (s.data() as VagaDaAula) : undefined
        })
        tx.update(doc(db, 'registros', aula.id), { [`reposicoes.${alunoId}`]: deleteField(), atualizadoEm: instante })
        tx.update(doc(db, 'creditos', creditoId), { usadoEm: deleteField() })
        tx.update(refVaga, { ocupadas: v.ocupadas - 1, atualizadoEm: instante })
      })
    },
  }
}
