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

## Etapa 2: gestão do estúdio (feita)

### Papéis e dados
- [x] Papéis sem gênero: titular (aparece como "Responsável"), administrador e professor; titular e administradores formam a "Administração", com o mesmo acesso ao dia a dia, financeiro incluído (`src/dominio/permissoes.ts`)
- [x] Regras da equipe com o ator em cada uma (`src/dominio/equipe.ts`): a administração convida professores; só o titular convida, promove ou tira administradores e passa a conta adiante (para administrador ativo que já entrou no app); ninguém tira o titular. Testes de tentativa de escalada em `equipe.test.ts`
- [x] Sessão guarda só quem entrou; o papel vem do cadastro da equipe (`src/app/perfil.ts`) e quem é desativado volta para a entrada
- [x] Financeiro separado do cadastro do aluno (`FinanceiroDoAluno`: mensalidade, forma preferida, vencimento), porque no Firestore a regra libera ou nega o documento inteiro e o professor não pode ler valores
- [x] Formas de pagamento: Pix, cartão de crédito, cartão de débito, dinheiro, transferência, Gympass, TotalPass, outro
- [x] Regras puras e testadas para alunos (validação, busca, pausar e arquivar, plano x turmas), turmas (validação, capacidade, conflito de horário, entrada com data), frequência e ausências seguidas, central de reposição (aulas com vaga para um crédito, a vencer e vencidos, limite por mês), financeiro do mês (previsto, recebido, em aberto, por forma, atrasados, planilha, lembrete) e unidades
- [x] Demonstração versão 2: responsável, uma pessoa na administração e 3 professores; histórico desde o começo do mês anterior (com o trecho antigo num sorteio separado, para as três semanas recentes ficarem iguais às da etapa 1); seis meses de mensalidades; um aluno com três faltas seguidas

### Telas
- [x] Navegação com telas empilhadas por aba (`#/alunos/a-10/editar`), "Voltar" escrito em toda subtela, histórico do navegador (o "voltar" do Android funciona) e a lista voltando para a mesma rolagem (`src/app/navegacao.ts`)
- [x] Abas por papel: administração com Hoje, Agenda, Alunos, Financeiro e Mais; professor sem Financeiro (link direto cai no Hoje)
- [x] Alunos: lista com busca sem acento ou pelo final do telefone, filtros de unidade e situação, destaque discreto de ausências seguidas e de plano x turmas; ficha com plano, turmas fixas, frequência do mês (e do mês passado), créditos, mensalidade e pagamentos, WhatsApp e ligar; cadastro e edição com validação em português e foco no primeiro erro; mensalidade sugerida pelo valor mais comum do plano; pausar e arquivar com confirmação e desfazer
- [x] Turmas: grade da semana por unidade com lugares e frequência do mês; criar e editar (horário, duração, lugares, professor) com conflito de horário do professor; colocar e tirar aluno fixo respeitando capacidade e horário do aluno, com desfazer; encerrar com confirmação e desfazer
- [x] Reposição: central com para encaixar (o que vence primeiro no topo), marcadas (as que já aconteceram ficam como feitas) e vencidas; folha de encaixe só com aulas com vaga da unidade nos próximos 14 dias, escolher e confirmar, com desfazer; na chamada, "Encaixar em outro horário" logo depois do aviso; limite de reposições por mês com cortesia da administração
- [x] Presença: frequência por aluno (ficha) e por turma (grade e detalhe) no mês; ausências seguidas com limite configurável
- [x] Financeiro: mês e unidade, previsto, recebido (com barra), em aberto, ativos; em aberto com atrasados primeiro, lembrete pelo WhatsApp e lançamento rápido; por forma de pagamento; gráfico de 6 meses tocável com tabela para leitor de tela; lançamentos com apagar e desfazer; planilha CSV do mês
- [x] Mais: nome e WhatsApp do estúdio, regras de reposição com prévia do texto, unidades (criar, editar, fechar só sem turmas e alunos), equipe (convidar, editar, promover, tirar acesso, passar a conta) com o papel escrito
- [x] Professor: agenda, alunos sem valores, chamada e reposição; sem financeiro nem ajustes do estúdio (só lê as regras de reposição)
- [ ] Cancelar o dia inteiro de uma vez (feriado móvel): hoje cancela-se aula por aula
- [ ] Aviso de "versão nova disponível" do service worker

