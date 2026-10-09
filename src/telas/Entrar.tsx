import { useState } from 'preact/hooks'
import { entrar } from '../app/sessao'
import { Avatar } from '../componentes/Avatar'
import { Card } from '../componentes/Card'
import { EsqueletoDeLista } from '../componentes/Esqueleto'
import { FolhaInferior } from '../componentes/FolhaInferior'
import { Chevrons } from '../componentes/Icone'
import { Logo, MarcaDagua } from '../componentes/Marca'
import { base, nomeDaUnidade, situacao } from '../dados/estado'
import { listaFalada } from '../dominio/texto'

/** Entrada da demonstração: explorar como a dona ou como um dos professores. */
export function Entrar() {
  const [escolhendoProfessor, setEscolhendoProfessor] = useState(false)
  const equipe = base.value?.equipe ?? []
  const dona = equipe.find((e) => e.papel === 'dona')
  const professores = equipe.filter((e) => e.papel === 'professor' && e.ativo)

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
          rotulo="Explorar como dona"
          desativado={situacao.value !== 'pronto'}
          aoTocar={() => dona && entrar({ papel: 'dona', membroId: dona.id })}
        >
          <span class="escolha-texto">
            <span class="escolha-titulo">Explorar como dona</span>
            <span class="escolha-desc">Vê as duas unidades, a agenda inteira e o resumo do dia.</span>
          </span>
          <Chevrons tamanho={22} />
        </Card>

        <Card
          class="escolha"
          rotulo="Explorar como professor"
          desativado={situacao.value !== 'pronto'}
          aoTocar={() => setEscolhendoProfessor(true)}
        >
          <span class="escolha-texto">
            <span class="escolha-titulo">Explorar como professor</span>
            <span class="escolha-desc">Faz a chamada das suas aulas e encaixa reposições.</span>
          </span>
          <Chevrons tamanho={22} />
        </Card>

        <p class="entrar-rodape">
          Com o estúdio configurado, aqui entra o login com <span class="sem-quebra">e-mail</span> e senha.
        </p>
      </div>

      <FolhaInferior
        aberta={escolhendoProfessor}
        aoFechar={() => setEscolhendoProfessor(false)}
        rotulo="Explorar como professor"
        titulo="Quem é você?"
      >
        {situacao.value !== 'pronto' ? (
          <EsqueletoDeLista itens={3} altura={64} />
        ) : (
          <ul class="lista">
            {professores.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  class="lista-item tocavel"
                  onClick={() => {
                    setEscolhendoProfessor(false)
                    entrar({ papel: 'professor', membroId: p.id })
                  }}
                >
                  <Avatar nome={p.nome} />
                  <span class="lista-item-texto">
                    <span class="lista-item-titulo">{p.nome}</span>
                    <span class="lista-item-sub">{listaFalada(p.unidades.map(nomeDaUnidade))}</span>
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
