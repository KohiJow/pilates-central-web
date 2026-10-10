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
- [x] Aviso de "versão nova disponível": a versão nova fica esperando e o app avisa "Tem uma versão nova do app", com "Atualizar" (feito na revisão de login e segurança)

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
- [x] Aviso de "versão nova disponível" do service worker (revisão de login e segurança)

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
- [x] Aviso de "versão nova disponível" do service worker (revisão de login e segurança)
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
- [x] App Check do Firebase (feito na revisão de login e segurança, abaixo; ligar e impor é ação do dono no console)
- [x] Margem do teto de 1000 expressões na regra do registro escrito pelo aluno (idem: medido de 51 a 110 comparações a mais conforme o caminho, e o teste prova pelo menos 40 em todos)
- [ ] A conta de login do aluno excluído continua no Firebase Authentication (apagar pelo console, passo em [firebase.md](firebase.md)); sem Cloud Functions não há como apagar pelo app
- [x] Itens de listas gravadas pela equipe (horários públicos, alunos fixos, unidades, reposições) conferidos item a item (idem)

## Revisão no celular e de movimento (feita)

Passeio por 59 passos (entrada, folhas, chamada, agenda com faixa e dedo, alunos, turmas,
reposição, financeiro, ajustes, tema, esqueleto, app do aluno e página pública) em quatro
perfis: WebKit com iPhone 13 (390 x 664) e com o iPhone SE do Playwright (320 x 568, a menor tela),
Chromium com Pixel 7 e com a CPU 4x mais lenta. A agenda e os campos também a 375 px (iPhone SE de
segunda e terceira geração), nos testes.
Cada perfil gravado em vídeo, quadros a 10 por segundo olhados em folhas de contato; em cada passo,
intervalos de `requestAnimationFrame`, deslocamento de layout (CLS) e tarefas longas; nos gestos,
a posição da peça quadro a quadro contra a do dedo (com toque de verdade no Chromium, pelo CDP).

### Achado e corrigido
- [x] **Fontes baixavam duas vezes no iPhone** (59 kB a mais na primeira visita): o WebKit busca a fonte do CSS sem CORS e a pré-carga pedia com CORS. A pré-carga agora é montada conforme o motor (`preCargaDasFontes` em `scripts/plugin-offline.ts`); o aviso "preloaded but not used" sumiu do console do WebKit
- [x] **Teclado cobria o campo e o botão nas folhas** (lançar pagamento, busca do encaixe, senha nova): a folha acompanha a `visualViewport`, sobe até a borda do teclado por transform, encolhe e rola até o campo (`src/movimento/teclado.ts`, `FolhaInferior`)
- [x] **A folha trocava de conteúdo enquanto descia**: na entrada aparecia a equipe inteira no lugar dos professores, e no encaixe um "sem vaga" no lugar da aula marcada. A folha guarda o que mostrava aberta e fica inerte até sumir
- [x] **O aviso saltava** do alto para cima das abas quando a folha fechava, por cima dela; agora entra de novo no lugar novo
- [x] **Soltar o dedo dava tranco**: a folha arremessada partia do repouso e chegava a 3,7 px/ms com o dedo a 1 px/ms; a lista do dia, depois de um arraste longo, voltava uns pixels antes de sumir. As duas saem na velocidade do gesto (`curvaQueContinua` em `src/movimento/animar.ts`) e a lista sempre para a frente
- [x] **A faixa de dias descia 34 px sob o dedo no iPhone**: com o "Hoje" ao lado, o título dos outros dias quebrava em duas linhas (medido em 375 e 390 px nos dois motores). O "Hoje" foi para a linha do mês e o título ficou numa linha, com o tamanho ajustado à tela (medido nos 43 dias em 320 a 412 px: cabeçalho sempre da mesma altura)
- [x] Nome do estúdio cortado ("Pilates ...") a 360 px e menos: o selo de demonstração ficou mais estreito; cabe inteiro a partir de 360 px (a 320 px segue com reticências, "Pilates Ce...")
- [x] Contraste medido na tela: o "dom" e os outros dias sem aula da faixa ficavam em 4,2:1 no tema claro (cor secundária com opacidade em 13 px)
- [x] Abrir sem internet nunca tinha sido testado no WebKit (o teste era pulado); agora é, com o servidor desligado de verdade
- [x] No modo escuro automático, a barra do sistema (`theme-color`) ficava clara até o app carregar; o script do cabeçalho já a pinta escura antes da primeira pintura
- [x] Teste do aluno no emulador falhava no horário da aula dele (relógio de verdade)

