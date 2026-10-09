# Pilates Central (web app)

Agenda, presença e reposição de aulas para um estúdio pequeno de pilates em Campinas, feito
para a dona e os professores usarem no celular, com uma mão, entre uma aula e outra.

**Demonstração:** https://kohijow.github.io/pilates-central-web/

<p>
  <img src="docs/telas/entrar.webp" alt="Tela de entrada da demonstração" width="200">
  <img src="docs/telas/hoje.webp" alt="Resumo do dia" width="200">
  <img src="docs/telas/agenda.webp" alt="Agenda do dia com vagas em pontos" width="200">
  <img src="docs/telas/chamada.webp" alt="Chamada da aula numa folha que sobe de baixo" width="200">
</p>

## O que é

O estúdio não precisa de app de treino: precisa saber quem vem em cada aula, quem faltou, quem
avisou e onde encaixar a reposição, por unidade. Os alunos fazem duas ou três aulas por semana em
horários fixos; quando alguém avisa que não vem, sai daquele dia e é encaixado em outro horário
com vaga. Com isso a dona acompanha a frequência e, na próxima etapa, as mensalidades.

É um **web app instalável** (PWA): abre no Safari do iPhone e no Chrome do Android, vai para a
tela inicial sem loja e funciona sem internet no modo demonstração.

### O que já faz (etapa 1)

- **Hoje:** próxima aula (ou a que está acontecendo), quantos alunos são esperados, quem avisou
  que não vem e as reposições do dia.
- **Agenda:** faixa de dias, unidade, aulas por manhã, tarde e noite, com horário, professor,
  alunos e vagas em pontos (com o número escrito ao lado). Desliza com o dedo para trocar de dia.
- **Chamada:** tocar na aula abre a chamada numa folha que sobe de baixo: presente, faltou ou
  avisou, com retorno na hora e "Desfazer". "Todos presentes" marca a turma num toque.
- **Reposição:** avisar falta com antecedência gera um crédito; o crédito só entra em aula da
  mesma unidade, dentro da validade e com vaga.
- **Por papel:** a dona vê as duas unidades, cancela aula (feriado ou imprevisto) e pode dar
  reposição a quem avisou em cima da hora; o professor vê as próprias aulas (ou a unidade toda).
- **Ajustes:** tema claro, escuro ou automático; como instalar no celular; recomeçar a demonstração.

## Como usar a demonstração

1. Abra o link e escolha **Explorar como dona** ou **Explorar como professor**.
2. Os dados são fictícios (nomes genéricos, e-mails em example.com) e ficam guardados só no seu
   aparelho. Em **Mais > Recomeçar demonstração** tudo volta ao começo.
3. Para ver um dia cheio a qualquer hora, fixe o relógio pela URL:
   `?agora=2026-10-09T10:00` (sexta-feira, 10h em Campinas). `?atraso=1500` simula rede lenta.

## Decisões

- **Web app em vez de app de loja.** A dona e muitos alunos usam iPhone; um PWA instala pela
  tela inicial, atualiza sozinho e não precisa de conta de desenvolvedor nem revisão de loja.
- **Preact com sinais.** API quase igual à do React (que o dono do projeto já usa no React
  Native), com uma fração do tamanho; `@preact/signals` deixa o estado reativo sem biblioteca de estado.
- **Regras puras, dados atrás de uma interface.** `src/dominio/` não sabe de onde vêm os dados;
  `src/dados/repositorio.ts` é o contrato e hoje há o adaptador de demonstração (localStorage).
  O do Firebase entra na etapa 2 sem mexer em tela nem em regra.
- **A aula é derivada da turma.** Só as exceções são gravadas (presenças, avisos, reposições,
  cancelamento). Detalhes em [docs/modelo-de-dados.md](docs/modelo-de-dados.md).
- **Relógio do estúdio.** Datas são texto no fuso de Campinas; um celular com outro fuso não
  embaralha a agenda.
- **Desfazer em vez de confirmar.** Marcar presença não pergunta "tem certeza?": aplica na hora e
  oferece "Desfazer", que reverte só o que aquela ação mudou.
- **Permissões numa tabela só** (`src/dominio/permissoes.ts`), que a tela consulta e as regras
  do Firestore vão seguir.

### Movimento

A fluidez no celular é requisito, não enfeite. Regras: só `transform` e `opacity`, durações de
180 a 320 ms, molas em `linear()` com alternativa em `cubic-bezier`, nada que dependa de hover,
`prefers-reduced-motion` respeitado. Os testes de ponta a ponta medem os intervalos entre quadros
durante cada transição e reprovam qualquer animação de outra propriedade.

Medições no Chromium (perfil Pixel 7), p95 dos intervalos entre quadros durante a animação
(60 Hz = 16,7 ms). Com a CPU 4x mais lenta, duas rodadas, e à parte o quadro em que a tela nova
é montada e pintada, antes de a animação começar:

| Transição | Normal | CPU 4x mais lenta | Quadro de montar (CPU 4x) |
|---|---|---|---|
| Troca de aba | 16,8 ms | 16,8 a 33,3 ms | 100 a 150 ms |
| Troca de dia pela faixa | 16,8 ms | 16,8 ms | 33 a 67 ms |
| Troca de dia com o dedo | 16,7 ms | 16,7 a 16,8 ms | 16,7 ms |
| Abrir a folha da aula | 16,7 ms | 33,3 a 33,4 ms | 50 a 67 ms |
| Marcar presença e aviso flutuante | 16,8 ms | 16,7 a 16,8 ms | 50 a 83 ms |
| Fechar a folha arrastando | 16,8 ms | 16,8 a 33,3 ms | 16,7 ms |
| Troca de tema (View Transition) | 16,8 ms | 16,7 a 33,3 ms | 33 a 50 ms |

