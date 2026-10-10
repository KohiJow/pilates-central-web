import type { ComponentChildren } from 'preact'
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks'
import { hoje } from '../app/relogio'
import { abrirEm } from '../app/navegacao'
import { membro as membroAtual, papel, pode } from '../app/perfil'
import { Botao } from '../componentes/Botao'
import { EsqueletoDeLista } from '../componentes/Esqueleto'
import { EstadoVazio } from '../componentes/EstadoVazio'
import { FaixaDias } from '../componentes/FaixaDias'
import { Chevrons } from '../componentes/Icone'
import { Chip } from '../componentes/Pilula'
import { aulasNoDia, base, cargaRecente, garantirData, situacao, unidades } from '../dados/estado'
import { agruparPorPeriodo, NOME_DO_PERIODO } from '../dominio/agenda'
import { dataPorExtenso, diaDaSemana, diasDoIntervalo, nomeDoMes, somarDias } from '../dominio/datas'
import { ehAdministracao } from '../dominio/permissoes'
import { maiuscula, plural } from '../dominio/texto'
import type { DataISO } from '../dominio/tipos'
import { animar, animarDepoisDePintar, curvaQueContinua, duracaoPelaVelocidade } from '../movimento/animar'
import { direcaoDaTroca, eixoDoGesto, resistencia, Velocimetro } from '../movimento/arraste'
import { CURVA, DURACAO } from '../movimento/tempos'
import { diaEscolhido, escolherUnidade, soMinhas, unidadeEscolhida } from './agenda/estadoDaAgenda'
import { CartaoDeAula } from './CartaoDeAula'

const DIAS_PARA_TRAS = 14
const DIAS_PARA_FRENTE = 28