### Conferido e certo
- [x] JS inicial da demonstração: 80 kB comprimidos (limite 170) e o Firebase não é baixado (teste em `e2e/celular.spec.ts`); fotos de 11 a 62 kB em webp
- [x] Manifesto, ícone do iPhone de 180 px sem transparência, `viewport-fit=cover` com as margens seguras no topo, nas abas, na folha e nos avisos, `100dvh`, campos de 16 px (sem zoom ao focar), rolagem da folha e da faixa sem vazar
- [x] CLS zero em todos os passos nos dois perfis do Chromium (o teste de fluidez agora reprova qualquer deslocamento sem toque)
- [x] Chromium: p95 de 16,7 a 16,8 ms em todos os 59 passos; com a CPU 4x, também 16,7 a 16,8 ms, com tarefas longas de 50 a 130 ms ao montar telas novas (a maior: a lista de alunos) e de 237 ms na carga da página
- [x] Folha e lista seguem o dedo: erro médio de 3 px no arraste lento da folha e de 9 px no deslize do dia (um passo do dedo, medido no quadro seguinte)
- [x] Foco visível em todos os controles percorridos com Tab nas 15 telas da medição de contraste; folhas com `role="dialog"`, título, foco preso e o resto inerte; faixa de dias com rótulo por dia e o dia escolhido marcado
- [x] "Reduzir movimento" desliga deslocamentos (teste existente)

### Ficou para depois
- [ ] Conferir num iPhone de verdade: o teclado nas folhas (aqui a `visualViewport` foi simulada nos dois motores), a barra de status com `apple-mobile-web-app-status-bar-style: default` no tema escuro, e a View Transition no Safari
- [ ] No WebKit do contêiner (sem GPU) a primeira folha da sessão leva de 0,7 a 2 s para subir e há quadros de 1 a 2 s em seguida; a mesma folha animando sozinha mediu p95 de 20 ms ali. Não reproduz no Chromium; vale medir num iPhone antes de mexer
- [ ] Tela de abertura do app instalado no iPhone (`apple-touch-startup-image`): sem ela o iOS mostra uma tela lisa até carregar
- [ ] Tarefas longas de 80 a 130 ms ao montar Alunos, Financeiro e a ficha com a CPU 4x: dá para montar a lista em partes se aparecer em aparelho fraco
- [ ] A marca das seções (Alunos, Turmas, Reposições) não desliza de uma para outra: a tela inteira é trocada e entra deslizando, com a marca já no lugar

## Revisão de login e segurança (feita)

O primeiro acesso de verdade falhou sem explicação: o projeto existia, mas o Authentication nunca
tinha sido iniciado no console, e o app só dizia que não deu para criar a conta (nenhum e-mail
chegou). Esta revisão fez o login explicar o que aconteceu e fechou o que a revisão de segurança
tinha deixado para depois. Tudo testado nos emuladores e com respostas simuladas; o projeto real
não foi tocado.

