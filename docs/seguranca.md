# Segurança

Como o app protege os dados do estúdio, o que foi testado e o que fica de fora. O banco é o
Firestore no plano gratuito, sem Cloud Functions: toda regra de acesso mora em
[`firestore.rules`](../firestore.rules) e é conferida pelo Google a cada leitura e gravação. A
tela só esconde o que o banco já nega.

## Quem é quem

| Papel | Como ganha o papel | O que vê | O que grava |
|---|---|---|---|
| Responsável (titular) | primeiro acesso, com o e-mail travado nas regras; ou recebendo a conta do titular anterior | tudo | tudo; só ele convida, promove e tira administradores e passa a conta |
| Administração | convite do titular | tudo, financeiro incluído | cadastros, agenda, financeiro, convites de professores e alunos |
| Professor | convite da administração | agenda, turmas, alunos (sem valores), créditos, vagas | presença, aviso e reposição nas unidades em que dá aula |
| Aluno | acesso liberado na ficha, com o app do aluno ligado | o próprio portal, os próprios créditos e as vagas (sem nomes) | o próprio aviso de falta e a própria reposição, no prazo e com vaga |
| Qualquer pessoa | nada | o documento público (horários com vaga, unidades, WhatsApp) | nada |

### Como o papel é conferido

Para cada pedido, as regras calculam uma vez quem está pedindo (`quemSou`):

1. A conta precisa ter o **e-mail confirmado** (`email_verified`).
2. O documento `acessos/{uid}` liga a conta a uma pessoa. Só a própria conta cria o seu, e só a
   partir de um convite em `convites/{e-mail}` para o e-mail dela (ou no primeiro acesso).
3. O papel vem do cadastro dessa pessoa: na equipe, o cadastro precisa ter o mesmo `uid`, estar
   ativo e ter o mesmo e-mail do login; o aluno precisa ter o acesso liberado, não estar arquivado,
   o e-mail igual e o app do aluno ligado nas configurações.

Desativar alguém, tirar o acesso de um aluno ou desligar o app do aluno corta o papel na hora,
sem depender do aparelho da pessoa. O papel nunca é lido do aparelho.

### Posse do estúdio

`estudio/posse` diz quem é o titular. É criado uma vez, junto com o cadastro e o acesso de quem
reivindica, e só pelo e-mail definido em `emailDoPrimeiroAcesso()` (trocado antes de publicar: ver
[firebase.md](firebase.md)). Depois, só o titular atual muda, e só para alguém da administração,
ativo, que já entrou com o e-mail confirmado. Ninguém apaga a posse.

## Tentativas de escalada testadas

`npm run regras` roda 174 testes no emulador, cada papel contra cada coleção, permitindo e negando.
Entre eles:

- professor lendo `pagamentos` ou `financeiroDosAlunos`; professor marcando presença em outra
  unidade, cancelando aula ou dando crédito de cortesia;
- aluno lendo o cadastro de outro aluno (ou o próprio, que tem a observação da equipe), o portal ou
  os créditos de outro, turmas e registros (que têm nomes);
- aluno avisando a falta de outro, fora do prazo, numa turma que não é dele, sem abrir a vaga,
  com crédito de validade maior, ou criando crédito sem avisar;
- aluno se colocando em aula cheia, usando crédito de outro, vencido ou já usado, ocupando dois
  lugares ou entrando sem gastar o crédito; aluno marcando presença em si mesmo;
- convite forjado: professor, aluno ou pessoa de fora criando convite ou cadastro; convite que não
  bate com o cadastro (outro e-mail, outro papel); cadastro já nascendo com `uid`;
- aceitar convite com e-mail não confirmado, com outro e-mail, ou mudando o próprio papel no aceite;
  trocar o próprio acesso para apontar para o titular;
- administrador convidando, promovendo ou desativando administrador; mexendo no cadastro do
  titular; titular se desativando;
- mudar o e-mail de quem já entrou (é ele que liga a conta ao papel);
- mexer na posse: apagar, reescrever, passar para professor, para convite pendente ou com `uid`
  trocado; reivindicar com outro e-mail ou sem e-mail confirmado;
- a conta com o e-mail da responsável, mas sem confirmar, não lê nem grava nada;
- coleção fora das regras: negada até para a administração.

## Dados separados por quem pode ler

O Firestore libera ou nega o documento inteiro, então o que um papel não pode ver mora em outro
documento:

- `financeiroDosAlunos` e `pagamentos`: só a administração. O app do professor nem pede esses dados.
- `alunos` (com a observação da equipe): só a equipe. O aluno lê `portal/{id}`, uma cópia com o
  primeiro nome, a unidade e as turmas fixas, sem colegas.
