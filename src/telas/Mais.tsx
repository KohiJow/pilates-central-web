import { useState } from 'preact/hooks'
import { hoje } from '../app/relogio'
import { sair, sessao } from '../app/sessao'
import { escolherTema, tema } from '../app/tema'
import type { Tema } from '../app/tema'
import { ehIPhone, estaInstalado, instalar, podeInstalar } from '../app/instalacao'
import { Avatar } from '../componentes/Avatar'
import { avisar } from '../componentes/Avisos'
import { Botao } from '../componentes/Botao'
import { Card } from '../componentes/Card'
import { FolhaInferior } from '../componentes/FolhaInferior'
import { Icone } from '../componentes/Icone'
import { Chip } from '../componentes/Pilula'
import { carregar, equipePorId, nomeDaUnidade, repositorio } from '../dados/estado'
import { NOME_DO_PAPEL } from '../dominio/permissoes'
import { listaFalada } from '../dominio/texto'
import type { RepositorioDeDemonstracao } from '../dados/repositorio'

const TEMAS: { id: Tema; rotulo: string }[] = [
  { id: 'automatico', rotulo: 'Automático' },
  { id: 'claro', rotulo: 'Claro' },
  { id: 'escuro', rotulo: 'Escuro' },
]

export function Mais() {
  const s = sessao.value
  const membro = s ? equipePorId.value.get(s.membroId) : undefined
  const [confirmando, setConfirmando] = useState(false)
  const repo = repositorio.value
  const demo = repo?.modo === 'demonstracao' ? (repo as RepositorioDeDemonstracao) : null

  const recomecar = async () => {
    if (!demo) return
    setConfirmando(false)
    await demo.recomecar()
    await carregar(demo, hoje.peek())
    avisar({ texto: 'Demonstração recomeçada com os dados do começo.', icone: 'recomecar' })
  }

  return (
    <section class="tela" aria-labelledby="titulo-mais">
      <header class="cabecalho-de-tela">
        <p class="micro">Mais</p>
        <h1 id="titulo-mais" class="titulo">
          Ajustes
        </h1>
      </header>

      {membro && s && (
        <Card class="perfil">
          <Avatar nome={membro.nome} tamanho={56} />
          <span class="lista-item-texto">
            <span class="subtitulo">{membro.nome}</span>
            <span class="lista-item-sub">
              {NOME_DO_PAPEL[s.papel]}, {listaFalada(membro.unidades.map(nomeDaUnidade))}
            </span>
          </span>
        </Card>
      )}

      <section class="secao" aria-labelledby="titulo-aparencia">
        <h2 id="titulo-aparencia" class="micro">
          Aparência
        </h2>
        <div class="chips" role="radiogroup" aria-label="Tema">
          {TEMAS.map((t) => (
            <Chip key={t.id} papel="radio" ativo={tema.value === t.id} aoTocar={() => escolherTema(t.id)}>
              {t.rotulo}
            </Chip>
          ))}
        </div>
        <p class="texto-secundario">No automático, o app acompanha o modo claro ou escuro do celular.</p>
      </section>

      <section class="secao" aria-labelledby="titulo-instalar">
        <h2 id="titulo-instalar" class="micro">
          Instalar no celular
        </h2>
        <Instalacao />
      </section>

      {demo && (
        <section class="secao" aria-labelledby="titulo-demo">
          <h2 id="titulo-demo" class="micro">
            Demonstração
          </h2>
          <p class="texto-secundario">
            Os alunos, as aulas e os pagamentos são fictícios e ficam guardados só neste aparelho.
            {demo.persistente ? '' : ' Este navegador não deixa guardar: ao fechar, tudo volta ao começo.'}
          </p>
          <Botao variante="secundario" icone="recomecar" largo onClick={() => setConfirmando(true)}>
            Recomeçar demonstração
          </Botao>
        </section>
      )}

      <Botao variante="terciario" icone="sair" largo onClick={sair}>
        Trocar de perfil
      </Botao>

      <p class="rodape-versao">Pilates Central, versão {__VERSAO__}</p>

      <FolhaInferior
        aberta={confirmando}
        aoFechar={() => setConfirmando(false)}
        rotulo="Recomeçar demonstração"
        titulo="Apagar o que você fez?"
        rodape={
          <div class="linha-acoes">
            <Botao variante="secundario" onClick={() => setConfirmando(false)}>
              Agora não
            </Botao>
            <Botao variante="primario" onClick={() => void recomecar()}>
              Recomeçar
            </Botao>
          </div>
        }
      >
        <p>As presenças, avisos e reposições que você marcou somem e os dados fictícios voltam ao começo.</p>
      </FolhaInferior>
    </section>
  )
}

function Instalacao() {
  if (estaInstalado()) return <p class="texto-secundario">O app já está instalado neste aparelho.</p>
  if (podeInstalar.value) {
    return (
      <Botao
        variante="primario"
        icone="instalar"
        largo
        onClick={async () => {
          if (await instalar()) avisar({ texto: 'Pronto! O app está na tela inicial.', icone: 'presente' })
        }}
      >
        Instalar o app
      </Botao>
    )
  }
  if (ehIPhone()) {
    return (
      <ol class="passos">
        <li class="passo">
          <span class="passo-numero">1</span>
          <span>
            No Safari, toque em <strong>Compartilhar</strong>{' '}
            <Icone nome="compartilhar" tamanho={20} class="icone-em-linha" rotulo="(ícone de compartilhar)" />
          </span>
        </li>
        <li class="passo">
          <span class="passo-numero">2</span>
          <span>
            Escolha <strong>Adicionar à Tela de Início</strong>
          </span>
        </li>
        <li class="passo">
          <span class="passo-numero">3</span>
          <span>
            Toque em <strong>Adicionar</strong>. O app abre como os outros, sem a barra do navegador.
          </span>
        </li>
      </ol>
    )
  }
  return (
    <p class="texto-secundario">
      No menu do navegador (os três pontinhos), escolha <strong>Instalar app</strong> ou{' '}
      <strong>Adicionar à tela inicial</strong>.
    </p>
  )
}
