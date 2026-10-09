import { useEffect, useRef, useState } from 'preact/hooks'
import { membro } from '../../app/perfil'
import { hoje } from '../../app/relogio'
import { Avatar } from '../../componentes/Avatar'
import { avisar } from '../../componentes/Avisos'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { FolhaInferior } from '../../componentes/FolhaInferior'
import { Chip } from '../../componentes/Pilula'
import { Seletor } from '../../componentes/Seletor'
import { alunosPorId, base, financeiro, nomeDaUnidade, pagamentos } from '../../dados/estado'
import { lancarPagamento } from '../../dados/gestao'
import { filtrarAlunos } from '../../dominio/alunos'
import { dataCurta } from '../../dominio/datas'
import {
  emDecimal,
  emReais,
  FORMAS,
  lerValor,
  NOME_DA_FORMA,
  nomeDaCompetencia,
  ultimasCompetencias,
  validarPagamento,
  valorSugerido,
} from '../../dominio/pagamentos'
import type { CampoPagamento, RascunhoPagamento } from '../../dominio/pagamentos'
import { semErros } from '../../dominio/resultado'
import type { ErrosDeCampo } from '../../dominio/resultado'
import { primeiroNome } from '../../dominio/texto'
import type { Competencia, Id } from '../../dominio/tipos'
import { focarPrimeiroErro } from '../formulario'

interface Props {
  aberta: boolean
  aoFechar: () => void
  /** aluno já escolhido (vindo da ficha ou da lista de em aberto) */
  alunoId?: Id | null
  competencia: Competencia
}

function rascunhoPara(alunoId: Id | null | undefined, competencia: Competencia): RascunhoPagamento {
  const fin = alunoId ? financeiro.peek().get(alunoId) : undefined
  const pago = [...pagamentos.peek().values()]
    .filter((p) => p.alunoId === alunoId && p.competencia === competencia)
    .reduce((s, p) => s + p.valor, 0)
  const valor = valorSugerido(fin, pago)
  return {
    valor: valor ? emDecimal(valor) : '',
    forma: fin?.formaPreferida ?? null,
    pagoEm: hoje.peek(),
    competencia,
    observacao: '',
  }
}

/**
 * Lançamento rápido: o valor vem sugerido pelo plano (ou pelo que falta do mês), a forma
 * preferida já vem marcada e a data é hoje. Quase sempre é só conferir e tocar em "Lançar".
 */
