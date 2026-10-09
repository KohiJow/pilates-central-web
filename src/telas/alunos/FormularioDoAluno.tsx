import { useEffect, useRef, useState } from 'preact/hooks'
import { substituir, voltar } from '../../app/navegacao'
import { pode } from '../../app/perfil'
import { hoje } from '../../app/relogio'
import { AreaDeTexto } from '../../componentes/AreaDeTexto'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { Campo } from '../../componentes/Campo'
import { Contador } from '../../componentes/Contador'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { Chip } from '../../componentes/Pilula'
import { Seletor } from '../../componentes/Seletor'
import { alunosPorId, base, carregarFinanceiro, financeiro, situacaoFinanceira, unidades } from '../../dados/estado'
import { salvarAluno } from '../../dados/gestao'
import { mensalidadeSugerida, rascunhoDe, telefoneRepetido, validarAluno, validarPlano } from '../../dominio/alunos'
import type { CampoAluno, RascunhoAluno, RascunhoPlano } from '../../dominio/alunos'
import { emDecimal, FORMAS, NOME_DA_FORMA } from '../../dominio/pagamentos'
import { semErros } from '../../dominio/resultado'
import type { ErrosDeCampo } from '../../dominio/resultado'
import { primeiroNome, telefoneLegivel } from '../../dominio/texto'
import type { FormaPagamento, Id } from '../../dominio/tipos'
import { focarPrimeiroErro } from '../formulario'
import { unidadeDosAlunos } from './estadoDaLista'

const PLANOS = [1, 2, 3, 4, 5]

function planoInicial(alunoId: Id | undefined, vezes: number): RascunhoPlano {
  const fin = alunoId ? financeiro.peek().get(alunoId) : undefined
  if (fin) return { valorMensal: emDecimal(fin.valorMensal), formaPreferida: fin.formaPreferida, diaVencimento: fin.diaVencimento }
  const sugerida = mensalidadeSugerida(vezes, base.peek()?.alunos ?? [], financeiro.peek())
  return { valorMensal: sugerida ? emDecimal(sugerida) : '', formaPreferida: 'pix', diaVencimento: 10 }
}

