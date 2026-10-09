import { useState } from 'preact/hooks'
import { voltar } from '../../app/navegacao'
import { pode } from '../../app/perfil'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { Card } from '../../componentes/Card'
import { Contador } from '../../componentes/Contador'
import { base } from '../../dados/estado'
import { salvarConfiguracao } from '../../dados/gestao'
import { textoDasRegras, validarConfiguracao } from '../../dominio/configuracao'
import { plural } from '../../dominio/texto'
import type { Configuracao } from '../../dominio/tipos'
import { SemAcesso } from './SemAcesso'

/** As regras que valem para todo aviso de falta: antecedência, validade, limite e destaque. */
export function RegrasDeReposicao() {
  const atual = base.value?.configuracao
  const [c, setC] = useState<Configuracao | undefined>(atual)
  if (!pode('editar-configuracao') || !c) return <SemAcesso titulo="Regras" texto="Só a administração muda as regras de reposição." />
  const erros = validarConfiguracao(c)
  const mudar = <K extends keyof Configuracao>(campo: K, valor: Configuracao[K]) => setC({ ...c, [campo]: valor })

  const salvar = async () => {
    const r = await salvarConfiguracao(c)
    if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info' })
    avisar({ texto: 'Regras salvas. Valem para os próximos avisos.', icone: 'regras' })
    voltar()
  }

  return (
    <section class="tela" aria-labelledby="titulo-regras-form">
      <CabecalhoDeSubtela voltarPara="Mais" rotulo="Reposição" titulo="Regras de reposição" idTitulo="titulo-regras-form" />
      <Card variante="acento">
        <p class="micro">Como fica</p>
        <p aria-live="polite">{textoDasRegras(c)}</p>
      </Card>
      <div class="formulario pilha">
        <Contador
          rotulo="Avisar com antecedência de"
          valor={c.antecedenciaAvisoHoras}
          aoMudar={(v) => mudar('antecedenciaAvisoHoras', v)}
          min={0}
          max={72}
          formatar={(v) => (v === 0 ? 'até o começo' : plural(v, 'hora'))}
          ajuda="Com menos que isso, o aviso fica registrado mas sem reposição (a administração pode dar mesmo assim)."
          erro={erros.antecedenciaAvisoHoras}
        />
        <Contador
          rotulo="A reposição vale por"
          valor={c.validadeCreditoDias}
          aoMudar={(v) => mudar('validadeCreditoDias', v)}
          min={1}
          max={180}
          passo={5}
          formatar={(v) => plural(v, 'dia')}
          ajuda="Contados a partir da aula que o aluno perdeu."
          erro={erros.validadeCreditoDias}
        />
        <Contador
          rotulo="Reposições por mês, por aluno"
          valor={c.limiteReposicoesMes}
          aoMudar={(v) => mudar('limiteReposicoesMes', v)}
          min={0}
          max={20}
          formatar={(v) => (v === 0 ? 'sem limite' : String(v))}
          ajuda="Só contam os avisos de falta. Aula cancelada pelo estúdio não entra na conta."
          erro={erros.limiteReposicoesMes}
        />
        <Contador
          rotulo="Destacar aluno a partir de"
          valor={c.alertaAusenciasSeguidas}
          aoMudar={(v) => mudar('alertaAusenciasSeguidas', v)}
          min={2}
          max={10}
          formatar={(v) => `${v} ausências seguidas`}
          erro={erros.alertaAusenciasSeguidas}
        />
        <Botao variante="primario" largo icone="presente" onClick={() => void salvar()}>
          Salvar regras
        </Botao>
      </div>
    </section>
  )
}
