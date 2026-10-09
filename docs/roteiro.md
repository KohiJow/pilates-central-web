# Roteiro

Documento de passagem entre etapas: o que já está feito, o que falta e o que quem pegar o
trabalho precisa saber. Atualizar a cada entrega.

## Etapa 1: fundação e agenda com presença (feita)

### Projeto
- [x] Vite + TypeScript estrito + Preact + @preact/signals, sem biblioteca de componentes
- [x] ESLint enxuto (recomendados do TypeScript, regras de hooks)
- [x] Scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `e2e`, `icones`
- [x] Caminho base do GitHub Pages (`/pilates-central-web/`) igual em desenvolvimento e publicação
- [x] Política de segurança de conteúdo numa `<meta>` (o Pages não manda cabeçalho), com hash do único script embutido

### App instalável (PWA)
- [x] Manifesto com nome, cores do tema, `display: standalone`, ícones 192 e 512, ícone maskable e `apple-touch-icon`
- [x] Ícones gerados do logo vetorizado (`npm run icones`); favicon com o monograma
- [x] Service worker gerado no build (`scripts/plugin-offline.ts` + `src/pwa/sw.js`): guarda o app e as fontes latinas e abre sem internet no modo demonstração
- [ ] Aviso de "versão nova disponível" (hoje o SW novo assume no próximo carregamento)

### Identidade
- [x] Logo vetorizado com potrace (`src/assets/marca/logo.svg`), anel refeito em geometria
- [x] Figura do logo separada (`figura.svg`, ainda sem uso: pensada para estados vazios e a página pública); monograma para o favicon
- [x] Tokens de cor, tipo, forma e movimento em `src/estilos/tokens.css`, com tema escuro
- [x] Fontes Playfair Display e Figtree servidas pelo próprio site (só o subconjunto latino)
- [x] Ícones de traço próprios (`src/componentes/Icone.tsx`), marca d'água PILATES, chevrons duplos, pílulas de contorno, card terracota, sombra tingida
- [x] Fotos do espaço tratadas pela receita do briefing, 4:5, webp em 480 e 960 px (`public/fotos/`), para a página pública da etapa 3. Nenhuma foto com pessoas. A etiqueta do vaso (com nomes) foi apagada.

### Movimento e componentes
- [x] `src/movimento/`: molas em `linear()` com alternativa `cubic-bezier`, durações de 180 a 320 ms, só transform e opacity, `prefers-reduced-motion`
- [x] Animação começa depois de pintar (`animarDepoisDePintar`): em aparelho lento o tempo de montar a tela não come o movimento
- [x] Botões (primário, secundário, terciário), campo, pílula e chip, card, folha inferior arrastável (velocidade, resistência, "voltar" do Android, foco preso, Esc), faixa de dias com pílula deslizante, vagas em pontos, esqueleto com brilho por transform, aviso flutuante com desfazer, estado vazio com selo de traço, barra de abas com rótulo, números que contam
- [x] Retorno de toque com escala e o conserto do `:active` no iOS
- [x] Entrada em cascata das listas quando os dados chegam
- [x] View Transition na troca de tema (Chromium); troca de aba em CSS (mediu melhor, ver README)
- [ ] Medir a View Transition num iPhone de verdade (`?transicao=vista` força) e, se fluida, liberar no Safari

### Domínio e dados
- [x] Tipos e regras: unidade, equipe, aluno, turma recorrente, aula derivada, registro de exceções, crédito de reposição, pagamento, configuração ([modelo de dados](modelo-de-dados.md))
- [x] Presença, aviso de falta com prazo e crédito, reposição só com vaga, cancelamento e feriado, desfazer cirúrgico, permissões por papel
- [x] Interface do repositório (`src/dados/repositorio.ts`) e adaptador de demonstração em localStorage, com gravação atômica e funcionando sem armazenamento (aba anônima)
- [x] Dados fictícios determinísticos: 2 unidades, responsável e 3 professores, 40 alunos, 29 turmas, três semanas de histórico, feriado de 12/10, mensalidades pendentes
- [x] "Recomeçar demonstração" em Ajustes; `?agora=AAAA-MM-DDTHH:MM` fixa o relógio (demonstrações e testes); `?atraso=ms` simula rede lenta

### Telas
- [x] Entrar (demonstração: explorar como administração ou como um dos professores)
- [x] Abas por papel (hoje as mesmas três; Alunos e Financeiro entram na etapa 2)
- [x] Hoje: próxima aula, alunos esperados, avisos, reposições, aulas seguintes
- [x] Agenda: faixa de dias, unidade, só as minhas (professor), aulas por período, deslizar entre dias
- [x] Chamada na folha: presente, faltou, avisou, todos presentes, desfazer, encaixar reposição, dar crédito fora do prazo e cancelar e reabrir aula (administração)
- [x] Ajustes: tema, instalar no celular (Android com botão, iPhone com passo a passo), recomeçar demonstração, trocar de perfil

### Testes e publicação
- [x] Vitest: domínio, dados, molas, gestos, contraste dos tokens (157 testes)
- [x] Playwright em dois projetos (Chromium com Pixel 7, WebKit com iPhone 13): entrada, agenda, chamada, hoje, PWA, acessibilidade (alvos de 48 px, texto de 16 px, folha inerte, reduzir movimento) e fluidez (intervalos de quadro e propriedades animadas)
- [x] GitHub Actions: tipos, lint, Vitest, build, ponta a ponta nos dois motores e publicação no Pages

## Etapa 2: gestão do estúdio (em andamento)

