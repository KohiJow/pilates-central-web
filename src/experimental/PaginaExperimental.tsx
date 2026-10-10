// Página pública da aula experimental: quem achou o estúdio na internet vê o espaço, escolhe
// um horário com vaga e manda o pedido pelo WhatsApp do estúdio, com a mensagem pronta.
// Nada é gravado: a página só lê o documento público (ou a demonstração deste aparelho).
import type { JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { agoraDoApp, momento } from '../app/relogio'
import { AvisoDoRecaptcha } from '../componentes/AvisoDoRecaptcha'
import { EsqueletoDeLista } from '../componentes/Esqueleto'
import { EstadoVazio } from '../componentes/EstadoVazio'
import { FaixaDias } from '../componentes/FaixaDias'
import { Icone } from '../componentes/Icone'
import { Logo, MarcaDagua } from '../componentes/Marca'
import { Pilula } from '../componentes/Pilula'
import { dataPorExtenso, diaRelativo, horaFalada, minutosDe } from '../dominio/datas'
import { horariosAindaAbertos, mensagemDaExperimental } from '../dominio/experimental'
import { linkDoWhatsApp, plural } from '../dominio/texto'
import { movimentoReduzido } from '../movimento/preferencias'
import type { HorarioPublico, PaginaPublica } from '../dominio/tipos'
import { carregarPagina, origemDaPagina } from './dados'
import figuraUrl from '../assets/marca/figura.svg'

const BASE = import.meta.env.BASE_URL

const FOTOS = [
  { nome: 'espaco-sala-acolhida', alt: 'Sala clara com piso de pedra, tapete e arara de roupas de treino' },
  { nome: 'espaco-sala-aparelhos', alt: 'Barril e cadillac de madeira perto da janela, com bolas de exercício' },
  { nome: 'espaco-cadillac-barril', alt: 'Cadillac e espaldar de madeira, com bola cinza e rolo rosa' },
  { nome: 'espaco-escultura', alt: 'Escultura de uma figura alongando, bastidor bordado e suculenta' },
  { nome: 'espaco-planta', alt: 'Planta num vaso amarelo, na janela do estúdio' },
]

const FOCOS = ['Fortalecimento', 'Reeducação postural', 'Flexibilidade e mobilidade']

const idDoHorario = (h: HorarioPublico) => `${h.data}_${h.inicio}_${h.unidadeId}`

function linkDoMapa(endereco: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`
}

/** "A aula dura 50 minutos." ou, quando as turmas variam, "As aulas duram de 50 a 60 minutos." */
function textoDaDuracao(horarios: readonly HorarioPublico[]): string | null {
  const duracoes = horarios.map((h) => minutosDe(h.fim) - minutosDe(h.inicio)).filter((m) => m > 0)
  if (duracoes.length === 0) return null
  const menor = Math.min(...duracoes)
  const maior = Math.max(...duracoes)
  return menor === maior ? `A aula dura ${menor} minutos.` : `As aulas duram de ${menor} a ${maior} minutos.`
}

function irParaOsHorarios(e: Event) {
  const alvo = document.getElementById('horarios')
  if (!alvo) return
  e.preventDefault()
  alvo.scrollIntoView({ behavior: movimentoReduzido.peek() ? 'auto' : 'smooth', block: 'start' })
}

type Estado = { situacao: 'carregando' } | { situacao: 'pronto'; pagina: PaginaPublica | null } | { situacao: 'erro' }

export function PaginaExperimental() {
  const origem = origemDaPagina()
  const [estado, setEstado] = useState<Estado>({ situacao: 'carregando' })
  const [dia, setDia] = useState<string | null>(null)
  const [escolhido, setEscolhido] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    carregarPagina(origem, agoraDoApp())
      .then((pagina) => vivo && setEstado({ situacao: 'pronto', pagina }))
      .catch(() => vivo && setEstado({ situacao: 'erro' }))
    return () => {
      vivo = false
    }
  }, [origem])

  const pagina = estado.situacao === 'pronto' ? estado.pagina : null
  const horarios = pagina?.experimental ? horariosAindaAbertos(pagina.horarios, momento.value) : []
  const dias = [...new Set(horarios.map((h) => h.data))]
  const diaAtual = dia && dias.includes(dia) ? dia : (dias[0] ?? null)
  const doDia = horarios.filter((h) => h.data === diaAtual)
  const horario = horarios.find((h) => idDoHorario(h) === escolhido)
  const unidades = pagina?.unidades ?? []
  const nomeDaUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? ''
  const variasUnidades = unidades.length > 1
  const whatsapp = pagina?.whatsapp ?? ''
  const duracao = textoDaDuracao(horarios)
  const mensagem = mensagemDaExperimental(horario ? { ...horario, unidade: variasUnidades ? nomeDaUnidade(horario.unidadeId) : '' } : null)

  return (
    <div class="vitrine">
      <header class="vitrine-topo">
        <a class="vitrine-marca tocavel" href={BASE} aria-label="Pilates Central, abrir o app">
          <Logo tamanho={40} monograma />
          <span class="topo-nome">{pagina?.nomeEstudio ?? 'Pilates Central'}</span>
        </a>
        {origem === 'demonstracao' && (
          <span class="selo-demo selo-demo--fixo">
            <span>Demonstração</span>
          </span>
        )}
      </header>

      <main class="vitrine-conteudo" id="conteudo">
        <section class="vitrine-capa cascata" aria-labelledby="titulo-experimental">
          <MarcaDagua linhas={3} />
          <span
            class="vitrine-figura"
            aria-hidden="true"
            style={{ maskImage: `url("${figuraUrl}")`, WebkitMaskImage: `url("${figuraUrl}")` }}
          />
          <p class="micro" style={{ '--i': 0 } as JSX.CSSProperties}>
            Aula experimental
          </p>
          <h1 id="titulo-experimental" class="display" style={{ '--i': 1 } as JSX.CSSProperties}>
            Venha conhecer o estúdio <em>por dentro</em>.
          </h1>
          <p class="vitrine-texto" style={{ '--i': 2 } as JSX.CSSProperties}>
            Um estúdio pequeno no centro de Campinas. Escolha um horário com vaga e mande pelo WhatsApp: a gente confirma por lá.
          </p>
          <div class="vitrine-focos" style={{ '--i': 3 } as JSX.CSSProperties}>
            {FOCOS.map((f) => (
              <Pilula key={f}>{f}</Pilula>
            ))}
          </div>
          {/* no celular pequeno os horários ficam abaixo das fotos: um toque leva até eles */}
          <a class="link vitrine-atalho tocavel" href="#horarios" style={{ '--i': 4 } as JSX.CSSProperties} onClick={irParaOsHorarios}>
            Ver os horários com vaga
          </a>
        </section>

        <section class="vitrine-fotos" aria-label="Fotos do espaço">
          <ul class="fotos">
            {FOTOS.map((f, i) => (
              <li key={f.nome} class="foto">
                <img
                  src={`${BASE}fotos/${f.nome}-480.webp`}
                  srcSet={`${BASE}fotos/${f.nome}-480.webp 480w, ${BASE}fotos/${f.nome}-960.webp 960w`}
                  sizes="(min-width: 600px) 280px, 72vw"
                  width={480}
                  height={600}
                  alt={f.alt}
                  loading={i < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </li>
            ))}
          </ul>
        </section>

        <section id="horarios" class="secao vitrine-horarios" aria-labelledby="titulo-horarios">
          <div class="secao-cabeca">
            <h2 id="titulo-horarios" class="titulo">
              Escolha o horário
            </h2>
          </div>
          {estado.situacao === 'carregando' ? (
            <EsqueletoDeLista itens={3} altura={72} />
          ) : horarios.length === 0 || !diaAtual ? (
            <EstadoVazio
              icone="agenda"
              rotulo={estado.situacao === 'erro' ? 'Não carregou' : 'Sem horário aberto agora'}
              texto={
                whatsapp
                  ? 'Mande uma mensagem que a gente encontra um horário para você.'
                  : 'Os horários com vaga aparecem aqui em breve.'
              }
            />
          ) : (
            <>
              <FaixaDias
                dias={dias}
                selecionado={diaAtual}
                hoje={momento.value.data}
                aoSelecionar={(d) => {
                  setDia(d)
                  setEscolhido(null)
                }}
              />
              <div class="pilha" role="radiogroup" aria-label={`Horários de ${dataPorExtenso(diaAtual)}`}>
                {doDia.map((h, i) => (
                  <button
                    key={idDoHorario(h)}
                    type="button"
                    role="radio"
                    aria-checked={idDoHorario(h) === escolhido}
                    class="opcao-aula horario tocavel"
                    style={{ '--i': i } as JSX.CSSProperties}
                    onClick={() => setEscolhido(idDoHorario(h))}
                  >
                    <span class="opcao-aula-hora">{horaFalada(h.inicio)}</span>
                    <span class="opcao-aula-texto">
                      <span class="lista-item-titulo">
                        {variasUnidades ? `${nomeDaUnidade(h.unidadeId)}, até ${horaFalada(h.fim)}` : `Até ${horaFalada(h.fim)}`}
                      </span>
                      <span class="lista-item-sub">{plural(h.vagas, 'vaga')}</span>
                    </span>
                    <span class="opcao-aula-marca" aria-hidden="true">
                      <Icone nome="presente" tamanho={20} traco={2.25} />
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        {unidades.length > 0 && (
          <section class="secao" aria-labelledby="titulo-onde">
            <h2 id="titulo-onde" class="micro">
              Onde fica
            </h2>
            <ul class="lista">
              {unidades.map((u) => (
                <li key={u.id} class="lista-item">
                  <span class="item-icone" aria-hidden="true">
                    <Icone nome="local" tamanho={22} />
                  </span>
                  <span class="lista-item-texto">
                    <span class="lista-item-titulo">{u.nome}</span>
                    {u.endereco && <span class="lista-item-sub quebra-livre">{u.endereco}</span>}
                  </span>
                  {u.endereco && (
                    <a class="link" href={linkDoMapa(u.endereco)} target="_blank" rel="noopener noreferrer">
                      Mapa
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section class="secao" aria-labelledby="titulo-como">
          <h2 id="titulo-como" class="micro">
            Como funciona
          </h2>
          <ol class="passos">
            <li class="passo">
              <span class="passo-numero">1</span>
              <span>Escolha o dia e o horário com vaga.</span>
            </li>
            <li class="passo">
              <span class="passo-numero">2</span>
              <span>Mande o pedido pelo WhatsApp, com a mensagem já escrita.</span>
            </li>
            <li class="passo">
              <span class="passo-numero">3</span>
              <span>O estúdio confirma a aula com você por lá.</span>
            </li>
          </ol>
        </section>

        <section class="secao" aria-labelledby="titulo-primeira-vez">
          <h2 id="titulo-primeira-vez" class="micro">
            Primeira vez?
          </h2>
          <ul class="lista-texto">
            <li>Não precisa ter experiência nem estar em forma: a aula experimental é para você conhecer.</li>
            <li>Venha com uma roupa confortável, que deixe você se mexer à vontade.</li>
            {duracao && <li>{duracao}</li>}
          </ul>
        </section>

        <footer class="vitrine-rodape">
          <p class="texto-secundario">Esta página não guarda nenhum dado seu: o pedido vai direto para o WhatsApp do estúdio.</p>
          <a class="link" href={`${BASE}privacidade/`}>
            Aviso de privacidade
          </a>
          <a class="link" href={BASE}>
            Já é aluno? Abrir o app
          </a>
          <AvisoDoRecaptcha />
        </footer>
      </main>

      {whatsapp && (
        <div class="vitrine-acao">
          <a
            class="botao botao--primario botao--largo tocavel"
            href={linkDoWhatsApp(whatsapp, mensagem)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icone nome="mensagem" tamanho={20} />
            <span>
              {horario ? `Pedir ${diaRelativo(horario.data, momento.value.data)}, ${horaFalada(horario.inicio)}, no WhatsApp` : 'Falar no WhatsApp'}
            </span>
          </a>
        </div>
      )}
    </div>
  )
}