### Testes
- [x] Vitest: regras novas (alunos, turmas, frequência, equipe com tentativas de escalada, unidades, financeiro do mês, planilha, lembrete, limite do mês, encaixe a partir do crédito) e dados da demonstração versão 2
- [x] Playwright nos dois motores: alunos, turmas, reposição, financeiro (inclusive o CSV baixado), equipe e papéis, auditoria de alvos de 48 px e texto de 16 px em todas as telas de gestão e folhas, fluidez das transições novas (abrir ficha, voltar, seção, folha de encaixe, escolher aula, troca de mês)

## Etapa 3: Firebase, papéis, acesso do aluno e página pública (feita)

### Firebase
- [x] Configuração do projeto num arquivo só (`src/config/firebase.ts`), lida no build de variáveis `VITE_FIREBASE_*` (no GitHub Actions, variáveis do repositório `FIREBASE_*`); sem elas, o site é só demonstração. Sem Analytics
- [x] Duas portas quando há projeto: **Entrar** (estúdio de verdade) e **Ver demonstração**; a escolha fica no aparelho (`src/app/modo.ts`); `?demo` leva direto à demonstração
- [x] SDK modular carregado sob demanda (`import()` em `src/app/conta.ts`), num pedaço `firebase-*.js` fora do pacote inicial e do cache do service worker; Firestore "lite" (REST), sem o iframe de login do Google
- [x] Emuladores só em `localhost` e com `?emulador=1` (ou `?emulador=demo-outro`, um projeto de teste vazio); portas em `firebase.json`; inerte no site publicado
- [x] Login por e-mail e senha com mensagens genéricas, senha nova, confirmação do e-mail antes de qualquer acesso (`src/dados/firebase/autenticacao.ts`)
- [x] Adaptador da equipe com o mesmo contrato da demonstração (`repositorioDaEquipe.ts`): transação por ação, registro da aula relido e mesclado aluno por aluno, cadastros só nos campos alterados, alunos fixos com `arrayUnion`/`arrayRemove`, vagas recalculadas com o registro fresco
- [x] Política de segurança amplia `connect-src` só para login, token e Firestore, e só com projeto configurado
- [x] `?agora=` e `?atraso=` só no modo demonstração

### Papéis e posse
- [x] Posse em `estudio/posse`, criada no primeiro acesso (trava no e-mail combinado nas regras) e mudada só pela passagem da conta
- [x] Convites em `convites/{e-mail}`; o papel só vale com o e-mail confirmado e igual ao do convite (`acessos/{uid}` liga a conta à pessoa)
- [x] Titular gravado como administrador na equipe; quem é titular diz a posse
- [x] Convite da equipe e do aluno com a mensagem pronta para o WhatsApp (o plano gratuito não manda e-mail)

### Regras do Firestore
- [x] `firestore.rules` com menor privilégio, esquema e tamanho em tudo, o resto negado; identidade calculada uma vez por pedido (o teto de 1000 expressões estourava com funções repetidas)
- [x] Financeiro em coleções só da administração; aluno lê só cópias sem nomes (`vagas`, `portal`) e os próprios créditos; página pública lê só `publico/estudio`
- [x] Aluno avisa a própria falta e encaixa a própria reposição: transação no cliente e as regras conferindo prazo (relógio do servidor), capacidade e a ligação entre registro, crédito e vaga
- [x] 174 testes no emulador (`npm run regras`), cada papel contra cada coleção e as tentativas de escalada; job próprio no CI

### Aluno, página pública e LGPD
- [x] App do aluno (liga e desliga em Mais, Estúdio; liberado por aluno na ficha): próximas aulas, avisar falta (gera crédito), desfazer no prazo, escolher a reposição numa aula com vaga, desistir no prazo; igual na demonstração ("Explorar como aluno")
- [x] Página pública `experimental/` sem login: marca, fotos do espaço, horários com vaga, endereço e pedido pelo WhatsApp com a mensagem pronta; nada é gravado; na demonstração lê os dados do aparelho
- [x] Aviso de privacidade em `privacidade/`; exportar os dados de um aluno (JSON) e excluir o aluno com confirmação, na ficha
- [x] Service worker guarda cada página pelo próprio endereço (o app, a experimental e a de privacidade)