### Login e primeiro acesso
- [x] Cada código do Firebase vira uma frase em português (`src/dados/firebase/erros.ts`): Authentication não iniciado ou e-mail/senha desligado ("O login por e-mail e senha ainda não foi ativado no Firebase deste projeto..."), sem rede, tentativas demais, domínio não autorizado, chave de API restrita, e-mail inválido, senha fraca, cota de e-mails do dia, App Check, sessão antiga. A frase nunca mostra o código; "Detalhes" mostra o código bruto para quem configura o projeto. "E-mail já usado" responde igual à recusa genérica, com ou sem a proteção contra enumeração ligada
- [x] Confirmação do e-mail: o endereço na tela, aviso de spam e promoções, "Reenviar" com espera de 60 s e contagem, "Já confirmei" recarrega a conta e o token antes de dizer que não confirmou; se a conta sair mas o primeiro e-mail falhar, a tela diz o motivo mapeado e deixa reenviar
- [x] "Esqueci a senha" diz para qual e-mail foi e o que fazer com o link; trocar a senha em Mais, Conta (pede a atual, "A senha atual não confere" quando erra); sair; força da senha enquanto digita (mínimo 8, sem exigir símbolo, `src/dominio/senha.ts`); "Lembrar neste aparelho" (desligado, a sessão fica só na aba)
- [x] `docs/firebase.md`: "Authentication, Começar" em primeiro lugar, com o sintoma de quando falta; lista de verificação final do console; App Check passo a passo; chave de API restrita por site e por API
- [x] Testes: `erros.test.ts` e `senha.test.ts` (Vitest); `e2e/login.spec.ts` nos dois motores: CONFIGURATION_NOT_FOUND, OPERATION_NOT_ALLOWED, tentativas demais, credencial inválida, e-mail inválido, rede cortada, senha fraca e e-mail já usado simulados com `route.fulfill` (sem emulador); com os emuladores, confirmação com envio falhando, reenvio, contagem (relógio controlado) e link do e-mail, senha nova pelo link e troca de senha pelo app, sessão fora do aparelho, cache do service worker sem nada do login nem do banco

### Segurança
- [x] App Check com reCAPTCHA v3 atrás de `VITE_FIREBASE_APPCHECK_SITE_KEY` (`src/dados/firebase/sdk.ts`, `src/experimental/firebaseAppCheck.ts`): sem chave, desligado; com os emuladores, desligado; em localhost com o projeto real, token de depuração. A política de segurança só libera o reCAPTCHA e a troca de token com a chave; a página pública manda o token no pedido REST. Ligar e impor é ação do dono (firebase.md, seção 7); nada foi ativado no projeto real
- [x] Regras: listas gravadas pela equipe conferidas item a item até o teto (`ids`, `datas`, `horariosPublicos`, `unidadesPublicasValidas`: a lista vira um texto e uma expressão regular confere tudo de uma vez). O documento público mudou de forma para isso: horário em texto (`'2026-10-13 18:00-18:50 u-centro 2'`) e unidades num mapa `id -> 'nome|endereco'`; a página confere cada item de novo ao ler. A vaga leva `comecaEm` (início da aula em ms, conferido contra data e hora) e as regras do aluno deixam de recalcular o instante; o registro escrito pelo aluno tem a sua validação enxuta (`registroDoAluno`) em vez da da equipe; medido com `MEDIR_FOLGA`, cada caminho do aluno aguenta de 51 (encaixar numa aula com registro de outra pessoa) a 110 (a vaga no aviso) comparações a mais, contra 8 a 15 antes, e `folga.test.ts` prova pelo menos 40 em todos
- [x] Furo aberto pela reestruturação e fechado: a regra do registro passou a ler o crédito só como fica depois do lote; um crédito que já apontasse para a aula serviria de novo sem ser tocado. A regra da vaga confere que o crédito estava livre antes (`creditoLivreAntes`), com teste em `ataques.test.ts`
- [x] Documento público: só os campos que a página mostra, com teto de tamanho em cada um; a página lê uma vez por sessão do navegador e revalida depois de 10 minutos (sessionStorage, nunca o service worker)
- [x] Cliente: `frame-src 'none'`; Trusted Types com política padrão (`src/app/confianca.ts`: HTML e script por texto recusados, script por endereço só o service worker e, com App Check, o reCAPTCHA; o endereço relativo do registro do service worker é resolvido contra a página antes de comparar, senão o registro era recusado no Chromium; conferido nos dois motores dos testes); `referrer` `strict-origin-when-cross-origin` nas três páginas; service worker com a versão nova esperando e o aviso "Tem uma versão nova do app" com "Atualizar" (`src/app/atualizacao.ts`); nada do Firestore nem do login no cache (testado)
- [x] LGPD: a exclusão também apaga a observação dos pagamentos do aluno (fica só o código, nos dois adaptadores); o aviso de privacidade diz o que fica depois da exclusão, a sessão fora do aparelho, o cache da página pública e o App Check. Registro de alterações (coleção `auditoria`: só códigos, só a administração lê, ninguém edita nem apaga): pagamento lançado ou apagado, cadastro excluído, acesso do aluno liberado ou tirado, papel mudado, acesso da equipe desligado ou religado, conta passada; tela em Mais, Registro de alterações; na demonstração fica no aparelho. Testes de regras para cada tentativa (assinar pelo outro, professor gravando, editar, apagar, ação fora da lista, campo a mais)
- [x] `npm audit --omit=dev`: 0 vulnerabilidades; nenhuma dependência nova (o App Check vem do pacote `firebase`)
- [x] `docs/seguranca.md` refeito: o que protege o quê, o que depende do console, o que foi testado como ataque