- `vagas/{aula}`: a aula de uma data só com lugares (capacidade, ocupados, cancelada), sem nomes.
- `publico/estudio`: o único documento sem login, com nome do estúdio, WhatsApp, unidades e os
  horários com vaga.

Essas cópias são gravadas pelo app da equipe na mesma transação de cada mudança e conferidas a
cada abertura (a janela de 14 dias anda sozinha).

## O que o aluno grava, e como o banco confere

Avisar a falta muda três documentos juntos: a marcação dele no registro da aula (por mescla, sem
ler os colegas), o crédito de reposição e a vaga (um lugar a menos). Encaixar a reposição: a
reposição dele no registro, o crédito marcado como usado e a vaga (um lugar a mais). O app faz isso
numa transação que lê a vaga e o crédito; se outro aluno pegar o último lugar no mesmo instante, a
transação refaz a conta e recusa. As regras conferem tudo de novo, do lado do servidor:

- só a chave do próprio aluno muda no registro;
- o prazo é medido pelo relógio do servidor (`request.time`) contra o início da aula no fuso de
  Campinas (UTC-3, sem horário de verão desde 2019);
- a vaga só sobe se não passar da capacidade, e só muda junto com o registro e o crédito
  (cada regra confere as outras pelo estado depois do lote, com `getAfter`).

## Esquema e tamanho

Toda gravação passa por validação de campos (`hasAll` e `hasOnly`), tipos, formatos (datas,
horas, e-mails em minúsculas, telefones só com dígitos) e tamanhos (nome até 80, observação até
500, listas e mapas com teto). O que não está nas regras é negado.

## Login

- E-mail e senha (mínimo de 8 caracteres), com confirmação do e-mail antes de qualquer acesso.
- Mensagens que não dizem se o e-mail tem conta ("E-mail ou senha não conferem", "Se houver uma
  conta com este e-mail, enviamos um link"), junto com a proteção contra enumeração do Firebase.
- O SDK do Firebase só é baixado quando a pessoa escolhe **Entrar**: fica num pedaço separado, fora
  do pacote inicial e fora do cache do service worker. Sem o "resolvedor" de popup, o SDK não
  carrega o iframe de login do Google.

## No navegador

- Política de segurança de conteúdo (CSP) em `<meta>` em todas as páginas: scripts só do próprio
  site (o único script embutido entra pelo hash), conexões só com o próprio site e, com projeto
  configurado, com os três endereços do Firebase (login, token e Firestore). Sem Google Analytics,
  sem fontes ou scripts de terceiros.
- Emuladores do Firebase só ligam em `localhost`/`127.0.0.1` e com `?emulador=1`; no site
  publicado o caminho nunca liga.
- `?agora=` (relógio de mentira) e `?atraso=` só existem no modo demonstração.
- A configuração do projeto não é segredo (vai para o navegador), mas fica fora do repositório,
  em variáveis do GitHub Actions.

## Testes

- `npm run regras`: regras do Firestore no emulador (174 testes).
- `EMULADOR=1 npx playwright test`: ponta a ponta com o SDK de verdade contra os emuladores, nos
  motores do Chrome e do Safari: a responsável entra e vê o financeiro, o professor entra e não
  vê, o aluno avisa a falta e remarca, a página pública lista as vagas sem gravar nada, e um
  professor convidado cria a conta, confirma o e-mail e entra.
- Todo teste de ponta a ponta tem uma trava que corta e reprova qualquer pedido para domínios do
  Google: o projeto real nunca é lido nem gravado por teste.

## O que fica de fora (conhecido)

- **Limite de reposições por mês:** conferido pelo app; as regras não contam créditos (contar
  pediria um contador a mais em cada gravação). Quem contornar o app ganha créditos a mais, todos
  ligados a faltas de verdade e visíveis para a administração.
- **Números das vagas e do portal** são cópias mantidas pela equipe. Se ninguém da equipe abrir o
  app por duas semanas, a janela do aluno e da página pública encolhe até alguém abrir de novo.
  As regras confiam na equipe para esses números (só o aluno é limitado a mais ou menos um).
- **Aviso fora do prazo marcado pela equipe** (sem crédito) não aparece para o aluno como "você
  avisou": o aluno só vê os próprios créditos, não o registro da aula.
- **Convites não mandam e-mail:** sem Cloud Functions, a pessoa é avisada pelo WhatsApp e cria a
  conta com o e-mail do convite.
- **Exclusão de aluno:** apaga cadastro, mensalidade, acesso, créditos e as marcações futuras;
  presenças antigas e pagamentos ficam só com o código do aluno (o caixa precisa fechar). A conta
  de login do aluno, se existir, continua no Firebase Authentication sem papel nenhum; apagar a
  conta é pelo console.