### Papéis e dados
- [x] Papéis sem gênero: titular (aparece como "Responsável"), administrador e professor; titular e administradores formam a "Administração", com o mesmo acesso ao dia a dia, financeiro incluído (`src/dominio/permissoes.ts`)
- [x] Regras da equipe com o ator em cada uma (`src/dominio/equipe.ts`): a administração convida professores; só o titular convida, promove ou tira administradores e passa a conta adiante (para administrador ativo que já entrou no app); ninguém tira o titular. Testes de tentativa de escalada em `equipe.test.ts`
- [x] Sessão guarda só quem entrou; o papel vem do cadastro da equipe (`src/app/perfil.ts`) e quem é desativado volta para a entrada
- [x] Financeiro separado do cadastro do aluno (`FinanceiroDoAluno`: mensalidade, forma preferida, vencimento), porque no Firestore a regra libera ou nega o documento inteiro e o professor não pode ler valores
- [x] Formas de pagamento: Pix, cartão de crédito, cartão de débito, dinheiro, transferência, Gympass, TotalPass, outro
- [x] Regras puras e testadas para alunos (validação, busca, pausar e arquivar, plano x turmas), turmas (validação, capacidade, conflito de horário, entrada com data), frequência e ausências seguidas, central de reposição (aulas com vaga para um crédito, a vencer e vencidos, limite por mês), financeiro do mês (previsto, recebido, em aberto, por forma, atrasados, planilha, lembrete) e unidades
- [x] Demonstração versão 2: responsável, uma pessoa na administração e 3 professores; histórico desde o começo do mês anterior (com o trecho antigo num sorteio separado, para as três semanas recentes ficarem iguais às da etapa 1); seis meses de mensalidades; um aluno com três faltas seguidas

### Telas
- [ ] Alunos: lista com busca e filtros, ficha, cadastro e edição, pausar e arquivar, WhatsApp
- [ ] Turmas: grade da semana por unidade, criar e editar, alunos fixos com capacidade, aviso de plano x turmas
- [ ] Reposição: central com créditos a vencer e vencidos, encaixe a partir do crédito, desfazer
- [ ] Presença: frequência do mês por aluno e por turma, destaque de ausências seguidas
- [ ] Financeiro (administração): lançar pagamento, resumo do mês por unidade, em aberto com lembrete pelo WhatsApp, gráfico de 6 meses, planilha do mês
- [ ] Unidades, equipe e configurações (administração)
- [ ] Professor: agenda, alunos sem valores, chamada e reposição; sem financeiro nem ajustes do estúdio

## Etapa 3: login, regras do Firestore, aluno e página pública (a fazer)

- [ ] Arquivo único de configuração do Firebase; sem configuração, continua em demonstração (as duas portas: "Entrar" e "Ver demonstração")
- [ ] Adaptador `src/dados/firebase/` implementando `Repositorio`, com o SDK modular carregado sob demanda (`import()` em `criar.ts`; o service worker já ignora pedaços com "firebase" no nome)
- [ ] Gravação por campo (`updateDoc` com `marcacoes.<aluno>`) em lote, para duas pessoas marcarem a mesma aula sem uma apagar a outra; alunos fixos da turma com `arrayUnion`/`arrayRemove`
- [ ] Login com e-mail e senha; o primeiro acesso vira titular; convite real de professor e administrador
- [ ] Regras do Firestore seguindo `src/dominio/permissoes.ts` e `src/dominio/equipe.ts`, testadas no emulador (`firebase emulators:exec --project demo-pilates`), com as tentativas de escalada dos testes de `equipe.test.ts`
- [ ] Desligar `?agora=` e `?atraso=` fora do modo demonstração (`src/main.tsx` e `src/dados/criar.ts`)
- [ ] Ampliar `connect-src` da política de segurança para os domínios do Firebase (e do emulador em desenvolvimento)

- [ ] Acesso do aluno para cancelar ou remarcar a própria aula num horário com vaga (as regras de aviso e de encaixe já existem no domínio; falta login do aluno e regras do Firestore que limitem ao próprio registro)
- [ ] Página pública de aula experimental: quem achou o estúdio na internet vê horários com vaga e pede a aula; usar as fotos de `public/fotos/` (já tratadas, 4:5, sem pessoas) e o WhatsApp do estúdio
- [ ] Deixar o caminho aberto para Gympass (Wellhub) e TotalPass, sem integrar agora

## Notas para quem continuar

- **Rodar os testes de ponta a ponta no servidor ARM:** o WebKit não roda direto no Oracle Linux. Com o `npm run preview` no ar (porta 8887), rodar o contêiner do Playwright 1.60:
  `podman run --rm --network host -v "$PWD":/w:Z -w /w --ipc=host mcr.microsoft.com/playwright:v1.60.0-noble npx playwright test`.
  `LENTO=1` liga a CPU 4x mais lenta no Chromium; `GRAVAR=1` grava vídeo da fluidez (quadros com `ffmpeg -i video.webm -vf fps=10 quadro-%03d.png`).
- **WebKit do contêiner não tem GPU:** os tempos de quadro dele variam muito e servem de registro, não de régua (ver o comentário em `e2e/movimento.spec.ts`). Mesmo assim ele achou três problemas reais: sombra com desfoque cara demais, texto do dia sumindo no deslize e o aviso cobrindo a alça da folha.
- **Arrastar nos testes:** usar `arrastar()` de `e2e/apoio.ts`, que move um passo a cada 16 ms; o movimento instantâneo do Playwright vira "arremesso" e fecha a folha.
- **Nada de cor animada:** o teste de fluidez reprova qualquer animação ou transição que não seja de transform ou opacity.
- **Sombras:** cards usam a sombra sem desfoque (`--sombra-1`); desfoque grande só em elemento único (folha, aviso).
- **Conteúdo do repositório:** sem travessão, sem ponto médio, sem nomes reais, sem trechos de conversa com a cliente, sem fotos com pessoas. E-mails só `@example.com`, telefones `55119000000xx`.