### Achado e corrigido no trabalho que veio pela metade
- [x] `FIREBASE_CONFIG` como nome da variável que troca o `firebase.json`: o próprio `firebase emulators:exec` define `FIREBASE_CONFIG` com um JSON, e os três arquivos de testes de regras nem abriam. Virou `FIREBASE_JSON`
- [x] O App Check era ligado também com os emuladores: no CI, assim que o dono criasse `FIREBASE_APPCHECK_SITE_KEY`, o reCAPTCHA pediria o Google e a trava dos testes reprovaria tudo
- [x] A política de Trusted Types recusava o registro do service worker no Chromium: o app registra `sw.js` por caminho relativo e a política só aceitava o endereço absoluto, então o registro falhava em silêncio e o app publicado não abriria sem internet (os seis testes de service worker caíam). A política resolve o endereço contra a página antes de comparar, com teste
- [x] Na primeira visita a página recarregava sozinha: o `controllerchange` disparado pela primeira instalação (o service worker reivindica a página) era tratado como "versão nova assumiu". Agora só recarrega se já havia um controlador ou se a pessoa tocou em Atualizar
- [x] O teste da versão nova trocava o `sw.js` por rota do Playwright, que não alcança a busca do script do service worker (nenhum dos dois motores): o teste sobe um servidor próprio de `dist/` que passa a entregar outra versão (`servidorDoDist` em `e2e/apoio.ts`, o mesmo do teste sem servidor)
- [x] No WebKit, pedido que passa pelo service worker também não é alcançado pela rota: os testes que simulam a resposta do Firebase rodam com o service worker bloqueado (`serviceWorkers: 'block'`), e só o teste do cache o liga
- [x] `trustedTypes.getPolicyNames()` não existe nos motores; o teste confere `defaultPolicy.name`. O teste de senha procurava "Professor Senha" no título do Hoje, que cumprimenta pelo primeiro nome

### Ficou para depois
- [ ] A conta de login do aluno excluído continua no Firebase Authentication (apagar pelo console); sem Cloud Functions não há como apagar pelo app
- [ ] Trusted Types: o Chromium e o WebKit do Playwright 1.60 aplicam (testado nos dois); conferir num iPhone de verdade se o Safari instalado também aplica (um motor antigo ignora a diretiva e o teste pula lá). O resto da política vale igual
- [ ] Depois de o dono ligar e impor o App Check: conferir no site publicado que o login e a página pública seguem funcionando e que o console do navegador não acusa a política de segurança

## Notas para quem continuar

- **Coisas de celular em `e2e/celular.spec.ts`:** teclado (a `visualViewport` é trocada por uma falsa que encolhe como a do iPhone; espere `.folha[data-teclado]` antes de medir), fontes uma vez só, JS inicial e Firebase fora, campos de 16 px, servidor desligado (o teste sobe um servidor só dele em `dist/`, então rode depois do build), agenda no iPhone SE, folha descendo com o mesmo conteúdo, aviso trocando de lugar e a lista do dia saindo para a frente.
- **Folhas:** o conteúdo mostrado enquanto a folha desce é o da última vez que ela estava aberta. Se precisar mudar algo na folha durante a saída, mude antes de fechar.
- **Soltar o dedo:** use `curvaQueContinua(velocidade, distancia, duracao)` em qualquer animação que começa no fim de um gesto; as curvas comuns começam paradas e dão tranco.
- **Contraste:** além dos pares de tokens (`contraste.test.ts`), `e2e/acessibilidade.spec.ts` mede cada texto visível contra o fundo composto nos dois temas. Opacidade em texto pequeno quase sempre reprova.

