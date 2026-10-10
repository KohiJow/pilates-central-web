import { Logo } from '../componentes/Marca'

const BASE = import.meta.env.BASE_URL

/** Aviso de privacidade em português simples (LGPD, Lei 13.709/2018). */
export function AvisoDePrivacidade() {
  return (
    <div class="vitrine">
      <header class="vitrine-topo">
        <a class="vitrine-marca tocavel" href={BASE} aria-label="Pilates Central, abrir o app">
          <Logo tamanho={40} monograma />
          <span class="topo-nome">Pilates Central</span>
        </a>
      </header>
      <main class="vitrine-conteudo documento" id="conteudo">
        <header class="cabecalho-de-tela">
          <p class="micro">Privacidade</p>
          <h1 class="display">Aviso de privacidade</h1>
          <p class="texto-secundario">Atualizado em outubro de 2026.</p>
        </header>

        <section class="secao">
          <h2 class="subtitulo">Quem cuida dos seus dados</h2>
          <p>
            O estúdio Pilates Central, que usa este app para organizar a agenda, a presença, a reposição e o controle financeiro. Para
            qualquer pedido sobre os seus dados, fale com o estúdio pelo WhatsApp ou na recepção.
          </p>
        </section>

        <section class="secao">
          <h2 class="subtitulo">O que fica guardado</h2>
          <ul class="lista-texto">
            <li>
              <strong>De quem é aluno:</strong> nome, telefone, e-mail (só para quem usa o app do aluno), unidade, plano, turmas,
              presenças, avisos de falta e reposições. Para o financeiro: mensalidade, forma de pagamento e os pagamentos feitos.
            </li>
            <li>
              <strong>Observação da equipe:</strong> um campo de texto livre para combinados do dia a dia. Não guardamos ficha de saúde.
            </li>
            <li>
              <strong>De quem vem fazer uma aula experimental:</strong> nome e WhatsApp, registrados pela equipe na aula combinada. Só a
              equipe vê, e ficam na chamada daquela aula; se a pessoa virar aluno, o cadastro nasce desses dados.
            </li>
            <li>
              <strong>De quem é da equipe:</strong> nome, e-mail, telefone, unidades e papel (responsável, administração ou professor).
            </li>
            <li>
              <strong>A conta de acesso:</strong> e-mail e senha ficam com o serviço de login do Firebase (Google). O estúdio não vê a sua
              senha.
            </li>
            <li>
              <strong>Registro de alterações:</strong> quando alguém da administração lança ou apaga um pagamento, exclui um cadastro,
              muda um acesso ou passa a conta, fica anotado quem fez e quando, só com códigos (sem nome, telefone ou e-mail). Só a
              administração vê, e ninguém edita.
            </li>
          </ul>
        </section>

        <section class="secao">
          <h2 class="subtitulo">Quem vê o quê</h2>
          <ul class="lista-texto">
            <li>
              <strong>Administração do estúdio:</strong> tudo o que está acima.
            </li>
            <li>
              <strong>Professores:</strong> agenda, turmas e alunos, sem valores de mensalidade nem pagamentos.
            </li>
            <li>
              <strong>Você, aluno:</strong> só as suas aulas, os seus créditos de reposição e as vagas das aulas, sem nome de ninguém.
            </li>
            <li>
              <strong>Quem visita a página de aula experimental:</strong> só o nome, o WhatsApp e o endereço do estúdio e os horários
              com vaga, sem nome de ninguém.
            </li>
          </ul>
          <p>
            Essas separações não dependem só da tela: o banco de dados confere o papel de quem pede e recusa o resto. Não vendemos nem
            passamos dados para ninguém, e o app não tem propaganda nem rastreamento (sem Google Analytics, sem cookies de terceiros).
          </p>
        </section>

        <section class="secao">
          <h2 class="subtitulo">Onde ficam e por quanto tempo</h2>
          <p>
            Os dados ficam no Firebase (Cloud Firestore), um serviço do Google, com acesso só pelo app. O cadastro fica enquanto você for
            aluno. Depois, pode ser arquivado e, se você pedir, excluído. Os pagamentos ficam pelo tempo que as regras de contabilidade
            pedem, sem nome, telefone nem e-mail.
          </p>
          <p>
            A página de aula experimental não guarda nada: o seu pedido vai direto para o WhatsApp do estúdio, que segue a política de
            privacidade do próprio WhatsApp.
          </p>
          <p>
            No seu celular, o app guarda só preferências (como o tema claro ou escuro), a sessão de login, para não pedir a senha toda
            vez (sai quando você toca em Sair; com "Lembrar neste aparelho" desligado, some ao fechar o navegador), e, no modo
            demonstração, dados fictícios que nunca saem do aparelho. A página de aula experimental guarda na aba, por dez minutos, os
            horários que leu, para não pedir de novo a cada abertura.
          </p>
          <p>
            Para o site só atender pedidos vindos dele mesmo, o estúdio pode ligar o App Check do Firebase, que usa o reCAPTCHA do Google
            de forma invisível; quando ligado, a frase do reCAPTCHA aparece no rodapé do login e da página de aula experimental.
          </p>
        </section>

        <section class="secao">
          <h2 class="subtitulo">Os seus direitos</h2>
          <p>Pela LGPD, você pode a qualquer momento:</p>
          <ul class="lista-texto">
            <li>saber quais dados o estúdio tem sobre você e receber uma cópia num arquivo;</li>
            <li>corrigir o que estiver errado;</li>
            <li>pedir a exclusão do seu cadastro;</li>
            <li>tirar o seu acesso ao app.</li>
          </ul>
          <p>
            Basta pedir ao estúdio. A administração exporta os seus dados ou exclui o cadastro direto pelo app, na sua ficha. Se você
            tem conta no app, o estúdio apaga também a conta de login.
          </p>
          <p>
            O que fica depois da exclusão: as presenças antigas e os pagamentos, só com um código no lugar do seu nome (sem telefone,
            e-mail nem observações), porque o caixa do estúdio precisa fechar; e a linha do registro de alterações que anota a própria
            exclusão, também só com o código.
          </p>
        </section>

        <footer class="vitrine-rodape">
          <a class="link" href={BASE}>
            Abrir o app
          </a>
          <a class="link" href={`${BASE}experimental/`}>
            Página de aula experimental
          </a>
        </footer>
      </main>
    </div>
  )
}