### Testes
- [x] Vitest: projeções, app do aluno, privacidade, aula experimental, conversão e mescla do Firestore, leitura REST
- [x] Playwright com o SDK de verdade contra os emuladores, nos dois motores (`EMULADOR=1`): responsável entra e vê o financeiro, professor não vê, aluno avisa e remarca, página pública lista vagas sem gravar, professor convidado cria a conta e confirma o e-mail, administração grava estúdio, acesso de aluno, convite, reposição, pagamento e exclusão, login errado e senha nova respondem igual, primeiro acesso num estúdio vazio (só o e-mail combinado reivindica)
- [x] Playwright na demonstração: app do aluno, página pública (inclusive a vaga aberta por um aviso), privacidade, exportar e excluir, liberar o app; auditoria de alvos e texto nas telas novas
- [x] Trava em todo teste de ponta a ponta: pedido para domínios do Google é cortado e reprova

### Ficou para depois
- [ ] Publicar as regras no projeto real e fazer o primeiro acesso (passo a passo em [firebase.md](firebase.md)); conferir no primeiro acesso real que o console do navegador não mostra erro de política de segurança
- [ ] Preencher as variáveis `FIREBASE_*` do repositório no GitHub (sem elas, o site publicado fica só com a demonstração)
- [ ] Limite de reposições por mês também nas regras (hoje só o app confere)
- [ ] Aviso de "versão nova disponível" do service worker
- [ ] Cancelar o dia inteiro de uma vez (feriado móvel)
- [ ] Medir a View Transition num iPhone de verdade
- [ ] Deixar o caminho aberto para Gympass (Wellhub) e TotalPass, sem integrar agora (as formas de pagamento já existem)
- [ ] Aula experimental na agenda: a equipe confirma pelo WhatsApp, mas não tem onde pôr a pessoa na aula. Caminho sugerido: `RegistroAula.experimentais` (mapa de id para nome e telefone, só a equipe lê), participante com origem `experimental` em `montarAula` (ocupa vaga, entra na chamada, não gera crédito), "Marcar aula experimental" na folha da aula, vagas e página pública recalculadas com ela, esquema novo em `firestore.rules` com teste no emulador (professor e aluno não leem nome nem telefone) e "Virar aluno" levando nome e telefone para o cadastro
- [ ] Textos da página pública configuráveis em Mais, Estúdio (frase de apresentação e focos), em vez de fixos em `src/experimental/PaginaExperimental.tsx`; pede campos novos em `Configuracao` e em `publico/estudio`, com o esquema das regras

## Revisão de produto: o pedido do estúdio x o app (feita)

Comparação item por item com o que o estúdio pediu, usando o app como a administração e como um
professor num iPhone SE (375 x 667, uma mão), e contando os toques (`e2e/toques.spec.ts`).

### Atendido
- [x] Alunos cadastrados por unidade, com busca, ficha, pausa e arquivo
- [x] Agenda das aulas com os alunos dentro (turmas fixas de 2 ou 3 vezes por semana; a aula é derivada da turma)
- [x] Controle de presença por aula, frequência por aluno e por turma, destaque de quem anda faltando
- [x] Reposição: o aviso tira o aluno daquele dia e gera crédito; o encaixe é só em aula com vaga; central de reposição
- [x] Financeiro preenchido à mão: alunos ativos por unidade, formas de pagamento (Gympass e TotalPass incluídos), recebido x previsto, em aberto, últimos meses, planilha
- [x] Uso pelo celular, pela administração e pelos professores (PWA no iPhone e no Android)
- [x] Desejável: o aluno avisa a falta e escolhe a reposição sozinho; com o app do aluno desligado, a equipe faz por ele
- [x] Vários administradores, responsável pela conta e passagem da conta; textos sem pressupor uma pessoa só
- [x] Nada de treino, vídeo de aula, cronômetro, evolução corporal, conquistas ou onboarding de marketing (conferido no código)

