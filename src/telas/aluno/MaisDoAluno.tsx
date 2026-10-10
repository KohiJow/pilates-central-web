import { sair } from '../../app/sessao'
import { escolherTema, tema } from '../../app/tema'
import { Avatar } from '../../componentes/Avatar'
import { Botao } from '../../componentes/Botao'
import { Card } from '../../componentes/Card'
import { Icone } from '../../componentes/Icone'
import { Chip } from '../../componentes/Pilula'
import { dadosDoAluno, repositorioDoAluno } from '../../dados/aluno'
import { textoDasRegras } from '../../dominio/configuracao'
import { Instalacao, SecaoDaConta, TEMAS } from '../mais/Ajustes'

const BASE = import.meta.env.BASE_URL

export function MaisDoAluno() {
  const d = dadosDoAluno.value
  const unidade = d?.unidades.find((u) => u.id === d.portal.unidadeId)
  const demo = repositorioDoAluno.value?.modo === 'demonstracao'

  return (
    <section class="tela" aria-labelledby="titulo-mais-aluno">
      <header class="cabecalho-de-tela">
        <p class="micro">Mais</p>
        <h1 id="titulo-mais-aluno" class="titulo">
          Ajustes
        </h1>
      </header>

      {d && (
        <Card class="perfil">
          <Avatar nome={d.portal.nome} tamanho={56} />
          <span class="lista-item-texto">
            <span class="subtitulo">{d.portal.nome}</span>
            <span class="lista-item-sub">Aluno{unidade ? `, unidade ${unidade.nome}` : ''}</span>
          </span>
        </Card>
      )}

      {d && (
        <section class="secao" aria-labelledby="titulo-regras-aluno">
          <h2 id="titulo-regras-aluno" class="micro">
            Como funciona a reposição
          </h2>
          <p class="texto-secundario">{textoDasRegras(d.configuracao)}</p>
        </section>
      )}

      <section class="secao" aria-labelledby="titulo-aparencia-aluno">
        <h2 id="titulo-aparencia-aluno" class="micro">
          Aparência
        </h2>
        <div class="chips" role="radiogroup" aria-label="Tema">
          {TEMAS.map((t) => (
            <Chip key={t.id} papel="radio" ativo={tema.value === t.id} aoTocar={() => escolherTema(t.id)}>
              {t.rotulo}
            </Chip>
          ))}
        </div>
      </section>

      <section class="secao" aria-labelledby="titulo-instalar-aluno">
        <h2 id="titulo-instalar-aluno" class="micro">
          Instalar no celular
        </h2>
        <Instalacao />
      </section>

      <section class="secao" aria-labelledby="titulo-dados-aluno">
        <h2 id="titulo-dados-aluno" class="micro">
          Seus dados
        </h2>
        <p class="texto-secundario">
          O estúdio guarda só o necessário para a agenda e a reposição. Para receber uma cópia dos seus dados ou pedir a exclusão, fale com o
          estúdio.
        </p>
        <a class="botao botao--secundario botao--largo tocavel" href={`${BASE}privacidade/`}>
          <Icone nome="info" tamanho={20} />
          <span>Aviso de privacidade</span>
        </a>
      </section>

      {demo ? (
        <Botao variante="terciario" icone="sair" largo onClick={sair}>
          Trocar de perfil
        </Botao>
      ) : (
        <SecaoDaConta />
      )}
      <p class="rodape-versao">Pilates Central, versão {__VERSAO__}</p>
    </section>
  )
}