- **Rodar os testes de ponta a ponta onde o WebKit do Playwright não instala:** com o `npm run preview` no ar (porta 8887), rodar o contêiner do Playwright 1.60:
  `podman run --rm --network host -v "$PWD":/w:Z -w /w --ipc=host mcr.microsoft.com/playwright:v1.60.0-noble npx playwright test`.
  `LENTO=1` liga a CPU 4x mais lenta no Chromium; `GRAVAR=1` grava vídeo da fluidez (quadros com `ffmpeg -i video.webm -vf fps=10 quadro-%03d.png`).
- **WebKit do contêiner não tem GPU:** os tempos de quadro dele variam muito e servem de registro, não de régua (ver o comentário em `e2e/movimento.spec.ts`). Mesmo assim ele achou três problemas reais: sombra com desfoque cara demais, texto do dia sumindo no deslize e o aviso cobrindo a alça da folha.
- **Arrastar nos testes:** usar `arrastar()` de `e2e/apoio.ts`, que move um passo a cada 16 ms; o movimento instantâneo do Playwright vira "arremesso" e fecha a folha.
- **Nada de cor animada:** o teste de fluidez reprova qualquer animação ou transição que não seja de transform ou opacity.
- **Sombras:** cards usam a sombra sem desfoque (`--sombra-1`); desfoque grande só em elemento único (folha, aviso).
- **Conteúdo do repositório:** sem travessão, sem ponto médio, sem nomes reais, sem trechos de conversa com a cliente, sem fotos com pessoas. E-mails só `@example.com`, telefones `55119000000xx` (exemplos na tela usam `(19) 90000-0000`).
- **Papéis:** no código `titular`, `administrador` e `professor` (mais o aluno, fora da equipe); na tela "Responsável", "Administração" e "Professor". Toda regra de equipe recebe quem está agindo (`src/dominio/equipe.ts`); `firestore.rules` repete as mesmas recusas e `testes-de-regras/` testa cada uma no emulador.
- **Financeiro separado:** `FinanceiroDoAluno` (coleção `financeiroDosAlunos`) só é pedido por quem pode ver financeiro (`carregarFinanceiro` em `src/dados/estado.ts`); o teste com o emulador confere que o app do professor nem pede.
- **Teto de 1000 expressões nas regras do aluno:** `testes-de-regras/folga.test.ts` carrega as regras com comparações a mais enfiadas em cada função do caminho do aluno (aviso, desfazer, encaixe, desistência, vaga, crédito) e prova que o pedido legítimo ainda passa com 40 de sobra (medido: 51 a 110); `MEDIR_FOLGA=/tmp/folga.txt npx vitest run --config vitest.regras.config.ts testes-de-regras/folga.test.ts` (com o emulador no ar) escreve a folga exata de cada caminho. Conferência nova do aluno vai de preferência na regra da vaga (`alunoMexeNaVaga`, a mais folgada). Recusa por teto também aparece em casos negados de propósito; isso não muda o resultado, mas não prova a lógica.
- **Regras do Firestore:** calcule quem pede uma vez (`quemSou`) e passe adiante; funções que relêem o papel estouram o teto de 1000 expressões por pedido. Leia documento com `dados(caminho, padrao)` (um `get` que trata o documento ausente), não `exists` mais `get`: há teto de 10 leituras por operação e 20 por lote. Lista gravada pela equipe é conferida item a item com `join` mais uma expressão regular (`ids`, `datas`, `horariosPublicos`): uma expressão para a lista inteira, em vez de dezenas por item. Rode `npm run regras` (sobe o emulador sozinho) ou, com o emulador já no ar, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8824 npx vitest run --config vitest.regras.config.ts`. Mudou as regras? O dono republica no console (o site não publica regras).
- **Dois conjuntos de emuladores na mesma máquina:** copie `firebase.json` com outras portas e aponte `FIREBASE_JSON=outro.json` no build, nos testes de regras e nos de ponta a ponta, mais `--config outro.json` no firebase-tools (o nome `FIREBASE_CONFIG` não serve: o próprio `emulators:exec` o define com um JSON).
- **Erros do login:** toda falha do SDK passa por `erroDeConta(erro, operacao)` (`src/dados/firebase/erros.ts`); a frase nunca leva o código, que fica em `detalhe` e aparece atrás de "Detalhes" (`ErroDaConta`). Código novo do Firebase: acrescente em `fraseDoCodigo`, com teste em `erros.test.ts`. O caso "Authentication não iniciado" é testado sem emulador, com a resposta simulada em `e2e/login.spec.ts`.
- **App Check:** liga só com `VITE_FIREBASE_APPCHECK_SITE_KEY` no build e nunca com os emuladores (`ligarSdk` e `experimental/dados.ts`). Com a chave, a política de segurança e a política de Trusted Types liberam os endereços do reCAPTCHA (`regrasDaPolitica` em `scripts/plugin-offline.ts`, `enderecosDeScriptPermitidos` em `src/app/confianca.ts`); qualquer outro script por endereço precisa entrar nos dois lugares.
- **Versão nova do service worker:** a versão instalada fica esperando (`install` só chama `skipWaiting` quando não há outra ativa); `src/app/atualizacao.ts` avisa e, no "Atualizar", manda `{ tipo: 'ativar' }`; a página recarrega no `controllerchange`. Teste em `e2e/pwa.spec.ts`.
- **Registro de alterações:** `anotar()` em `src/dados/gestao.ts` junta a linha à gravação (e ao desfazer). Ação nova: `AcaoAuditada` em `tipos.ts`, a frase em `descreverAuditoria`, a lista em `auditoriaValida` nas regras. Só códigos: nunca nome, telefone nem e-mail.
- **Ponta a ponta com o Firebase:** com os emuladores no ar (`firebase emulators:start --only auth,firestore --project demo-pilates`) e a prévia rodando, `EMULADOR=1` faz o Playwright limpar os emuladores, criar as contas e gravar a demonstração de hoje (`e2e/firebase/preparar.ts`) e rodar `e2e/firebase.spec.ts`. Cada motor usa um aluno diferente (os dois podem rodar juntos no mesmo emulador) e um projeto vazio próprio para o primeiro acesso (`?emulador=demo-pilates-vazio-<motor>`). O emulador de login guarda todas as contas no projeto padrão (o SDK não manda o projeto no login); o Firestore separa os dados por projeto, por isso `singleProjectMode` fica desligado em `firebase.json`. No Chromium, `bypassCSP` deixa o app falar com o emulador; no WebKit a `<meta>` da política sai do HTML servido no teste (servir a página pelo teste no Chromium faz o navegador bloquear o endereço local).
- **Trava do Firebase real:** importe `test` e `expect` de `e2e/base.ts`, nunca de `@playwright/test`: a trava corta e reprova qualquer pedido para domínios do Google.
- **Projeto configurado no build:** com as variáveis `FIREBASE_*`, a tela inicial vira as duas portas. Os testes da demonstração abrem com `?demo` (ver `abrirApp`) para valer com ou sem projeto.
- **Desfazer:** ações de cadastro passam por `gravarComDesfazer` com um inverso calculado na hora de desfazer (por exemplo, tirar da turma só o aluno colocado). No Firebase, alunos fixos com `arrayUnion`/`arrayRemove` para duas pessoas não apagarem a mudança uma da outra.
- **Dados da demonstração:** versão 3 (`VERSAO_DO_BANCO`): app do aluno e página pública ligados, seis alunos com acesso (Beatriz Barbosa, a-11, é a dos testes) e o endereço do Centro igual ao do estúdio. Quem tinha versão anterior no aparelho ganha dados novos ao abrir. As três semanas recentes são as mesmas da etapa 1 (os testes conhecem: sexta 9/10, 18h com Camila tem 5 de 6; Ana Almeida tem 4 ausências seguidas; outubro tem R$ 10.660,00 previstos e R$ 5.590,00 recebidos).
- **Telas em teste:** para esperar uma tela nova parar, `esperarParado(page, '.tela-quadro')`; `irPara(page, '#/rota')` abre pelo endereço; `irParaSecao` troca Alunos, Turmas e Reposições.
