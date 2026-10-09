# Ligar o app ao Firebase do estúdio

Passo a passo para quem cuida da conta Google do projeto. Tudo cabe no plano gratuito (Spark):
sem Cloud Functions, sem cartão de crédito.

Enquanto nada disso estiver feito, o site funciona em **modo demonstração** (dados fictícios no
aparelho). Depois de configurado, a tela inicial mostra duas portas: **Entrar** (o estúdio de
verdade) e **Ver demonstração**.

## 1. O projeto

1. No [console do Firebase](https://console.firebase.google.com), crie o projeto (plano Spark).
   O Google Analytics não é usado pelo app: pode deixar desligado. Se ele foi ligado sem querer,
   o app continua sem carregar nada dele (não há `measurementId` na configuração nem na política
   de segurança do site); para desligar de vez: Configurações do projeto, Integrações, Google
   Analytics, Desvincular.
2. **Não fique refém de uma conta só.** Em Configurações do projeto, Usuários e permissões,
   adicione as outras pessoas da administração como membros do projeto (papel Proprietário ou
   Editor). Assim, se alguém perder o acesso à conta Google, outra pessoa ainda consegue entrar no
   console, publicar regras e baixar os dados.

## 2. Login por e-mail e senha

1. Authentication, Método de login: ative **E-mail/senha** (o "link por e-mail" fica desligado).
2. Authentication, Configurações:
   - **Domínios autorizados:** acrescente `kohijow.github.io` (o site publicado).
   - **Proteção contra enumeração de e-mail:** deixe ligada (é o padrão em projetos novos). O app já
     mostra mensagens que não dizem se um e-mail tem conta.
   - **Ações do usuário:** "Ativar a criação" fica ligada: quem é convidado cria a própria conta.
     Quem não tem convite até cria uma conta, mas não vê nada (as regras do banco negam).
   - **Política de senha:** comprimento mínimo **8** e "Exigir". O app já pede 8 ao criar a conta,
     mas a tela de senha nova do Firebase aceita 6 sem essa política.
   - **reCAPTCHA (proteção de e-mail e senha):** deixe desligado. Se for ligar, a política de
     segurança do site (`scripts/plugin-offline.ts`) precisa liberar o script do reCAPTCHA, senão o
     login para de funcionar.
3. Authentication, Modelos: escolha o idioma **português** para os e-mails de confirmação e de
   senha nova.

## 3. O banco (Firestore)

1. Firestore Database, Criar banco de dados, **modo de produção**, local `southamerica-east1`
   (São Paulo).
2. Nada de criar coleções à mão: o primeiro acesso e o próprio app criam o que precisa.

## 4. As regras do banco (antes de qualquer acesso)

O arquivo [`firestore.rules`](../firestore.rules) tem todas as regras. Antes de publicar:

1. Abra o arquivo e troque o e-mail de `emailDoPrimeiroAcesso()` (hoje
   `responsavel@example.com`) pelo e-mail de **quem vai fazer o primeiro acesso**. Essa trava
   impede que outra pessoa crie uma conta antes e reivindique o estúdio.
2. No console: Firestore Database, Regras. Apague o que estiver lá, cole o conteúdo do arquivo
   (com o e-mail trocado) e toque em **Publicar**.
3. Opcional: no "Playground de regras" do console, simule uma leitura de `pagamentos/qualquer`
   sem login. Tem que dar **negado**.

As mesmas regras rodam nos testes automáticos (`npm run regras`, no emulador); quem mexer nelas
deve rodar os testes antes de publicar de novo.

## 5. A configuração do app

1. Configurações do projeto, Seus apps: se ainda não houver, adicione um app **Web**. Copie os
   seis valores do `firebaseConfig` (`apiKey`, `authDomain`, `projectId`, `storageBucket`,
   `messagingSenderId`, `appId`). O `measurementId`, se aparecer, não é usado.
2. Esses valores não são segredo (vão para o navegador de quem abre o site), mas ficam fora do
   repositório, em variáveis do GitHub:
   GitHub, repositório, Settings, Secrets and variables, Actions, aba **Variables**, crie:
   `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`,
   `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`.
   A próxima publicação (qualquer push na `main`, ou "Run workflow" no Actions) já sai com as duas
   portas. O arquivo que lê tudo isso é [`src/config/firebase.ts`](../src/config/firebase.ts).
3. Para rodar no computador com o projeto de verdade, copie `.env.exemplo` para
   `.env.production.local` (não vai para o repositório) e preencha.
4. Recomendado: no Google Cloud Console, APIs e serviços, Credenciais, abra a chave do navegador e
   restrinja a **sites** `https://kohijow.github.io/*` e a **APIs** Identity Toolkit, Token Service
   e Cloud Firestore.

## 6. O primeiro acesso (define quem é a Responsável)

**Leia antes de entrar:** a primeira conta que entra num estúdio sem dono vira **Responsável**
(titular) pela conta: é quem convida, promove e tira pessoas da administração e quem pode passar
a conta para outra pessoa. Só o e-mail colocado nas regras (passo 4) consegue fazer isso. Se o
projeto foi criado por outra pessoa da família, tudo bem: quem faz o primeiro acesso pode ser o
dono da conta Google, e ele convida a proprietária do estúdio para a administração (ou passa a
conta para ela depois).

1. Abra o site, toque em **Entrar** e depois em **Primeiro acesso? Criar conta**.
2. Use o e-mail das regras e uma senha com pelo menos 8 caracteres.
3. Abra o e-mail de confirmação (olhe o spam), toque no link e volte ao app: **Já confirmei**.
4. O app pergunta seu nome, WhatsApp e o nome do estúdio. Toque em **Começar**.

## 7. Depois do primeiro acesso

Em **Mais**:

1. **Estúdio:** WhatsApp, e se o **app do aluno** e a **página de aula experimental** ficam ligados.
2. **Unidades** (com o endereço: é ele que aparece na página de aula experimental, por exemplo
   "Rua Exemplo, 100, sala 2, Centro"), depois **Alunos** (com e-mail para
   quem vai usar o app) e **Turmas**.
3. **Equipe:** convide a administração e os professores pelo e-mail de cada um. O app não manda
   e-mail de convite (isso pediria Cloud Functions): avise a pessoa pelo WhatsApp para entrar no
   site, tocar em **Primeiro acesso? Criar conta** com aquele e-mail e confirmar o e-mail. O papel
   só vale com o e-mail confirmado e igual ao do convite.
4. **Alunos:** na ficha, **Liberar o app** e **Mandar o convite pelo WhatsApp** (a mensagem já vem
   pronta, com o endereço e o e-mail).
5. **Passar a conta:** Equipe, a pessoa, **Passar a conta**. Ela precisa ser da administração e já
   ter entrado com o e-mail confirmado.
6. **Pedido de exclusão (LGPD):** na ficha do aluno, **Excluir o cadastro** apaga o cadastro e o
   que liga a conta dele ao estúdio. Se ele tinha conta no app, apague também a conta de login: no
   console, Authentication, Usuários, procure o e-mail e exclua.

A página pública fica em `https://kohijow.github.io/pilates-central-web/experimental/`. Ela só
lê um documento com horários e vagas (sem nomes), que o app da equipe atualiza sozinho a cada
abertura e a cada mudança na agenda.

## 8. Limites do plano gratuito

O Spark permite por dia 50 mil leituras e 20 mil gravações no Firestore. Abrir o app da equipe lê
o cadastro (alunos, turmas, equipe), as aulas de seis semanas e os créditos: algumas centenas de
leituras num estúdio pequeno. Marcar uma presença grava um ou dois documentos. Folga de sobra.

## Testar sem o projeto de verdade (emuladores)

Nada de teste usa o projeto real. Com Java 21 e o firebase-tools instalados:

```bash
npm run regras            # regras do Firestore contra o emulador (projeto demo-pilates)

# ponta a ponta com o SDK de verdade, nos dois motores
npm run build
npx vite preview --port 8887 &
firebase emulators:exec --only auth,firestore --project demo-pilates \
  "EMULADOR=1 npx playwright test"
```

O app só liga os emuladores em `localhost`/`127.0.0.1` e com `?emulador=1` no endereço (portas em
[`firebase.json`](../firebase.json)); `?emulador=demo-qualquer-coisa` usa outro projeto de teste,
vazio, para ver o primeiro acesso do zero. No site publicado esse caminho nunca liga. Os testes
ainda têm uma trava: qualquer pedido para domínios do Google é cortado e reprova o teste.
