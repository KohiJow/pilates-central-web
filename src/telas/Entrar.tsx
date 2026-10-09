import { useState } from 'preact/hooks'
import { entrarComoAlunoDaDemonstracao } from '../app/conta'
import { temProjeto, voltarAsPortas } from '../app/modo'
import { entrar } from '../app/sessao'
import { Avatar } from '../componentes/Avatar'
import { Botao } from '../componentes/Botao'
import { Card } from '../componentes/Card'
import { EsqueletoDeLista } from '../componentes/Esqueleto'
import { FolhaInferior } from '../componentes/FolhaInferior'
import { Chevrons } from '../componentes/Icone'
import { Logo, MarcaDagua } from '../componentes/Marca'
import { base, nomeDaUnidade, situacao } from '../dados/estado'
import { ordenarEquipe } from '../dominio/equipe'
import { ehAdministracao, NOME_DO_PAPEL } from '../dominio/permissoes'
import { listaFalada } from '../dominio/texto'
import type { MembroEquipe } from '../dominio/tipos'

type Escolha = 'professor' | 'equipe' | 'aluno' | null

/**
 * Entrada da demonstração: explorar como a administração, como um professor, como aluno (o app
 * do aluno) ou como outra pessoa da equipe.
 */
export function Entrar() {
  const [escolha, setEscolha] = useState<Escolha>(null)
  const equipe = ordenarEquipe(base.value?.equipe ?? []).filter((e) => e.ativo && !e.convite)
  const titular = equipe.find((e) => e.papel === 'titular')
  const lista = escolha === 'professor' ? equipe.filter((e) => e.papel === 'professor') : equipe
  const alunosComAcesso = (base.value?.alunos ?? [])
    .filter((a) => a.acesso && a.situacao === 'ativo')
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const acessoDoAlunoLigado = base.value?.configuracao.acessoDoAluno ?? false
  const pronto = situacao.value === 'pronto'

  const entrarComo = (m: MembroEquipe) => {
    setEscolha(null)
    entrar({ papel: m.papel, membroId: m.id })
  }

  return (
    <main class="entrar">
      <MarcaDagua linhas={6} />
      <div class="entrar-miolo">
        <div class="entrar-logo">
          <Logo tamanho={168} />
        </div>
        <div class="entrar-textos">
          <p class="micro">Modo demonstração</p>
          <h1 class="display">
            A agenda do estúdio, <em>no seu celular</em>.
          </h1>
          <p class="vazio-texto">
            Escolha como quer explorar. Os dados são fictícios e ficam guardados só neste aparelho.
          </p>
        </div>

        <Card
          variante="marca"
          class="escolha"
          rotulo="Explorar como administração"
          desativado={!pronto}
          aoTocar={() => titular && entrarComo(titular)}
        >
          <span class="escolha-texto">
            <span class="escolha-titulo">Explorar como administração</span>
            <span class="escolha-desc">Alunos, turmas, reposições, financeiro e ajustes das duas unidades.</span>
          </span>
          <Chevrons tamanho={22} />
        </Card>

        <Card class="escolha" rotulo="Explorar como professor" desativado={!pronto} aoTocar={() => setEscolha('professor')}>
          <span class="escolha-texto">
            <span class="escolha-titulo">Explorar como professor</span>
            <span class="escolha-desc">Faz a chamada das suas aulas, encaixa reposições e vê os alunos.</span>
          </span>
          <Chevrons tamanho={22} />
        </Card>

        {acessoDoAlunoLigado && alunosComAcesso.length > 0 && (
          <Card class="escolha" rotulo="Explorar como aluno" desativado={!pronto} aoTocar={() => setEscolha('aluno')}>
            <span class="escolha-texto">
              <span class="escolha-titulo">Explorar como aluno</span>
              <span class="escolha-desc">Vê as próximas aulas, avisa que não vem e escolhe onde repor.</span>
            </span>
            <Chevrons tamanho={22} />
          </Card>
        )}

        <Botao variante="terciario" disabled={!pronto} onClick={() => setEscolha('equipe')}>
          Entrar como outra pessoa da equipe
        </Botao>

        {temProjeto ? (
          <Botao variante="terciario" icone="voltar" onClick={voltarAsPortas}>
            Voltar e entrar com e-mail
          </Botao>
        ) : (
          <p class="entrar-rodape">
            Com o projeto do estúdio configurado, aqui aparece também o login com <span class="sem-quebra">e-mail</span> e senha.
          </p>
        )}
      </div>

      <FolhaInferior
        aberta={escolha !== null}
        aoFechar={() => setEscolha(null)}
        rotulo={escolha === 'professor' ? 'Explorar como professor' : escolha === 'aluno' ? 'Explorar como aluno' : 'Equipe'}
        titulo="Quem é você?"
      >
        {!pronto ? (
          <EsqueletoDeLista itens={3} altura={64} />
        ) : escolha === 'aluno' ? (
          <ul class="lista">
            {alunosComAcesso.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  class="lista-item tocavel"
                  onClick={() => {
                    setEscolha(null)
                    entrarComoAlunoDaDemonstracao(a.id)
                  }}
                >
                  <Avatar nome={a.nome} />
                  <span class="lista-item-texto">
                    <span class="lista-item-titulo">{a.nome}</span>
                    <span class="lista-item-sub">Aluno, {nomeDaUnidade(a.unidadeId)}</span>
                  </span>
                  <Chevrons tamanho={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul class="lista">
            {lista.map((m) => (
              <li key={m.id}>
                <button type="button" class="lista-item tocavel" onClick={() => entrarComo(m)}>
                  <Avatar nome={m.nome} />
                  <span class="lista-item-texto">
                    <span class="lista-item-titulo">{m.nome}</span>
                    <span class="lista-item-sub">
                      {escolha === 'equipe' ? `${NOME_DO_PAPEL[m.papel]}, ` : ''}
                      {ehAdministracao(m.papel) ? 'todas as unidades' : listaFalada(m.unidades.map(nomeDaUnidade))}
                    </span>
                  </span>
                  <Chevrons tamanho={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </FolhaInferior>
    </main>
  )
}