Medido no contêiner do Playwright, num servidor ARM de 4 núcleos dividido com outros processos.
No WebKit desse contêiner não há GPU e tudo é pintado na CPU: até a régua (uma camada sem nada do
app animando só transform e opacity) deu p95 entre 50 e 190 ms conforme a carga da máquina. Lá os
tempos ficam registrados no relatório do teste, e o que reprova é animar outra propriedade.

O que as medições mudaram:

- **Sombra sem desfoque nos cards.** No WebKit, a sombra com desfoque de 24 px do briefing
  levava a 2,5 s o quadro de pintar uma tela nova; com a sombra tingida sem desfoque (borda de
  1 px e 2 px embaixo) o mesmo quadro caiu para 250 a 400 ms no mesmo ambiente.
- **A animação começa depois de pintar.** Em aparelho lento, montar a tela nova pode levar mais
  que um quadro; se a animação começasse junto, o movimento "pularia".
- **Troca de aba em CSS, não em View Transition.** No Chromium a View Transition teve picos de
  33 ms e bloqueia o toque enquanto roda; a animação em CSS ficou em 16,8 ms e não bloqueia.
  A View Transition ficou como melhoria progressiva na troca de tema (Chromium). No WebKit dos
  testes a captura da tela travou a página por segundos; até ser medida num iPhone de verdade
  (`?transicao=vista` força), Safari e Firefox trocam o tema sem transição.
- **Um bloco se move por vez.** A cascata das listas só acontece quando os dados chegam; numa
  troca de tela ou de dia quem desliza é o bloco inteiro.
- **Pílula do dia em pêssego.** Com a pílula terracota sólida deslizando, o número do dia sumia
  por alguns quadros (texto claro sobre o creme); no pêssego o texto é escuro nos dois fundos.

## Acessibilidade

Pensada para gente de 40+ usando com uma mão: alvos de toque de 48 px ou mais, texto corrido de
16 px ou mais, contraste de 4,5:1 conferido por teste sobre os próprios tokens de cor (o âmbar
nunca é texto; o terracota médio só aparece em ícone), estado nunca só por cor (vagas têm número
escrito, presença tem ícone e rótulo), folha com foco preso e o resto do app inerte, barra de
abas com rótulo sempre visível.

## Stack

Vite, TypeScript estrito, Preact, @preact/signals, CSS próprio com variáveis (sem biblioteca de
componentes), Figtree e Playfair Display servidas pelo próprio site (@fontsource), service worker
escrito à mão, Vitest e @playwright/test. Firebase (Auth e Firestore, plano gratuito) na etapa 2.

## Como rodar

Precisa de Node 22.

```bash
npm ci
npm run dev        # http://127.0.0.1:8887/pilates-central-web/
npm run build      # tipos + empacotamento em dist/
npm run preview    # serve dist/ na mesma porta
```

## Como testar

```bash
npm run typecheck  # app, testes, configurações e service worker
npm run lint
npm test           # Vitest: domínio, dados, molas, gestos e contraste
npm run e2e        # Playwright: Chromium (Pixel 7) e WebKit (iPhone 13)
```

Os testes de ponta a ponta usam a versão publicada localmente (`npm run build` antes). Em Linux
ARM, onde o WebKit não instala direto, dá para rodar pelo contêiner oficial do Playwright:

```bash
npm run preview &
podman run --rm --network host -v "$PWD":/w:Z -w /w --ipc=host \
  mcr.microsoft.com/playwright:v1.60.0-noble npx playwright test
```

`LENTO=1` liga a CPU 4x mais lenta no Chromium e `GRAVAR=1` grava vídeo das transições.
No GitHub Actions cada motor roda num job e, na `main`, o site é publicado no Pages.

## Segurança e privacidade

- Sem servidor próprio: o site é estático (GitHub Pages). Na demonstração nada sai do aparelho.
- Política de segurança de conteúdo na página: scripts, estilos, fontes e imagens só do próprio
  site; o único script embutido (o que aplica o tema antes da primeira pintura) entra por hash.
- Os dados de exemplo são fictícios: nomes genéricos, e-mails em example.com, telefones
  55 11 90000-00xx. As fotos do espaço no repositório não têm pessoas.
- Na etapa 2, os dados reais ficam no Firestore com regras por papel (professor não lê
  financeiro), testadas no emulador antes de existir projeto real. Nenhuma chave privada no
  repositório: a configuração web do Firebase é pública por desenho e a proteção são as regras.

## Estrutura

```
src/
  dominio/     regras puras e testadas (agenda, presença, reposição, resumo, pagamentos, permissões)
  dados/       contrato do repositório, adaptador de demonstração, dados fictícios, estado em sinais
  movimento/   molas, tempos, gestos, animação depois de pintar, retorno de toque
  componentes/ botão, campo, chip, card, folha inferior, faixa de dias, vagas, avisos, ícones
  telas/       Entrar, Hoje, Agenda, chamada e Ajustes
  estilos/     tokens, base, componentes, telas e movimento
  pwa/         modelo do service worker
e2e/           testes de ponta a ponta e de fluidez
scripts/       plugin do service worker e da política de segurança; geração de ícones
docs/          roteiro, modelo de dados e capturas de tela
```

## Roteiro

Etapa 1 (esta): fundação, agenda e presença. Etapa 2: alunos, financeiro e Firebase. Etapa 3:
o aluno remarca a própria aula e a página pública de aula experimental. Detalhes e o que falta
em [docs/roteiro.md](docs/roteiro.md).

## Créditos

A marca Pilates Central e as fotos do espaço pertencem ao estúdio.