### Parcial
- [ ] Página de aula experimental: mostra a agenda com vagas e manda o pedido pelo WhatsApp, mas não há como **registrar a aula experimental na agenda** (ocupar a vaga e aparecer na chamada) sem cadastrar a pessoa como aluno. Ver "Ficou para depois".
- [ ] Produto genérico de agendamento: a interface fala em estúdio, turma e aula, mas a página pública tem textos fixos deste estúdio (a frase "no centro de Campinas" e os três focos) e a marca d'água PILATES. Ver "Ficou para depois".
- [ ] Duas portas no site publicado: o código está pronto; faltam as variáveis `FIREBASE_*` no GitHub (o commit da configuração foi negado como credencial). Ver etapa 3.

### Corrigido nesta revisão
- [x] "Ativos" na lista de alunos mostrava também os pausados (39), enquanto o Financeiro dizia 37 ativos; agora são o mesmo número, e a busca sem resultado diz em que lista achou a pessoa
- [x] "Todos presentes" aparecia como ação principal às 10h na aula das 18h; a chamada agora abre meia hora antes (`ABERTURA_DA_CHAMADA_MIN` em `src/dominio/presenca.ts`); o aviso de falta continua livre, e o card do Hoje diz "Ver quem vem" até a chamada abrir
- [x] "Lançar pagamento" listava em ordem alfabética (quem já pagou no topo); agora quem deve o mês vem primeiro, com o valor: 4 toques
- [x] "Para olhar" levava para a lista inteira de alunos; agora cada aluno sumido aparece pelo nome e abre a ficha (até 3; mais que isso, uma linha só)
- [x] "Trocar de perfil" deixava quem entrava depois na aba Mais; agora começa no Hoje (equipe) ou em Minhas aulas (aluno)
- [x] A página pública só era achada em Mais, Estúdio; agora está na entrada da demonstração e em Mais, com compartilhar ou copiar o link
- [x] Página pública: atalho para os horários na capa (no iPhone SE eles ficavam abaixo das fotos), fim de cada aula também com várias unidades, "Primeira vez?" para quem nunca fez aula
- [x] Grade de turmas cortava "frequência 100%" em reticências no celular estreito
- [x] Domingo sem aula: o Hoje diz quando é a próxima
- [x] Aula que acabou com alguém sem marcação só aparecia na Agenda; agora o Hoje mostra "Chamada por fazer", a um toque
- [x] Teste de telefone com um fixo de cara real trocado por um de zeros

### Toques contados (iPhone SE, `e2e/toques.spec.ts`)
- [x] Chamada da turma inteira: 2 toques (3 com uma falta); limite pedido: 3
- [x] Achar um aluno: 3; limite 3
- [x] Lançar pagamento: 3 pela lista de em aberto, 4 pelo botão geral; limite 4
- [x] Encaixar reposição: 5 pela central ou pela chamada; limite 5
- [x] O aluno remarca a própria aula: 5
- [x] Visitante até o pedido no WhatsApp: 1 (sem escolher horário) a 3

## Revisão de segurança e privacidade (feita)

As regras foram atacadas no emulador como cada papel e como anônimo (`testes-de-regras/ataques.test.ts`),
o site foi conferido no navegador (política de segurança, console, cache, armazenamento) e cada
imagem versionada foi aberta e olhada.

### Achado e corrigido
- [x] O aluno desfazia o aviso de falta e ficava com o crédito: voltava para a aula e ainda repunha outra, até com o crédito já usado. Agora o crédito do aviso sai no mesmo lote (regra da vaga)
- [x] O aluno fixo se encaixava na própria turma, ocupando dois lugares com um crédito
- [x] Qualquer conta com e-mail confirmado lia `estudio/posse` (uid do titular e se o estúdio já tinha dono); agora só a equipe e o e-mail do primeiro acesso. Quem não tem convite cai direto em "Ainda não dá para entrar"
- [x] Um horário torto no documento público (o professor grava os horários, e as regras não conferem item por item) derrubava a página de aula experimental: sem horários e sem o botão do WhatsApp. A página agora confere cada horário e unidade
- [x] Excluir o aluno deixava `acessos/{uid}` com o e-mail dele; agora a administração acha e apaga o acesso de aluno (nunca o da equipe) na mesma gravação
- [x] O endereço de verdade do estúdio estava nos dados fictícios da demonstração, no teste e no passo a passo; trocado por um inventado (banco de demonstração versão 4) e a captura refeita
- [x] O aviso de privacidade não dizia que a sessão de login fica no celular nem que a conta de login também é apagada
- [x] Teste da administração no emulador dependia da hora: à noite o primeiro crédito da lista já não tinha aula com vaga

