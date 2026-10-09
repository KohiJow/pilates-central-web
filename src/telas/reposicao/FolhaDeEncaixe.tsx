import type { JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { momento } from '../../app/relogio'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { Icone } from '../../componentes/Icone'
import { Vagas } from '../../componentes/Vagas'
import { alunosPorId, aulasNoDia, creditos, encaixarReposicao, nomeDaEquipe, nomeDaUnidade } from '../../dados/estado'
import { dataCurta, diaRelativo, horaFalada } from '../../dominio/datas'
import { aulasParaEncaixe } from '../../dominio/reposicao'
import { maiuscula, primeiroNome } from '../../dominio/texto'
import type { Aula, CreditoReposicao, Id } from '../../dominio/tipos'

/** Quantos dias para a frente o encaixe procura aulas com vaga. */
export const DIAS_DO_ENCAIXE = 14

/** Aulas com vaga onde o crédito pode entrar (lê sinais: chamar dentro de componente). */
export function aulasDoCredito(credito: CreditoReposicao): Aula[] {
  if (credito.usadoEm) return []
  return aulasParaEncaixe(credito, (d) => aulasNoDia(d, { unidadeId: credito.unidadeId }), momento.value, DIAS_DO_ENCAIXE)
}

/** Encaixa e avisa, com "Desfazer". Devolve true se deu certo. */
export async function confirmarEncaixe(aula: Aula, credito: CreditoReposicao): Promise<boolean> {
  const nome = alunosPorId.peek().get(credito.alunoId)?.nome ?? 'Aluno'
  const r = await encaixarReposicao(aula.id, credito.id)
  if (!r.ok) {
    avisar({ texto: r.mensagem, icone: 'info' })
    return false
  }
  avisar({
    texto: `Reposição de ${primeiroNome(nome)} marcada: ${diaRelativo(aula.data, momento.peek().data)}, ${dataCurta(aula.data)}, às ${horaFalada(aula.inicio)}.`,
    icone: 'reposicao',
    acao: { rotulo: 'Desfazer', executar: () => void r.valor.desfazer() },
  })
  return true
}

/** Texto do botão de confirmar: "Encaixar amanhã, às 18h". */
export function rotuloDoEncaixe(aula: Aula): string {
  return `Encaixar ${diaRelativo(aula.data, momento.value.data)}, às ${horaFalada(aula.inicio)}`
}

/** Aulas com vaga agrupadas por dia; a escolhida fica marcada (escolha única). */
export function ListaDeEncaixe({ aulas, escolhida, aoEscolher }: { aulas: Aula[]; escolhida: string | null; aoEscolher: (id: string) => void }) {
  const hoje = momento.value.data
  if (aulas.length === 0) {
    return (
      <EstadoVazio
        icone="reposicao"
        rotulo="Sem vaga"
        texto={`Nenhuma aula com vaga na unidade nos próximos ${DIAS_DO_ENCAIXE} dias, dentro da validade.`}
      />
    )
  }
  const porDia = new Map<string, Aula[]>()
  for (const a of aulas) porDia.set(a.data, [...(porDia.get(a.data) ?? []), a])
  return (
    <div class="pilha" role="radiogroup" aria-label="Aulas com vaga">
      <p class="texto-secundario">Aulas com vaga nos próximos dias. Escolha uma e confirme.</p>
      {[...porDia].map(([data, lista]) => (
        <div key={data} class="encaixe-dia">
          <h3 class="micro">
            {maiuscula(diaRelativo(data, hoje))}, {dataCurta(data)}
          </h3>
          {lista.map((a, i) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={a.id === escolhida}
              class="opcao-aula tocavel"
              style={{ '--i': i } as JSX.CSSProperties}
              onClick={() => aoEscolher(a.id)}
            >
              <span class="opcao-aula-hora">{horaFalada(a.inicio)}</span>
              <span class="opcao-aula-texto">
                <span class="lista-item-titulo">com {primeiroNome(nomeDaEquipe(a.professorId))}</span>
                <Vagas ocupadas={a.ocupadas} capacidade={a.capacidade} />
              </span>
              <span class="opcao-aula-marca" aria-hidden="true">
                <Icone nome="presente" tamanho={20} traco={2.25} />
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Encaixe a partir do crédito: mostra só as aulas com vaga da unidade do crédito nos próximos
 * dias, a pessoa escolhe uma e confirma. O aluno entra na aula como reposição; "Desfazer" tira.
 */
export function FolhaDeEncaixe({ creditoId, aoFechar }: { creditoId: Id | null; aoFechar: () => void }) {
  // mantém o conteúdo enquanto a folha anima a saída
  const [ultimo, setUltimo] = useState(creditoId)
  const [escolhida, setEscolhida] = useState<string | null>(null)
  useEffect(() => {
    if (creditoId) {
      setUltimo(creditoId)
      setEscolhida(null)
    }
  }, [creditoId])

  const credito = ultimo ? creditos.value.get(ultimo) : undefined
  if (!credito) return null
  const nome = alunosPorId.value.get(credito.alunoId)?.nome ?? 'Aluno'
  const aulas = aulasDoCredito(credito)
  const aula = aulas.find((a) => a.id === escolhida)

  return (
    <FolhaInferior
      aberta={creditoId !== null}
      aoFechar={aoFechar}
      rotulo="Encaixar reposição"
      titulo={nome}
      subtitulo={
        <span>
          {nomeDaUnidade(credito.unidadeId)}. {credito.origem.data <= momento.value.data ? 'Faltou' : 'Vai faltar'} em{' '}
          {dataCurta(credito.origem.data)}, vale até {dataCurta(credito.validoAte)}.
        </span>
      }
      rodape={
        aula ? (
          <Botao variante="primario" largo icone="reposicao" onClick={async () => (await confirmarEncaixe(aula, credito)) && aoFechar()}>
            {rotuloDoEncaixe(aula)}
          </Botao>
        ) : undefined
      }
    >
      <ListaDeEncaixe aulas={aulas} escolhida={escolhida} aoEscolher={setEscolhida} />
    </FolhaInferior>
  )
}
