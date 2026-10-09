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
- [x] Figura do logo separada (`figura.svg`) para ilustração; monograma para o favicon
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
- [x] Dados fictícios determinísticos: 2 unidades, dona e 3 professores, 40 alunos, 29 turmas, três semanas de histórico, feriado de 12/10, mensalidades pendentes
- [x] "Recomeçar demonstração" em Ajustes; `?agora=AAAA-MM-DDTHH:MM` fixa o relógio (demonstrações e testes); `?atraso=ms` simula rede lenta

### Telas
- [x] Entrar (demonstração: explorar como dona ou como um dos professores)
- [x] Abas por papel (hoje as mesmas três; Alunos e Financeiro entram na etapa 2)
- [x] Hoje: próxima aula, alunos esperados, avisos, reposições, aulas seguintes
- [x] Agenda: faixa de dias, unidade, só as minhas (professor), aulas por período, deslizar entre dias
- [x] Chamada na folha: presente, faltou, avisou, todos presentes, desfazer, encaixar reposição, dar crédito fora do prazo (dona), cancelar e reabrir aula (dona)
- [x] Ajustes: tema, instalar no celular (Android com botão, iPhone com passo a passo), recomeçar demonstração, trocar de perfil

### Testes e publicação
- [x] Vitest: domínio, dados, molas, gestos, contraste dos tokens (157 testes)
- [x] Playwright em dois projetos (Chromium com Pixel 7, WebKit com iPhone 13): entrada, agenda, chamada, hoje, PWA, acessibilidade (alvos de 48 px, texto de 16 px, folha inerte, reduzir movimento) e fluidez (intervalos de quadro e propriedades animadas)
- [x] GitHub Actions: tipos, lint, Vitest, build, ponta a ponta nos dois motores e publicação no Pages

## Etapa 2: alunos, financeiro e Firebase (a fazer)

- [ ] Projeto Firebase (plano gratuito) e arquivo de configuração público (`VITE_FIREBASE_*`); sem configuração, continua em demonstração
- [ ] Adaptador `src/dados/firebase/` implementando `Repositorio`, com o SDK modular carregado sob demanda (`import()` em `criar.ts`; o service worker já ignora pedaços com "firebase" no nome)
- [ ] Gravação por campo (`updateDoc` com `marcacoes.<aluno>`) em lote, para duas pessoas marcarem a mesma aula sem uma apagar a outra
- [ ] Login com e-mail e senha na tela Entrar; equipe com papel guardado em `equipe/{uid}`
- [ ] Regras do Firestore por papel seguindo `src/dominio/permissoes.ts` e a tabela de coleções em [modelo-de-dados.md](modelo-de-dados.md), testadas no emulador (`firebase emulators:exec --project demo-pilates`), nunca em projeto real
- [ ] Ampliar `connect-src` da política de segurança para os domínios do Firebase (e do emulador em desenvolvimento)
- [ ] Aba Alunos (dona e professor): lista por unidade, busca, ficha com turmas fixas, créditos e histórico de presença; cadastro e edição só para a dona
- [ ] Turmas: criar, editar capacidade e horário, mover aluno de turma (conferindo lotação)
- [ ] Aba Financeiro (só a dona): mensalidades do mês por unidade, registrar pagamento (forma, data), pendentes, totais por forma (as regras de `pagamentos.ts` já existem)
- [ ] Configuração do estúdio (validade do crédito, antecedência do aviso, capacidade padrão, WhatsApp)
- [ ] Feriados: a dona cancela um dia inteiro de uma vez

## Etapa 3: aluno e página pública (a fazer)

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