### Conferido sem defeito
- [x] Sem `innerHTML`/`dangerouslySetInnerHTML`; links para fora (WhatsApp, mapa) montados pelo app com `noopener`; telefone só com dígitos
- [x] Política de segurança sem `unsafe-inline` em script (dois scripts embutidos por hash); com projeto, `connect-src` só ganha login, token e Firestore; a política não libera `apis.google.com`, Analytics nem reCAPTCHA
- [x] Emulador inerte fora de `localhost` (código e política de segurança); `?agora=` e `?atraso=` só na demonstração
- [x] Console vazio entrando como responsável, professor e aluno; cache do service worker só com arquivos do site; no aparelho só o modo, a sessão de login (IndexedDB do SDK) e preferências
- [x] `npm audit --omit=dev`: 0 vulnerabilidades; dependências de produção: Preact, signals, Firebase e as duas fontes
- [x] Fotos do espaço (5, nos dois tamanhos) abertas uma a uma e as 22 capturas em folhas de contato: sem pessoas, sem metadados; a etiqueta da planta segue ilegível
- [x] Planilha CSV não deixa célula virar fórmula (`=`, `+`, `-`, `@`, tabulação)

### Ficou para depois
- [ ] App Check do Firebase: hoje qualquer pessoa lê o documento público, e a cota diária do plano gratuito pode ser gasta de propósito. Pede o script do reCAPTCHA na página e na política de segurança
- [ ] Margem do teto de 1000 expressões na regra do registro escrito pelo aluno (encaixe aguenta só mais 8 a 15 comparações). Dá para ganhar folga levando mais conferências para a regra da vaga ou simplificando `registroValido` para o caso do aluno
- [ ] A conta de login do aluno excluído continua no Firebase Authentication (apagar pelo console, passo em [firebase.md](firebase.md)); sem Cloud Functions não há como apagar pelo app
- [ ] Itens de listas gravadas pela equipe (horários públicos, alunos fixos, unidades, reposições) só têm o tamanho da lista conferido nas regras

## Notas para quem continuar

- **Rodar os testes de ponta a ponta no servidor ARM:** o WebKit não roda direto no Oracle Linux. Com o `npm run preview` no ar (porta 8887), rodar o contêiner do Playwright 1.60:
  `podman run --rm --network host -v "$PWD":/w:Z -w /w --ipc=host mcr.microsoft.com/playwright:v1.60.0-noble npx playwright test`.
  `LENTO=1` liga a CPU 4x mais lenta no Chromium; `GRAVAR=1` grava vídeo da fluidez (quadros com `ffmpeg -i video.webm -vf fps=10 quadro-%03d.png`).