export function Agenda() {
  const membro = membroAtual.value
  const ehAdm = ehAdministracao(papel.value)
  const unidadesVisiveis = unidades.value.filter((u) => ehAdm || membro?.unidades.includes(u.id))
  const unidadeId =
    unidadesVisiveis.find((u) => u.id === unidadeEscolhida.value)?.id ?? unidadesVisiveis[0]?.id ?? undefined
  const diaDeHoje = hoje.value
  const dia = diaEscolhido.value ?? diaDeHoje
  const dias = diasDoIntervalo(somarDias(diaDeHoje, -DIAS_PARA_TRAS), somarDias(diaDeHoje, DIAS_PARA_FRENTE))
  const professorId = !ehAdm && soMinhas.value ? membro?.id : undefined
  const filtro = { ...(unidadeId ? { unidadeId } : {}), ...(professorId ? { professorId } : {}) }
  const aulas = aulasNoDia(dia, filtro)
  const grupos = agruparPorPeriodo(aulas)
  const turmas = base.value?.turmas ?? []
  const diasComAula = new Set(turmas.filter((t) => t.ativa && (!unidadeId || t.unidadeId === unidadeId)).map((t) => t.diaDaSemana))

  const primeiroDia = dias[0] ?? diaDeHoje
  const ultimoDia = dias[dias.length - 1] ?? diaDeHoje
  const trocarDia = (novo: DataISO) => {
    if (novo < primeiroDia || novo > ultimoDia) return
    diaEscolhido.value = novo === diaDeHoje ? null : novo
    void garantirData(novo)
  }

  return (
    <section class="tela" aria-labelledby="titulo-agenda">
      <header class="cabecalho-de-tela">
        {/* o "Hoje" fica na linha de cima e o título tem a largura toda: com os dois lado a lado,
            no iPhone o título quebrava em duas linhas nos outros dias e a faixa de dias descia
            bem quando a pessoa tocava nela */}
        <div class="agenda-topo">
          <p class="micro">
            Agenda, {nomeDoMes(dia)} de {dia.slice(0, 4)}
          </p>
          {dia !== diaDeHoje && (
            <Botao variante="terciario" class="agenda-hoje" onClick={() => trocarDia(diaDeHoje)}>
              Hoje
            </Botao>
          )}
        </div>
        <h1 id="titulo-agenda" class="titulo agenda-titulo">
          {maiuscula(dataPorExtenso(dia))}
        </h1>
      </header>

      {(unidadesVisiveis.length > 1 || !ehAdm) && (
        <div class="agenda-filtros">
          {unidadesVisiveis.length > 1 && (
            <div class="chips" role="radiogroup" aria-label="Unidade">
              {unidadesVisiveis.map((u) => (
                <Chip key={u.id} papel="radio" ativo={u.id === unidadeId} aoTocar={() => escolherUnidade(u.id)}>
                  {u.nome}
                </Chip>
              ))}
            </div>
          )}
          {!ehAdm && (
            <Chip ativo={soMinhas.value} aoTocar={() => (soMinhas.value = !soMinhas.value)}>
              Só as minhas aulas
            </Chip>
          )}
        </div>
      )}

      <FaixaDias
        dias={dias}
        selecionado={dia}
        hoje={diaDeHoje}
        aoSelecionar={trocarDia}
        temAula={(d) => diasComAula.has(diaDaSemana(d))}
      />

      <DiaDeslizante
        dia={dia}
        temAnterior={dia > primeiroDia}
        temProximo={dia < ultimoDia}
        aoTrocar={(delta) => trocarDia(somarDias(dia, delta))}
      >
        {situacao.value !== 'pronto' ? (
          <EsqueletoDeLista itens={4} altura={112} />
        ) : !base.value?.turmas.some((t) => t.ativa) ? (
          // sem grade não há agenda: o caminho é montar as turmas da semana
          <EstadoVazio
            icone="grade"
            rotulo="Sem turmas ainda"
            texto={pode('editar-turmas') ? 'A agenda nasce da grade da semana. Monte as turmas: tocar no horário cria a turma.' : 'A agenda aparece quando a administração montar a grade da semana.'}
          >
            {pode('editar-turmas') && (
              <Botao variante="primario" icone="grade" onClick={() => abrirEm('mais', ['montar', 'turmas'])}>
                Montar a grade
              </Botao>
            )}
          </EstadoVazio>
        ) : aulas.length === 0 ? (
          <EstadoVazio
            icone="folga"
            rotulo="Sem aulas"
            texto={professorId ? 'Você não tem aula neste dia.' : 'Não tem aula neste dia.'}
          />
        ) : (
          <>
            <p class="so-leitor" aria-live="polite">
              {plural(aulas.length, 'aula')} em {dataPorExtenso(dia)}
            </p>
            {grupos.map((g) => (
              <div key={g.periodo} class="agenda-grupo">
                <div class="agenda-grupo-cabeca">
                  <h2 class="micro">{NOME_DO_PERIODO[g.periodo]}</h2>
                  <span class="texto-secundario" aria-hidden="true">
                    {plural(g.aulas.length, 'aula')}
                  </span>
                </div>
                <div class={`agenda-grupo${cargaRecente.value ? ' cascata' : ''}`}>
                  {g.aulas.map((a, i) => (
                    <CartaoDeAula key={a.id} aula={a} indice={i} mostrarUnidade={!unidadeId} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
        <p class="dica-deslizar" aria-hidden="true">
          <span style={{ transform: 'scaleX(-1)', display: 'inline-flex' }}>
            <Chevrons tamanho={14} />
          </span>
          deslize para trocar de dia
          <Chevrons tamanho={14} />
        </p>
      </DiaDeslizante>
    </section>
  )
}

interface PropsDeslizante {
  dia: DataISO
  temAnterior: boolean
  temProximo: boolean
  aoTrocar: (delta: -1 | 1) => void
  children: ComponentChildren
}

/**
 * Área da lista que troca de dia com o dedo: acompanha o arraste na horizontal (a rolagem
 * vertical continua nativa, pelo touch-action: pan-y), decide pela distância ou pela
 * velocidade e anima a saída e a entrada só com transform e opacity.
 */
function DiaDeslizante({ dia, temAnterior, temProximo, aoTrocar, children }: PropsDeslizante) {
  // a área que recebe o dedo fica parada; quem anda é o conteúdo dentro dela (se a área
  // andasse junto, um gesto começado logo depois de trocar de dia cairia fora dela)
  const area = useRef<HTMLDivElement>(null)
  const caixa = useRef<HTMLDivElement>(null)
  const gesto = useRef<{ id: number; x0: number; y0: number; eixo: 'x' | 'y' | null; dx: number; quadro: number } | null>(
    null,
  )
  const velocimetro = useRef(new Velocimetro())
  const arrastou = useRef(false)
  const diaAnterior = useRef(dia)
  const veioDoGesto = useRef(false)
  const entrada = useRef<((irParaOFim?: boolean) => void) | null>(null)

  // entrada do dia novo, vindo do lado certo
  useLayoutEffect(() => {
    const el = caixa.current
    const antes = diaAnterior.current
    diaAnterior.current = dia
    if (!el || antes === dia) return
    const direcao = dia > antes ? 1 : -1
    const distancia = veioDoGesto.current ? el.offsetWidth * 0.3 : 24
    veioDoGesto.current = false
    const animacao = animarDepoisDePintar(
      el,
      [
        { transform: `translateX(${direcao * distancia}px)`, opacity: 0.35 },
        { transform: 'translateX(0px)', opacity: 1 },
      ],
      { duration: DURACAO.media, easing: CURVA.suave },
    )
    entrada.current = animacao.cancelar
    void animacao.fim.then(() => {
      if (entrada.current === animacao.cancelar) entrada.current = null
    })
    return () => animacao.cancelar()
  }, [dia])

  useEffect(() => () => cancelAnimationFrame(gesto.current?.quadro ?? 0), [])

  const aoApertar = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // o dedo pegou a lista ainda entrando: ela vai direto para o lugar e o gesto assume
    entrada.current?.(true)
    entrada.current = null
    arrastou.current = false
    velocimetro.current.zerar()
    velocimetro.current.registrar(e.timeStamp, e.clientX, e.clientY)
    gesto.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, eixo: null, dx: 0, quadro: 0 }
  }

  const aoMover = (e: PointerEvent) => {
    const g = gesto.current
    const el = caixa.current
    if (!g || !el || e.pointerId !== g.id) return
    const dx = e.clientX - g.x0
    const dy = e.clientY - g.y0
    if (g.eixo === null) {
      g.eixo = eixoDoGesto(dx, dy)
      if (g.eixo === 'y') {
        gesto.current = null
        return
      }
      if (g.eixo === 'x') {
        area.current?.setPointerCapture(e.pointerId)
        arrastou.current = true
        for (const anim of el.getAnimations()) anim.cancel()
      }
    }
    if (g.eixo !== 'x') return
    velocimetro.current.registrar(e.timeStamp, e.clientX, e.clientY)
    const largura = el.offsetWidth || 1
    // nas pontas do calendário não há dia para onde ir: o arraste resiste como elástico
    const temVizinho = dx < 0 ? temProximo : temAnterior
    g.dx = temVizinho ? dx : Math.sign(dx) * resistencia(Math.abs(dx), 60)
    if (g.quadro) return
    g.quadro = requestAnimationFrame(() => {
      g.quadro = 0
      el.style.transform = `translateX(${g.dx}px)`
      el.style.opacity = String(1 - Math.min(Math.abs(g.dx) / largura, 1) * 0.4)
    })
  }

  const aoSoltar = (e: PointerEvent) => {
    const g = gesto.current
    const el = caixa.current
    gesto.current = null
    if (!g || !el || g.eixo !== 'x' || e.pointerId !== g.id) return
    cancelAnimationFrame(g.quadro)
    const largura = el.offsetWidth || 1
    const { vx } = velocimetro.current.velocidade()
    let direcao = e.type === 'pointercancel' ? 0 : direcaoDaTroca(g.dx, largura, vx)
    if ((direcao === 1 && !temProximo) || (direcao === -1 && !temAnterior)) direcao = 0
    const de = { transform: `translateX(${g.dx}px)`, opacity: Number(el.style.opacity || 1) }
    if (direcao === 0) {
      void animar(el, [de, { transform: 'translateX(0px)', opacity: 1 }], {
        duration: DURACAO.media,
        easing: CURVA.viva,
      })
      return
    }
    veioDoGesto.current = true
    // a lista sai no embalo do dedo (se ele ia para o mesmo lado), sem parar no instante de soltar,
    // e sempre para a frente de onde o dedo largou: com destino fixo na metade da largura, um
    // arraste longo largava a lista além dele e ela voltava um pedaço antes de sumir
    const destino = g.dx - direcao * largura * 0.3
    const falta = Math.abs(destino - g.dx)
    const noEmbalo = Math.sign(vx) === -direcao ? Math.abs(vx) : 0
    const duracao = noEmbalo ? duracaoPelaVelocidade(falta, noEmbalo, DURACAO.curta, DURACAO.media) : DURACAO.curta
    void animar(el, [de, { transform: `translateX(${destino}px)`, opacity: 0 }], {
      duration: duracao,
      easing: noEmbalo ? curvaQueContinua(noEmbalo, falta, duracao) : CURVA.saida,
    }).then(() => aoTrocar(direcao))
  }

  return (
    <div
      ref={area}
      class="agenda-dia"
      onPointerDown={aoApertar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
      onClickCapture={(e) => {
        // o toque que terminou um arraste não abre a aula
        if (arrastou.current) {
          e.stopPropagation()
          e.preventDefault()
          arrastou.current = false
        }
      }}
    >
      <div ref={caixa} class="agenda-dia-conteudo">
        {children}
      </div>
    </div>
  )
}