export function FolhaDePagamento({ aberta, aoFechar, alunoId, competencia }: Props) {
  const [escolhido, setEscolhido] = useState<Id | null>(alunoId ?? null)
  const [busca, setBusca] = useState('')
  const [r, setR] = useState<RascunhoPagamento>(() => rascunhoPara(alunoId, competencia))
  const [erros, setErros] = useState<ErrosDeCampo<CampoPagamento>>({})
  const corpo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberta) return
    setEscolhido(alunoId ?? null)
    setBusca('')
    setR(rascunhoPara(alunoId, competencia))
    setErros({})
  }, [aberta, alunoId, competencia])

  const aluno = escolhido ? alunosPorId.value.get(escolhido) : undefined
  const mudar = <K extends keyof RascunhoPagamento>(campo: K, valor: RascunhoPagamento[K]) => {
    setR((atual) => ({ ...atual, [campo]: valor }))
    if (erros[campo as CampoPagamento]) setErros((e) => ({ ...e, [campo]: undefined }))
  }
  const escolher = (id: Id) => {
    setEscolhido(id)
    setR(rascunhoPara(id, r.competencia))
  }

  const lancar = async () => {
    const autor = membro.peek()
    if (!aluno || !autor) return
    const e = validarPagamento(r, hoje.peek())
    setErros(e)
    if (!semErros(e)) {
      focarPrimeiroErro(corpo.current)
      return
    }
    const feito = await lancarPagamento(r, aluno.id, autor.id)
    if (!feito.ok) return avisar({ texto: feito.mensagem, icone: 'info' })
    const desfazer = feito.valor.desfazer
    avisar({
      texto: `${emReais(feito.valor.pagamento.valor)} de ${primeiroNome(aluno.nome)} lançado (${NOME_DA_FORMA[feito.valor.pagamento.forma]}).`,
      icone: 'dinheiro',
      ...(desfazer ? { acao: { rotulo: 'Desfazer', executar: () => void desfazer() } } : {}),
    })
    aoFechar()
  }

  const valor = lerValor(r.valor)
  const competencias = ultimasCompetencias(competencia > hoje.value.slice(0, 7) ? competencia : hoje.value.slice(0, 7), 6).reverse()

  return (
    <FolhaInferior
      aberta={aberta}
      aoFechar={aoFechar}
      rotulo="Lançar pagamento"
      titulo={aluno ? aluno.nome : 'De quem é o pagamento?'}
      subtitulo={aluno ? <span>{nomeDaUnidade(aluno.unidadeId)}, mensalidade de {nomeDaCompetencia(r.competencia)}</span> : undefined}
      rodape={
        aluno ? (
          <Botao variante="primario" largo icone="dinheiro" onClick={() => void lancar()}>
            {valor ? `Lançar ${emReais(valor)}` : 'Lançar pagamento'}
          </Botao>
        ) : undefined
      }
    >
      {!aluno ? (
        <EscolherAluno busca={busca} aoBuscar={setBusca} aoEscolher={escolher} />
      ) : (
        <div class="pilha formulario" ref={corpo}>
          <Campo
            rotulo="Valor (R$)"
            valor={r.valor}
            aoMudar={(v) => mudar('valor', v)}
            inputMode="decimal"
            autocomplete="off"
            {...(erros.valor ? { erro: erros.valor } : {})}
          />
          <fieldset class="grupo">
            <legend class="campo-rotulo">Forma de pagamento</legend>
            <div class="chips" role="radiogroup" aria-label="Forma de pagamento" aria-invalid={erros.forma ? 'true' : undefined} tabIndex={-1}>
              {FORMAS.map((f) => (
                <Chip key={f} papel="radio" ativo={r.forma === f} aoTocar={() => mudar('forma', f)}>
                  {NOME_DA_FORMA[f]}
                </Chip>
              ))}
            </div>
            {erros.forma && <p class="campo-erro">{erros.forma}</p>}
          </fieldset>
          <Seletor
            rotulo="Mês da mensalidade"
            valor={r.competencia}
            aoMudar={(v) => mudar('competencia', v)}
            opcoes={competencias.map((c) => ({ valor: c, rotulo: nomeDaCompetencia(c) }))}
            {...(erros.competencia ? { erro: erros.competencia } : {})}
          />
          <Campo
            rotulo="Data do pagamento"
            type="date"
            valor={r.pagoEm}
            max={hoje.value}
            aoMudar={(v) => mudar('pagoEm', v)}
            {...(erros.pagoEm ? { erro: erros.pagoEm } : { ajuda: r.pagoEm === hoje.value ? 'Hoje' : dataCurta(r.pagoEm) })}
          />
          <Campo
            rotulo="Observação (opcional)"
            valor={r.observacao}
            aoMudar={(v) => mudar('observacao', v)}
            maxLength={200}
            {...(erros.observacao ? { erro: erros.observacao } : {})}
          />
        </div>
      )}
    </FolhaInferior>
  )
}

function EscolherAluno({ busca, aoBuscar, aoEscolher }: { busca: string; aoBuscar: (v: string) => void; aoEscolher: (id: Id) => void }) {
  const alunos = filtrarAlunos(base.value?.alunos ?? [], { busca, situacao: 'ativo' }).slice(0, 30)
  return (
    <div class="pilha">
      <Campo rotulo="Buscar aluno" icone="busca" type="search" valor={busca} aoMudar={aoBuscar} placeholder="Nome" autocomplete="off" />
      <ul class="lista">
        {alunos.map((a) => (
          <li key={a.id}>
            <button type="button" class="lista-item tocavel" onClick={() => aoEscolher(a.id)}>
              <Avatar nome={a.nome} />
              <span class="lista-item-texto">
                <span class="lista-item-titulo">{a.nome}</span>
                <span class="lista-item-sub">{nomeDaUnidade(a.unidadeId)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
