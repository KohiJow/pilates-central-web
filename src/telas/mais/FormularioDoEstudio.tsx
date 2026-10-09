import { useRef, useState } from 'preact/hooks'
import { voltar } from '../../app/navegacao'
import { pode } from '../../app/perfil'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { Campo } from '../../componentes/Campo'
import { Contador } from '../../componentes/Contador'
import { base } from '../../dados/estado'
import { salvarConfiguracao } from '../../dados/gestao'
import { validarConfiguracao } from '../../dominio/configuracao'
import type { CampoConfiguracao } from '../../dominio/configuracao'
import { semErros } from '../../dominio/resultado'
import type { ErrosDeCampo } from '../../dominio/resultado'
import { plural, telefoneLegivel } from '../../dominio/texto'
import type { Configuracao } from '../../dominio/tipos'
import { focarPrimeiroErro } from '../formulario'
import { SemAcesso } from './SemAcesso'

/** Nome do estúdio, WhatsApp de contato e quantos lugares uma turma nova começa tendo. */
export function FormularioDoEstudio() {
  const atual = base.value?.configuracao
  const [c, setC] = useState<Configuracao | undefined>(() =>
    atual ? { ...atual, whatsapp: atual.whatsapp ? telefoneLegivel(atual.whatsapp) : '' } : undefined,
  )
  const [erros, setErros] = useState<ErrosDeCampo<CampoConfiguracao>>({})
  const formulario = useRef<HTMLFormElement>(null)
  if (!pode('editar-configuracao') || !c) return <SemAcesso titulo="Estúdio" texto="Só a administração muda os dados do estúdio." />

  const mudar = <K extends keyof Configuracao>(campo: K, valor: Configuracao[K]) => {
    setC({ ...c, [campo]: valor })
    if (erros[campo]) setErros({ ...erros, [campo]: undefined })
  }
  const salvar = async (e: Event) => {
    e.preventDefault()
    const novos = validarConfiguracao(c)
    setErros(novos)
    if (!semErros(novos)) {
      focarPrimeiroErro(formulario.current)
      return
    }
    const r = await salvarConfiguracao(c)
    if (!r.ok) return avisar({ texto: r.mensagem, icone: 'info' })
    avisar({ texto: 'Dados do estúdio salvos.', icone: 'presente' })
    voltar()
  }

  return (
    <section class="tela" aria-labelledby="titulo-estudio-form">
      <CabecalhoDeSubtela voltarPara="Mais" rotulo="Estúdio" titulo="Nome e WhatsApp" idTitulo="titulo-estudio-form" />
      <form ref={formulario} class="formulario pilha" onSubmit={(e) => void salvar(e)} noValidate>
        <Campo rotulo="Nome do estúdio" valor={c.nomeEstudio} aoMudar={(v) => mudar('nomeEstudio', v)} erro={erros.nomeEstudio} />
        <Campo
          rotulo="WhatsApp do estúdio"
          type="tel"
          inputMode="tel"
          valor={c.whatsapp}
          aoMudar={(v) => mudar('whatsapp', v)}
          placeholder="(19) 90000-0000"
          erro={erros.whatsapp}
          ajuda="Aparece para os alunos na página pública e no lembrete de pagamento."
        />
        <Contador
          rotulo="Lugares de uma turma nova"
          valor={c.capacidadePadrao}
          aoMudar={(v) => mudar('capacidadePadrao', v)}
          min={1}
          max={20}
          formatar={(v) => plural(v, 'aluno')}
          erro={erros.capacidadePadrao}
        />
        <Botao variante="primario" type="submit" largo icone="presente">
          Salvar
        </Botao>
      </form>
    </section>
  )
}