- **WebKit do contêiner não tem GPU:** os tempos de quadro dele variam muito e servem de registro, não de régua (ver o comentário em `e2e/movimento.spec.ts`). Mesmo assim ele achou três problemas reais: sombra com desfoque cara demais, texto do dia sumindo no deslize e o aviso cobrindo a alça da folha.
- **Arrastar nos testes:** usar `arrastar()` de `e2e/apoio.ts`, que move um passo a cada 16 ms; o movimento instantâneo do Playwright vira "arremesso" e fecha a folha.
- **Nada de cor animada:** o teste de fluidez reprova qualquer animação ou transição que não seja de transform ou opacity.
- **Sombras:** cards usam a sombra sem desfoque (`--sombra-1`); desfoque grande só em elemento único (folha, aviso).
- **Conteúdo do repositório:** sem travessão, sem ponto médio, sem nomes reais, sem trechos de conversa com a cliente, sem fotos com pessoas. E-mails só `@example.com`, telefones `55119000000xx` (exemplos na tela usam `(19) 90000-0000`).
- **Papéis:** no código `titular`, `administrador` e `professor` (mais o aluno, fora da equipe); na tela "Responsável", "Administração" e "Professor". Toda regra de equipe recebe quem está agindo (`src/dominio/equipe.ts`); `firestore.rules` repete as mesmas recusas e `testes-de-regras/` testa cada uma no emulador.
- **Financeiro separado:** `FinanceiroDoAluno` (coleção `financeiroDosAlunos`) só é pedido por quem pode ver financeiro (`carregarFinanceiro` em `src/dados/estado.ts`); o teste com o emulador confere que o app do professor nem pede.
- **Teto de 1000 expressões nas regras do aluno:** a regra do registro que o aluno grava já anda perto do teto. Conferência nova do aluno vai na regra da vaga (`alunoMexeNaVaga`, folga larga), não em `encaixeValido`/`avisoValido`. Para medir, some `&& 1 == 1` repetido na função e rode o teste legítimo correspondente com o emulador no ar: o ponto em que ele passa a falhar é a folga (o motivo aparece em `firestore-debug.log` como "maximum of 1000 expressions"). Recusa por teto também aparece em casos negados de propósito; isso não muda o resultado, mas não prova a lógica.
- **Regras do Firestore:** calcule quem pede uma vez (`quemSou`) e passe adiante; funções que relêem o papel estouram o teto de 1000 expressões por pedido. Leia documento com `dados(caminho, padrao)` (um `get` que trata o documento ausente), não `exists` mais `get`: há teto de 10 leituras por operação e 20 por lote. Rode `npm run regras` (sobe o emulador sozinho) ou, com o emulador já no ar, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8824 npx vitest run --config vitest.regras.config.ts`.
- **Ponta a ponta com o Firebase:** com os emuladores no ar (`firebase emulators:start --only auth,firestore --project demo-pilates`) e a prévia rodando, `EMULADOR=1` faz o Playwright limpar os emuladores, criar as contas e gravar a demonstração de hoje (`e2e/firebase/preparar.ts`) e rodar `e2e/firebase.spec.ts`. Cada motor usa um aluno diferente (os dois podem rodar juntos no mesmo emulador) e um projeto vazio próprio para o primeiro acesso (`?emulador=demo-pilates-vazio-<motor>`). O emulador de login guarda todas as contas no projeto padrão (o SDK não manda o projeto no login); o Firestore separa os dados por projeto, por isso `singleProjectMode` fica desligado em `firebase.json`. No Chromium, `bypassCSP` deixa o app falar com o emulador; no WebKit a `<meta>` da política sai do HTML servido no teste (servir a página pelo teste no Chromium faz o navegador bloquear o endereço local).
- **Trava do Firebase real:** importe `test` e `expect` de `e2e/base.ts`, nunca de `@playwright/test`: a trava corta e reprova qualquer pedido para domínios do Google.
- **Projeto configurado no build:** com as variáveis `FIREBASE_*`, a tela inicial vira as duas portas. Os testes da demonstração abrem com `?demo` (ver `abrirApp`) para valer com ou sem projeto.
- **Desfazer:** ações de cadastro passam por `gravarComDesfazer` com um inverso calculado na hora de desfazer (por exemplo, tirar da turma só o aluno colocado). No Firebase, alunos fixos com `arrayUnion`/`arrayRemove` para duas pessoas não apagarem a mudança uma da outra.
- **Dados da demonstração:** versão 3 (`VERSAO_DO_BANCO`): app do aluno e página pública ligados, seis alunos com acesso (Beatriz Barbosa, a-11, é a dos testes) e o endereço do Centro igual ao do estúdio. Quem tinha versão anterior no aparelho ganha dados novos ao abrir. As três semanas recentes são as mesmas da etapa 1 (os testes conhecem: sexta 9/10, 18h com Camila tem 5 de 6; Ana Almeida tem 4 ausências seguidas; outubro tem R$ 10.660,00 previstos e R$ 5.590,00 recebidos).
- **Telas em teste:** para esperar uma tela nova parar, `esperarParado(page, '.tela-quadro')`; `irPara(page, '#/rota')` abre pelo endereço; `irParaSecao` troca Alunos, Turmas e Reposições.