/** Cadastro e edição do aluno (só a administração). O plano financeiro vai junto. */
export function FormularioDoAluno({ alunoId }: { alunoId?: Id }) {
  const anterior = alunoId ? alunosPorId.value.get(alunoId) : undefined
  const podeEditar = pode('editar-alunos')
  const [r, setR] = useState<RascunhoAluno>(() =>
    anterior
      ? { ...rascunhoDe(anterior), telefone: anterior.telefone ? telefoneLegivel(anterior.telefone) : '' }
      : {
          nome: '',
          telefone: '',
          email: '',
          unidadeId: unidadeDosAlunos.peek() ?? unidades.peek()[0]?.id ?? '',
          vezesPorSemana: 2,
          observacao: '',
          desde: hoje.peek(),
        },
  )
  // até a pessoa mexer no plano, ele acompanha o que o estúdio cobra (e chega quando o financeiro carrega)
  const [planoEditado, setPlanoEditado] = useState<RascunhoPlano | null>(null)
  const prontoFinanceiro = situacaoFinanceira.value === 'pronto'
  const plano = planoEditado ?? planoInicial(alunoId, r.vezesPorSemana)
  const planoTocado = planoEditado !== null
  const [erros, setErros] = useState<ErrosDeCampo<CampoAluno>>({})
  const [salvando, setSalvando] = useState(false)
  const formulario = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (pode('ver-financeiro')) void carregarFinanceiro([hoje.peek().slice(0, 7)])
  }, [])

  if (!podeEditar || (alunoId && !anterior)) {
    return (
      <section class="tela">
        <CabecalhoDeSubtela voltarPara="Alunos" titulo="Cadastro" />
        <EstadoVazio icone="alunos" rotulo="Sem acesso" texto="Só a administração cadastra e edita alunos." />
      </section>
    )
  }

  const mudar = <K extends keyof RascunhoAluno>(campo: K, valor: RascunhoAluno[K]) => {
    setR((atual) => ({ ...atual, [campo]: valor }))
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }))
  }
  const mudarPlano = <K extends keyof RascunhoPlano>(campo: K, valor: RascunhoPlano[K]) => {
    setPlanoEditado({ ...plano, [campo]: valor })
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }))
  }

  const salvar = async (e: Event) => {
    e.preventDefault()
    const b = base.peek()
    if (!b || salvando) return
    const novos = {
      ...validarAluno(r, { unidades: b.unidades, turmas: b.turmas, hoje: hoje.peek(), ...(alunoId ? { alunoId } : {}) }),
      ...validarPlano(plano),
    }
    setErros(novos)
    if (!semErros(novos)) {
      avisar({ texto: 'Confira os campos marcados.', icone: 'info' })
      focarPrimeiroErro(formulario.current)
      return
    }
    setSalvando(true)
    const feito = await salvarAluno(r, plano, alunoId)
    setSalvando(false)
    if (!feito.ok) return avisar({ texto: feito.mensagem, icone: 'info' })
    avisar({
      texto: alunoId ? 'Cadastro atualizado.' : `Cadastro de ${primeiroNome(feito.valor.aluno.nome)} feito. Agora é só colocar nas turmas.`,
      icone: 'presente',
    })
    if (alunoId) voltar()
    else substituir(feito.valor.aluno.id)
  }

  const repetido = telefoneRepetido(r.telefone, base.value?.alunos ?? [], alunoId)
  const listaDeUnidades = unidades.value

  return (
    <section class="tela" aria-labelledby="titulo-formulario">
      <CabecalhoDeSubtela
        voltarPara={anterior ? primeiroNome(anterior.nome) : 'Alunos'}
        rotulo={anterior ? 'Editar cadastro' : 'Cadastro'}
        titulo={anterior ? anterior.nome : 'Novo aluno'}
        idTitulo="titulo-formulario"
      />
      <form ref={formulario} class="formulario pilha" onSubmit={(e) => void salvar(e)} noValidate>
        <Campo
          rotulo="Nome e sobrenome"
          valor={r.nome}
          aoMudar={(v) => mudar('nome', v)}
          autocomplete="off"
          autocapitalize="words"
          erro={erros.nome}
        />
        <Campo
          rotulo="Telefone (WhatsApp)"
          type="tel"
          inputMode="tel"
          valor={r.telefone}
          aoMudar={(v) => mudar('telefone', v)}
          placeholder="(19) 90000-0000"
          autocomplete="off"
          erro={erros.telefone}
          ajuda={repetido ? `Atenção: ${repetido.nome} já usa este número.` : undefined}
        />
        <Campo
          rotulo="E-mail (opcional)"
          type="email"
          inputMode="email"
          valor={r.email}
          aoMudar={(v) => mudar('email', v)}
          autocomplete="off"
          autocapitalize="none"
          erro={erros.email}
        />
        {listaDeUnidades.length > 1 && (
          <fieldset class="grupo">
            <legend class="campo-rotulo">Unidade</legend>
            <div class="chips" role="radiogroup" aria-label="Unidade" aria-invalid={erros.unidadeId ? 'true' : undefined} tabIndex={-1}>
              {listaDeUnidades.map((u) => (
                <Chip key={u.id} papel="radio" ativo={r.unidadeId === u.id} aoTocar={() => mudar('unidadeId', u.id)}>
                  {u.nome}
                </Chip>
              ))}
            </div>
            {erros.unidadeId && <p class="campo-erro">{erros.unidadeId}</p>}
          </fieldset>
        )}
        <fieldset class="grupo">
          <legend class="campo-rotulo">Plano: vezes por semana</legend>
          <div class="chips" role="radiogroup" aria-label="Vezes por semana">
            {PLANOS.map((n) => (
              <Chip key={n} papel="radio" ativo={r.vezesPorSemana === n} aoTocar={() => mudar('vezesPorSemana', n)}>
                {n}x
              </Chip>
            ))}
          </div>
          {erros.vezesPorSemana && <p class="campo-erro">{erros.vezesPorSemana}</p>}
        </fieldset>

        <fieldset class="grupo grupo--cartao">
          <legend class="micro">Mensalidade</legend>
          <Campo
            rotulo="Valor por mês (R$)"
            inputMode="decimal"
            valor={plano.valorMensal}
            aoMudar={(v) => mudarPlano('valorMensal', v)}
            autocomplete="off"
            erro={erros.valorMensal}
            ajuda={!alunoId && prontoFinanceiro && plano.valorMensal && !planoTocado ? 'O valor que o estúdio mais cobra neste plano.' : undefined}
          />
          <Seletor
            rotulo="Forma de pagamento preferida"
            valor={plano.formaPreferida}
            aoMudar={(v) => mudarPlano('formaPreferida', v as FormaPagamento)}
            opcoes={FORMAS.map((f) => ({ valor: f, rotulo: NOME_DA_FORMA[f] }))}
          />
          <Contador
            rotulo="Vence todo dia"
            valor={plano.diaVencimento}
            aoMudar={(v) => mudarPlano('diaVencimento', v)}
            min={1}
            max={28}
            erro={erros.diaVencimento}
          />
        </fieldset>

        <Campo
          rotulo="Aluno desde"
          type="date"
          valor={r.desde}
          max={hoje.value}
          aoMudar={(v) => mudar('desde', v)}
          erro={erros.desde}
        />
        <AreaDeTexto
          rotulo="Observação (opcional)"
          valor={r.observacao}
          aoMudar={(v) => mudar('observacao', v)}
          maxLength={500}
          ajuda="Só a equipe vê."
          erro={erros.observacao}
        />
        <Botao variante="primario" type="submit" largo icone="presente" disabled={salvando}>
          {anterior ? 'Salvar alterações' : 'Cadastrar aluno'}
        </Botao>
      </form>
    </section>
  )
}
