import { useRef, useState } from 'preact/hooks'
import { substituir, voltar } from '../../app/navegacao'
import { membro as eu, pode } from '../../app/perfil'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { Campo } from '../../componentes/Campo'
import { Chip } from '../../componentes/Pilula'
import { base, equipePorId, unidades } from '../../dados/estado'
import { convidarParaEquipe, salvarMembro } from '../../dados/gestao'
import { podeEditarMembro, validarMembro } from '../../dominio/equipe'
import type { CampoMembro, RascunhoMembro } from '../../dominio/equipe'
import { semErros } from '../../dominio/resultado'
import type { ErrosDeCampo } from '../../dominio/resultado'
import { primeiroNome, telefoneLegivel } from '../../dominio/texto'
import type { Id } from '../../dominio/tipos'
import { focarPrimeiroErro } from '../formulario'
import { SemAcesso } from './SemAcesso'

/** Convidar alguém para a equipe ou mudar o contato e as unidades de quem já está nela. */
export function FormularioDeMembro({ membroId }: { membroId?: Id }) {
  const ator = eu.value
  const alvo = membroId ? equipePorId.value.get(membroId) : undefined
  const [r, setR] = useState<RascunhoMembro>(() => ({
    nome: alvo?.nome ?? '',
    email: alvo?.email ?? '',
    telefone: alvo?.telefone ? telefoneLegivel(alvo.telefone) : '',
    papel: alvo?.papel === 'professor' || !alvo ? 'professor' : 'administrador',
    unidades: alvo?.unidades ?? (unidades.peek().length === 1 ? [unidades.peek()[0]?.id ?? ''] : []),
  }))
  const [erros, setErros] = useState<ErrosDeCampo<CampoMembro>>({})
  const formulario = useRef<HTMLFormElement>(null)

  const permitido = ator && (alvo ? podeEditarMembro(ator, alvo) : pode('convidar-professor'))
  if (!ator || !permitido || (membroId && !alvo)) {
    return <SemAcesso titulo="Equipe" texto="Você não pode mudar o cadastro desta pessoa." />
  }
  const podeEscolherUnidades = pode('editar-professores')
  const mudar = <K extends keyof RascunhoMembro>(campo: K, valor: RascunhoMembro[K]) => {
    setR({ ...r, [campo]: valor })
    if (erros[campo as CampoMembro]) setErros({ ...erros, [campo]: undefined })
  }
  const alternarUnidade = (id: Id) =>
    mudar('unidades', r.unidades.includes(id) ? r.unidades.filter((u) => u !== id) : [...r.unidades, id])

  const salvar = async (e: Event) => {
    e.preventDefault()
    const papelValidado = alvo?.papel === 'titular' ? 'administrador' : r.papel
    const novos = validarMembro({ ...r, papel: papelValidado }, base.peek()?.equipe ?? [], unidades.peek(), alvo?.id)
    setErros(novos)
    if (!semErros(novos)) {
      focarPrimeiroErro(formulario.current)
      return
    }
    if (alvo) {
      const feito = await salvarMembro(ator, alvo.id, r)
      if (!feito.ok) return avisar({ texto: feito.mensagem, icone: 'info' })
      avisar({ texto: 'Cadastro atualizado.', icone: 'presente' })
      voltar()
      return
    }
    const feito = await convidarParaEquipe(ator, r)
    if (!feito.ok) return avisar({ texto: feito.mensagem, icone: 'info' })
    avisar({
      texto: `Convite registrado para ${primeiroNome(feito.valor.membro.nome)}. O acesso por e-mail chega quando o login estiver ligado.`,
      icone: 'convidar',
      duracao: 6000,
    })
    substituir('equipe', feito.valor.membro.id)
  }

  return (
    <section class="tela" aria-labelledby="titulo-membro-form">
      <CabecalhoDeSubtela
        voltarPara={alvo ? primeiroNome(alvo.nome) : 'Equipe'}
        rotulo={alvo ? 'Editar cadastro' : 'Equipe'}
        titulo={alvo ? alvo.nome : 'Convidar pessoa'}
        idTitulo="titulo-membro-form"
      />
      <form ref={formulario} class="formulario pilha" onSubmit={(e) => void salvar(e)} noValidate>
        <Campo rotulo="Nome" valor={r.nome} aoMudar={(v) => mudar('nome', v)} autocapitalize="words" erro={erros.nome} />
        <Campo
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autocapitalize="none"
          valor={r.email}
          aoMudar={(v) => mudar('email', v)}
          erro={erros.email}
          ajuda="É por ele que a pessoa vai entrar no app."
        />
        <Campo
          rotulo="Telefone (opcional)"
          type="tel"
          inputMode="tel"
          valor={r.telefone}
          aoMudar={(v) => mudar('telefone', v)}
          placeholder="(19) 90000-0000"
          erro={erros.telefone}
        />
        {!alvo && (
          <fieldset class="grupo">
            <legend class="campo-rotulo">Papel</legend>
            <div class="chips" role="radiogroup" aria-label="Papel">
              <Chip papel="radio" ativo={r.papel === 'professor'} aoTocar={() => mudar('papel', 'professor')}>
                Professor
              </Chip>
              {pode('gerenciar-administradores') && (
                <Chip papel="radio" ativo={r.papel === 'administrador'} aoTocar={() => mudar('papel', 'administrador')}>
                  Administração
                </Chip>
              )}
            </div>
            <p class="campo-ajuda">
              {r.papel === 'administrador'
                ? 'Mesmo acesso da administração ao dia a dia, financeiro incluído. Só quem é responsável pela conta mexe em quem administra.'
                : 'Vê a agenda e os alunos (sem valores), faz a chamada e encaixa reposições.'}
            </p>
          </fieldset>
        )}
        {podeEscolherUnidades && (alvo ? alvo.papel === 'professor' : r.papel === 'professor') && (
          <fieldset class="grupo">
            <legend class="campo-rotulo">Unidades onde dá aula</legend>
            <div class="chips" role="group" aria-label="Unidades" aria-invalid={erros.unidades ? 'true' : undefined} tabIndex={-1}>
              {unidades.value.map((u) => (
                <Chip key={u.id} ativo={r.unidades.includes(u.id)} aoTocar={() => alternarUnidade(u.id)}>
                  {u.nome}
                </Chip>
              ))}
            </div>
            {erros.unidades && <p class="campo-erro">{erros.unidades}</p>}
          </fieldset>
        )}
        <Botao variante="primario" type="submit" largo icone={alvo ? 'presente' : 'convidar'}>
          {alvo ? 'Salvar' : 'Registrar convite'}
        </Botao>
      </form>
    </section>
  )
}
