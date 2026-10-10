import type { JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { membro as membroAtual } from '../../app/perfil'
import { hoje, momento } from '../../app/relogio'
import { Botao } from '../../componentes/Botao'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { Chevrons } from '../../componentes/Icone'
import { Vagas } from '../../componentes/Vagas'
import { aulasNoDia, nomeDaEquipe, nomeDaUnidade, unidades } from '../../dados/estado'
import { faseDaAula } from '../../dominio/agenda'
import { dataCurta, diaRelativo, horaFalada, somarDias } from '../../dominio/datas'
import { ehAdministracao } from '../../dominio/permissoes'
import { maiuscula, primeiroNome } from '../../dominio/texto'
import type { Aula } from '../../dominio/tipos'
import { FormularioDeExperimental } from './FormularioDeExperimental'

/** Quantos dias para a frente a lista procura aulas com vaga. */
const DIAS = 14

/** Aulas com vaga, das unidades da pessoa, de hoje até duas semanas (lê sinais). */
function aulasComVaga(): Aula[] {
  const eu = membroAtual.value
  const minhas = new Set(unidades.value.filter((u) => ehAdministracao(eu?.papel) || eu?.unidades.includes(u.id)).map((u) => u.id))
  const agora = momento.value
  const saida: Aula[] = []
  for (let d = hoje.value; d <= somarDias(hoje.value, DIAS); d = somarDias(d, 1)) {
    for (const a of aulasNoDia(d)) {
      if (minhas.has(a.unidadeId) && !a.cancelamento && a.vagas > 0 && faseDaAula(a, agora) !== 'encerrada') saida.push(a)
    }
  }
  return saida
}

/**
 * Do Hoje: escolher a aula com vaga e registrar quem vem experimentar. A folha da aula faz o
 * mesmo com a aula já escolhida.
 */
export function FolhaDeExperimental({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const [escolhida, setEscolhida] = useState<string | null>(null)
  useEffect(() => {
    if (aberta) setEscolhida(null)
  }, [aberta])
  const aulas = aulasComVaga()
  const aula = aulas.find((a) => a.id === escolhida)
  const diaDeHoje = hoje.value
  const variasUnidades = unidades.value.length > 1

  const porDia = new Map<string, Aula[]>()
  for (const a of aulas) porDia.set(a.data, [...(porDia.get(a.data) ?? []), a])

  return (
    <FolhaInferior
      aberta={aberta}
      aoFechar={aoFechar}
      rotulo="Aula experimental"
      titulo={aula ? `${maiuscula(diaRelativo(aula.data, diaDeHoje))}, ${horaFalada(aula.inicio)}` : 'Em que aula?'}
      subtitulo={aula ? <span>{nomeDaUnidade(aula.unidadeId)}, com {primeiroNome(nomeDaEquipe(aula.professorId))}.</span> : undefined}
    >
      {aula ? (
        <div class="pilha">
          <Botao variante="terciario" icone="voltar" onClick={() => setEscolhida(null)} class="botao--alinhado">
            Escolher outra aula
          </Botao>
          <FormularioDeExperimental aula={aula} aoRegistrar={aoFechar} />
        </div>
      ) : aulas.length === 0 ? (
        <EstadoVazio icone="agenda" rotulo="Sem vaga" texto={`Nenhuma aula com vaga nos próximos ${DIAS} dias.`} />
      ) : (
        <div class="pilha" aria-label="Aulas com vaga">
          <p class="texto-secundario">Aulas com vaga nos próximos dias. Escolha a que a pessoa pediu.</p>
          {[...porDia].map(([data, lista]) => (
            <div key={data} class="encaixe-dia">
              <h3 class="micro">
                {maiuscula(diaRelativo(data, diaDeHoje))}, {dataCurta(data)}
              </h3>
              {lista.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  class="opcao-aula tocavel"
                  style={{ '--i': i } as JSX.CSSProperties}
                  onClick={() => setEscolhida(a.id)}
                  aria-label={`${horaFalada(a.inicio)} de ${diaRelativo(a.data, diaDeHoje)}, ${dataCurta(a.data)}, com ${primeiroNome(nomeDaEquipe(a.professorId))}`}
                >
                  <span class="opcao-aula-hora">{horaFalada(a.inicio)}</span>
                  <span class="opcao-aula-texto">
                    <span class="lista-item-titulo">
                      com {primeiroNome(nomeDaEquipe(a.professorId))}
                      {variasUnidades ? `, ${nomeDaUnidade(a.unidadeId)}` : ''}
                    </span>
                    <Vagas ocupadas={a.ocupadas} capacidade={a.capacidade} />
                  </span>
                  <Chevrons tamanho={16} />
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </FolhaInferior>
  )
}
