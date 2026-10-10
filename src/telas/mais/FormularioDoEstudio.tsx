import { useRef, useState } from 'preact/hooks'
import { voltar } from '../../app/navegacao'
import { pode } from '../../app/perfil'
import { AreaDeTexto } from '../../componentes/AreaDeTexto'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { Campo } from '../../componentes/Campo'
import { Contador } from '../../componentes/Contador'
import { Interruptor } from '../../componentes/Interruptor'
import { base } from '../../dados/estado'
import { salvarConfiguracao } from '../../dados/gestao'
import { TAMANHOS, VALIDADE_DO_CONVITE, validarConfiguracao } from '../../dominio/configuracao'
import type { CampoConfiguracao } from '../../dominio/configuracao'
import { semErros } from '../../dominio/resultado'
import type { ErrosDeCampo } from '../../dominio/resultado'
import { plural, telefoneLegivel } from '../../dominio/texto'
import type { Configuracao } from '../../dominio/tipos'
import { focarPrimeiroErro } from '../formulario'
import { SemAcesso } from './SemAcesso'

const FOCOS = [0, 1, 2] as const

/**
 * Nome do estúdio, WhatsApp de contato, os textos da página pública (frase, focos, endereço,
 * mapa, Instagram), quantos lugares uma turma nova começa tendo, e o que fica aberto para fora
 * da equipe: o app do aluno e a página pública de aula experimental.
 */
export function FormularioDoEstudio() {
  const atual = base.value?.configuracao
  const [c, setC] = useState<Configuracao | undefined>(() =>
    atual ? { ...atual, whatsapp: atual.whatsapp ? telefoneLegivel(atual.whatsapp) : '', focos: [...atual.focos] } : undefined,
  )
  const [erros, setErros] = useState<ErrosDeCampo<CampoConfiguracao>>({})
  const formulario = useRef<HTMLFormElement>(null)
  if (!pode('editar-configuracao') || !c) return <SemAcesso titulo="Estúdio" texto="Só a administração muda os dados do estúdio." />

  const mudar = <K extends keyof Configuracao>(campo: K, valor: Configuracao[K]) => {
    setC({ ...c, [campo]: valor })
    if (erros[campo]) setErros({ ...erros, [campo]: undefined })
  }
  const mudarFoco = (i: number, valor: string) => {
    const focos = FOCOS.map((n) => c.focos[n] ?? '')
    focos[i] = valor
    mudar('focos', focos)
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
      <CabecalhoDeSubtela voltarPara="Mais" rotulo="Estúdio" titulo="Dados do estúdio" idTitulo="titulo-estudio-form" />
      <form ref={formulario} class="formulario pilha" onSubmit={(e) => void salvar(e)} noValidate>
        <Campo rotulo="Nome do estúdio" valor={c.nomeEstudio} aoMudar={(v) => mudar('nomeEstudio', v)} erro={erros.nomeEstudio} maxLength={TAMANHOS.nomeEstudio} />
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

        <fieldset class="grupo">
          <legend class="micro">Na página pública</legend>
          <p class="campo-ajuda">O que quem ainda não conhece o estúdio lê na capa da página de aula experimental.</p>
          <AreaDeTexto
            rotulo="Frase de apresentação"
            valor={c.fraseCurta}
            aoMudar={(v) => mudar('fraseCurta', v)}
            maxLength={TAMANHOS.fraseCurta}
            linhas={2}
            erro={erros.fraseCurta}
            ajuda="Uma ou duas frases, por exemplo: um estúdio pequeno, com turmas de até seis pessoas."
          />
          {FOCOS.map((i) => (
            <Campo
              key={i}
              rotulo={`Foco ${i + 1}${i > 0 ? ' (opcional)' : ''}`}
              valor={c.focos[i] ?? ''}
              aoMudar={(v) => mudarFoco(i, v)}
              maxLength={TAMANHOS.foco}
              placeholder={['Fortalecimento', 'Postura', 'Mobilidade'][i]}
              erro={i === 0 ? erros.focos : undefined}
            />
          ))}
          <AreaDeTexto
            rotulo="Endereço"
            valor={c.endereco}
            aoMudar={(v) => mudar('endereco', v)}
            maxLength={TAMANHOS.endereco}
            linhas={2}
            erro={erros.endereco}
            ajuda="Rua, número, bairro e cidade. Com mais de uma unidade, o endereço de cada uma fica em Unidades."
          />
          <Campo
            rotulo="Link do mapa (opcional)"
            type="url"
            inputMode="url"
            autocapitalize="none"
            valor={c.linkDoMapa}
            aoMudar={(v) => mudar('linkDoMapa', v)}
            placeholder="https://maps.app.goo.gl/..."
            erro={erros.linkDoMapa}
            ajuda="Sem o link, a página procura o endereço no mapa."
          />
          <Campo
            rotulo="Instagram (opcional)"
            autocapitalize="none"
            valor={c.instagram}
            aoMudar={(v) => mudar('instagram', v)}
            placeholder="nome.do.estudio"
            erro={erros.instagram}
            ajuda="Só o nome do perfil, sem o @."
          />
        </fieldset>

        <fieldset class="grupo">
          <legend class="micro">Para fora da equipe</legend>
          <Interruptor
            rotulo="App do aluno"
            ligado={c.acessoDoAluno}
            aoMudar={(v) => mudar('acessoDoAluno', v)}
            ajuda="Quem tem o acesso liberado na ficha vê as aulas, avisa falta e escolhe a reposição."
          />
          <Interruptor
            rotulo="Página de aula experimental"
            ligado={c.paginaExperimental}
            aoMudar={(v) => mudar('paginaExperimental', v)}
            ajuda="Mostra os horários com vaga para quem quer conhecer o estúdio (sem nomes)."
          />
          <a class="link" href={`${import.meta.env.BASE_URL}experimental/`} target="_blank" rel="noopener">
            Ver a página pública
          </a>
          <Contador
            rotulo="Validade do convite"
            valor={c.validadeDoConviteDias}
            aoMudar={(v) => mudar('validadeDoConviteDias', v)}
            min={VALIDADE_DO_CONVITE.minimo}
            max={VALIDADE_DO_CONVITE.maximo}
            formatar={(v) => plural(v, 'dia')}
            erro={erros.validadeDoConviteDias}
            ajuda="Quem é convidado (equipe ou aluno) cria a conta dentro desse prazo. Passou? É só mandar o convite de novo."
          />
        </fieldset>
        <Botao variante="primario" type="submit" largo icone="presente">
          Salvar
        </Botao>
      </form>
    </section>
  )
}
