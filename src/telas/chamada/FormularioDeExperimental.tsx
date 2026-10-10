import { useRef, useState } from 'preact/hooks'
import { momento } from '../../app/relogio'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { registrarExperimental } from '../../dados/estado'
import { idNovo } from '../../dados/gestao'
import { validarExperimental } from '../../dominio/aulaExperimental'
import type { CampoExperimental, RascunhoExperimental } from '../../dominio/aulaExperimental'
import { diaRelativo, horaFalada } from '../../dominio/datas'
import { semErros } from '../../dominio/resultado'
import type { ErrosDeCampo } from '../../dominio/resultado'
import { plural, primeiroNome } from '../../dominio/texto'
import type { Aula } from '../../dominio/tipos'
import { focarPrimeiroErro } from '../formulario'

/** "hoje, às 18h" ou "amanhã, às 7h", para o botão de registrar. */
export function quandoEhAAula(aula: Pick<Aula, 'data' | 'inicio'>): string {
  return `${diaRelativo(aula.data, momento.value.data)}, às ${horaFalada(aula.inicio)}`
}

/**
 * Nome e WhatsApp de quem vem experimentar, e o registro na aula escolhida. Serve na folha da
 * aula (aula já escolhida) e no Hoje (depois de escolher a aula).
 */
export function FormularioDeExperimental({ aula, aoRegistrar }: { aula: Aula; aoRegistrar: () => void }) {
  const [r, setR] = useState<RascunhoExperimental>({ nome: '', telefone: '' })
  const [erros, setErros] = useState<ErrosDeCampo<CampoExperimental>>({})
  const [salvando, setSalvando] = useState(false)
  const formulario = useRef<HTMLFormElement>(null)

  const mudar = (campo: CampoExperimental, valor: string) => {
    setR((atual) => ({ ...atual, [campo]: valor }))
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }))
  }

  const registrar = async (e: Event) => {
    e.preventDefault()
    if (salvando) return
    const novos = validarExperimental(r)
    setErros(novos)
    if (!semErros(novos)) {
      focarPrimeiroErro(formulario.current)
      return
    }
    setSalvando(true)
    const feito = await registrarExperimental(aula.id, idNovo('x'), r)
    setSalvando(false)
    if (!feito.ok) return avisar({ texto: feito.mensagem, icone: 'info' })
    avisar({
      texto: `${primeiroNome(feito.valor.experimental.nome)} vem experimentar ${quandoEhAAula(aula)}.`,
      icone: 'convidar',
      acao: { rotulo: 'Desfazer', executar: () => void feito.valor.desfazer() },
    })
    aoRegistrar()
  }

  return (
    <form ref={formulario} class="formulario pilha" onSubmit={(e) => void registrar(e)} noValidate>
      <p class="texto-secundario">
        {plural(aula.vagas, 'vaga livre', 'vagas livres')}. A pessoa ocupa um lugar e entra na chamada; não gera reposição.
      </p>
      <Campo rotulo="Nome" valor={r.nome} aoMudar={(v) => mudar('nome', v)} autocomplete="off" autocapitalize="words" erro={erros.nome} />
      <Campo
        rotulo="WhatsApp"
        type="tel"
        inputMode="tel"
        valor={r.telefone}
        aoMudar={(v) => mudar('telefone', v)}
        placeholder="(19) 90000-0000"
        autocomplete="off"
        erro={erros.telefone}
      />
      <Botao variante="primario" type="submit" largo icone="convidar" disabled={salvando}>
        Registrar {quandoEhAAula(aula)}
      </Botao>
    </form>
  )
}
