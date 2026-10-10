# Modelo de dados

Código em `src/dominio/` (tipos em `tipos.ts`). Nada ali sabe de onde vêm os dados: as mesmas
funções servem ao modo demonstração (dados no aparelho) e ao Firebase.

## Princípios

- **A aula é derivada, não gravada.** Uma turma recorrente ("toda segunda, 7h, Centro") gera as
  aulas de cada data. Só o que foge da regra é guardado, num `RegistroAula` por turma e data:
  presenças, faltas, avisos, reposições encaixadas e cancelamento. Semana sem exceção não ocupa
  espaço nenhum no banco.
- **Datas são texto no fuso do estúdio.** `'2026-10-09'` e `'07:00'`, sempre como em Campinas
  (`America/Sao_Paulo`). Tudo que depende de "agora" passa por `momentoDe(agora)` (`datas.ts`),
  então um celular com outro fuso não embaralha a agenda. Instantes de auditoria (`criadoEm`,
  `atualizadoEm`) são ISO 8601 com fuso.
- **Dinheiro em centavos** (`Centavos = number`), nunca em ponto flutuante.
- **Ids previsíveis onde isso evita duplicidade.** Registro de aula: `${turmaId}_${data}`.
  Crédito de reposição: `cr_${alunoId}_${turmaId}_${data}` (um aviso gera no máximo um crédito).
- **Regras devolvem resultado, não exceção.** `Resultado<T>` (`resultado.ts`) é
  `{ ok: true, valor }` ou `{ ok: false, codigo, mensagem }`. A mensagem é o texto que a pessoa
  lê na tela ("A aula está lotada.").
- **Tudo imutável.** As regras recebem o registro atual e devolvem as `Alteracoes` a gravar
  (registros e créditos novos ou alterados, créditos removidos). O repositório grava de uma vez.

## Entidades guardadas

| Entidade | Campos | Observações |
|---|---|---|
| `Unidade` | `id`, `nome`, `endereco`, `ativa` | O estúdio tem mais de uma unidade; alunos e turmas pertencem a uma. |
| `MembroEquipe` | `id`, `nome`, `papel` (`titular`, `administrador` ou `professor`), `email`, `telefone`, `unidades[]`, `ativo`, `convite?` | No Firebase o `id` será o uid do login. `convite` marca quem foi convidado e ainda não entrou. |
| `Aluno` | `id`, `nome`, `unidadeId`, `telefone`, `email`, `vezesPorSemana`, `situacao` (`ativo`, `pausado`, `inativo` = arquivado), `observacao`, `desde`, `acesso?` (`convidadoEm`, `porId`) | As turmas fixas do aluno são derivadas de `Turma.alunosFixos` (`turmasDoAluno`), para não haver duas fontes. A observação é texto livre visível só à equipe; não há ficha de saúde estruturada. `acesso` presente = app do aluno liberado. |
| `FinanceiroDoAluno` | `alunoId`, `unidadeId`, `valorMensal`, `formaPreferida`, `diaVencimento` | A parte do cadastro que o professor não lê. Fica separada porque no Firestore a regra libera ou nega o documento inteiro. |
| `Turma` | `id`, `unidadeId`, `diaDaSemana` (0 = domingo), `inicio`, `duracaoMin`, `capacidade`, `professorId`, `alunosFixos[]`, `fixosDesde`, `ativa`, `desde` | Uma turma por dia da semana: "seg/qua/sex às 7h" são três turmas. `fixosDesde` guarda desde quando cada aluno está na turma: quem entra hoje não aparece nas aulas que já passaram. |
| `RegistroAula` | `id`, `turmaId`, `unidadeId`, `data`, `marcacoes` (aluno para `presente`, `faltou` ou `avisou`), `reposicoes` (aluno para crédito usado), `experimentais?` (código para `Experimental`), `cancelamento?` (`motivo`: `feriado` ou `estudio`, `observacao`), `atualizadoEm` | As exceções de uma aula. Sem registro, a aula é a turma pura. |
| `Experimental` | `nome`, `telefone`, `alunoId?` | Quem vem fazer a aula experimental, registrado pela equipe na própria aula (só a equipe lê o registro). Ocupa um lugar e entra na chamada pelo código do registro; não gera crédito. Quando a pessoa vira aluno, `alunoId` aponta o cadastro que nasceu dali. No Firestore vai numa linha de texto (`'Nome|telefone'` ou `'Nome|telefone|alunoId'`), conferida de uma vez pelas regras, até 10 por aula. |
| `CreditoReposicao` | `id`, `alunoId`, `unidadeId`, `motivo` (`aviso`, `cancelamento`, `cortesia`), `origem` (turma e data da falta), `criadoEm`, `validoAte`, `usadoEm?` (turma e data da reposição) | Situação derivada: disponível, usado ou vencido (`situacaoDoCredito`). Só os de aviso contam para o limite do mês. |
| `Pagamento` | `id`, `alunoId`, `unidadeId`, `competencia` (`'2026-10'`), `valor`, `forma`, `pagoEm`, `observacao`, `registradoPorId` | Lançado à mão pela administração. Formas: Pix, cartão de crédito, cartão de débito, dinheiro, transferência, Gympass, TotalPass, outro. |
| `Configuracao` | `nomeEstudio`, `whatsapp`, `fraseCurta`, `focos[]` (até 3), `endereco`, `linkDoMapa`, `instagram`, `validadeCreditoDias`, `antecedenciaAvisoHoras`, `limiteReposicoesMes`, `alertaAusenciasSeguidas`, `capacidadePadrao`, `acessoDoAluno`, `paginaExperimental`, `validadeDoConviteDias` | Padrão em `configuracao.ts`: 30 dias de validade, 3 horas de antecedência, sem limite por mês, destaque a partir de 3 ausências seguidas, 5 lugares, app do aluno e página pública desligados, convite válido por 7 dias. Os textos do estúdio (frase, focos, endereço, mapa, Instagram) são o que a página pública mostra na capa e em "Onde fica"; nada de um estúdio em particular fica no código, e os tetos (`TAMANHOS`) são os mesmos das regras. |

## Visões derivadas (calculadas a cada leitura)

- **`Aula`** (`montarAula`, `aulasDoDia` em `agenda.ts`): a turma numa data, com horário de fim,
  participantes e lotação. Participantes: fixos ativos (na ordem da turma), depois reposições,
  depois quem vem experimentar (`origem: 'experimental'`, com nome e telefone no próprio
  participante); quem saiu da turma mas tem presença registrada naquela data continua aparecendo
  (histórico). Aluno pausado ou inativo não ocupa lugar.
- **Lugares ocupados** = fixos que não avisaram falta + reposições + experimentais. **Vagas** =
  capacidade menos ocupados (nunca negativo; aula cancelada não tem vaga).
- **Fase da aula** (`faseDaAula`): futura, agora ou encerrada, pelo relógio do estúdio.
- **Resumo do dia** (`resumo.ts`): alunos esperados, presentes, avisos, reposições, próximas
  aulas e a que está acontecendo.
- **Resumo do mês** (`pagamentos.ts`): previsto (mensalidade de quem está ativo no mês), recebido,
  em aberto (o que falta de cada aluno; pagamento a mais de um não cobre outro), por forma de
  pagamento, quem está atrasado (passou do dia de vencimento) e a planilha do mês.
- **Frequência** (`frequencia.ts`): por aluno ou por turma num período, contando só aula que já
  aconteceu ou que tem marcação; ausências seguidas desde a última presença.
- **Central de reposição** (`reposicao.ts`): créditos disponíveis, a vencer, vencidos e usados;
  aulas com vaga onde um crédito pode entrar nos próximos dias.

## Regras

### Presença (`presenca.ts`)

- Presente e falta só a partir do dia da aula (dá para marcar na porta, antes de começar).
- "Avisou" só enquanto a aula não terminou; depois disso é falta.
- Avisar com pelo menos `antecedenciaAvisoHoras` gera um crédito de reposição válido por
  `validadeCreditoDias` a partir da data da aula. Em cima da hora fica registrado, sem crédito;
  a administração pode dar o crédito mesmo assim (`concederCredito`, crédito de cortesia).
- Com `limiteReposicoesMes` maior que zero, quem já ganhou esse número de créditos por aviso no
  mês da aula avisa e fica sem crédito (`limiteAtingido`); a administração pode dar de cortesia.
- Tirar o "avisou" (o aluno acabou vindo) devolve o crédito, a não ser que ele já tenha sido
  usado: aí a regra recusa e pede para desfazer a reposição antes.
- Quem está repondo não "avisa" (não gera crédito sobre crédito): desfaz-se o encaixe.
- "Todos presentes" marca só quem está sem marcação; não mexe em quem avisou ou faltou.

### Aula experimental (`aulaExperimental.ts`)

- A equipe registra quem pediu a aula experimental (nome e WhatsApp) numa aula com vaga, de pé e
  que ainda não terminou; a mesma pessoa (pelo telefone) não entra duas vezes na mesma aula, e há
  um teto de 10 por aula. Pode ser pela folha da aula ou pelo Hoje (escolhendo a aula com vaga).
- Na chamada recebe presente ou faltou, nunca "avisou" (não há plano nem reposição por trás).
  "Tirar" sai da aula enquanto ela não terminou; depois disso fica no histórico. Não entra na
  frequência (que é do plano) nem no financeiro; entra nos "alunos esperados" do dia.
- As vagas, o app do aluno e a página pública contam o lugar ocupado, sem o nome.
- "Cadastrar como aluno" abre o cadastro com nome, WhatsApp e unidade já preenchidos; ao salvar,
  o registro da aula passa a apontar o aluno (`alunoId`), e a chamada leva para a ficha.

### Reposição (`reposicao.ts`)

Um crédito pode ser encaixado numa aula quando, nesta ordem:

1. ainda não foi usado;
2. a aula não está cancelada;
3. é da mesma unidade;
4. a data está dentro da validade e não é anterior ao aviso;
5. não é a própria aula da falta (para voltar a ela, desfaz-se o aviso);
6. a aula ainda não terminou;
7. o aluno ainda não está na aula;
8. há vaga.

`candidatosAReposicao` lista um crédito por aluno (o que vence primeiro) entre os que passam
em todas as regras. Desfazer o encaixe tira o aluno da aula e devolve o crédito.

### Cancelamento (`reposicao.ts`)

Cancelar (feriado ou imprevisto) devolve o crédito de quem estava repondo naquela aula e, se o
estúdio quiser, dá crédito aos fixos que não tinham avisado. Reabrir retira os créditos dados
pelo cancelamento que ninguém usou; se algum já foi usado, recusa.

### Desfazer (`src/dados/desfazer.ts`)

Toda ação da tela devolve uma função de desfazer. Ela reverte só o que a ação mudou (o aluno
marcado, o crédito criado), preservando o que outra ação ou outra pessoa mudou na mesma aula
depois.

### Alunos e turmas (`alunos.ts`, `turmas.ts`)

- Cadastro com nome e sobrenome, telefone com DDD (vira só dígitos com 55), e-mail opcional,
  unidade, plano (vezes por semana) e data de início. Telefone repetido avisa sem impedir.
- Pausar guarda o lugar nas turmas (o aluno some das aulas e a vaga fica para reposição);
  arquivar tira das turmas. Os dois recusam se houver reposição marcada daqui para a frente.
- Na turma entram alunos ativos ou pausados da mesma unidade, sem passar da capacidade (o
  pausado conta como lugar reservado) e sem outra turma no mesmo horário. A capacidade não fica
  abaixo dos fixos. O mesmo professor não dá duas turmas que se cruzam.
- Dia da semana e unidade de uma turma não mudam: para mudar o dia, cria-se outra e encerra-se
  esta (as aulas que já aconteceram continuam com o histórico certo).
- `conferirPlano` avisa quando o plano (2x, 3x) não bate com o número de turmas fixas.

### Equipe (`equipe.ts`)

- A administração convida professores; só o titular convida, promove ou rebaixa administradores
  e desativa administrador. Ninguém rebaixa, desativa ou edita o titular, e ninguém se desativa.
- A conta só passa para um administrador ativo que já entrou no app; quem era titular vira
  administrador. O professor edita o próprio contato, mas não as próprias unidades.
- Convite pendente (`convite` no cadastro) vale por `validadeDoConviteDias` a partir de
  `enviadoEm` (`convites.ts`): a lista da equipe mostra a data e o prazo. A administração revoga
  (a pessoa fica sem acesso; no Firebase o convite do e-mail some) ou manda de novo (o prazo
  recomeça); nos convites para a administração, só o titular. A mensagem pronta (WhatsApp ou
  "copiar o convite") leva o link de entrada (`?entrar`, nada pessoal na URL) e o e-mail no texto.

### Permissões (`permissoes.ts`)

| Ação | Titular | Administrador | Professor |
|---|:-:|:-:|:-:|
| Ver agenda e turmas, marcar presença, encaixar reposição, ver alunos (sem valores) | sim | sim | sim |
| Ver todas as unidades, dar crédito fora do prazo, cancelar aula | sim | sim | não |
| Editar alunos, turmas, unidades e configuração | sim | sim | não |
| Ver financeiro, lançar pagamento | sim | sim | não |
| Convidar e editar professores | sim | sim | não |
| Convidar, promover e tirar administradores; passar a conta adiante | sim | não | não |

A interface consulta essa tabela e as regras do Firestore repetem a mesma (com o aluno como papel a mais, fora da equipe).

## Cópias para quem não pode ler tudo (`projecoes.ts`)

O aluno e a página pública não leem turmas, registros nem cadastros (têm nomes). Leem cópias
calculadas das mesmas regras da agenda e gravadas pela equipe na mesma transação de cada mudança:

| Cópia | Conteúdo | Quem lê |
|---|---|---|
| `VagaDaAula` | turma, unidade, data, início, fim, capacidade, ocupadas, cancelada | equipe e aluno |
| `PortalDoAluno` | primeiro nome, unidade e turmas fixas (dia, horário, desde quando) | o próprio aluno |
| `PaginaPublica` | nome do estúdio, WhatsApp, os textos do estúdio (frase, focos, endereço, link do mapa, Instagram), unidades abertas, se a aula experimental está ligada e os horários com vaga dos próximos 14 dias | qualquer pessoa |

A janela das vagas é de hoje a 14 dias (`DIAS_DA_JANELA`). Ao abrir o app, a equipe confere a
janela com o banco e grava só o que falta ou mudou. Nas gravações, a contagem de lugares é
recalculada com o registro da aula lido de novo dentro da transação.

## App do aluno (`minhasAulas.ts`)

As próximas aulas do aluno saem do portal (turmas fixas), dos créditos dele (avisos e reposições)
e das vagas. Avisar a falta e escolher a reposição usam as mesmas regras da equipe (prazo de
aviso, validade, unidade, vaga), conferidas de novo pelo banco. O prazo vale também para encaixar
e desistir: no app, nada muda com menos de `antecedenciaAvisoHoras` para a aula.

## LGPD (`privacidade.ts`)

- `dadosDoAluno` junta cadastro, turmas, presenças, créditos, mensalidade e pagamentos num
  arquivo JSON legível (a mensalidade só quando quem exporta vê o financeiro).
- `exclusaoDoAluno` tira o aluno das turmas, das aulas de hoje em diante e apaga os créditos; o
  cadastro, a mensalidade, o portal e o convite somem; presenças antigas e pagamentos ficam só com
  o código.

## Coleções no Firestore

Um projeto Firebase é um estúdio. "Administração" = titular ou administrador. Regras em
[`firestore.rules`](../firestore.rules); detalhes de acesso em [seguranca.md](seguranca.md).

| Coleção | Documento | Quem lê | Quem escreve |
|---|---|---|---|
| `estudio` | `posse` (`titularUid`, `titularMembroId`) | equipe e a conta do e-mail do primeiro acesso | primeiro acesso (uma vez); depois só o titular, para passar a conta |
| `configuracao` | `estudio` | equipe e aluno | administração |
| `unidades` | id | equipe e aluno | administração |
| `equipe` | id do membro (com `uid` depois do aceite) | equipe | administração para professores; titular para administradores; cada um o próprio contato; o convidado só grava o próprio `uid` ao aceitar |
| `convites` | e-mail da pessoa (`papel`, `pessoaId`, `porId`, `criadoEm`, `expiraEm` em ms) | administração e o dono do e-mail | administração (professor e aluno), titular (administrador); o convidado apaga ao aceitar. `expiraEm` nasce dentro da validade das configurações e o aceite depois dele é recusado; revogar apaga o documento, mandar de novo grava outro |
| `acessos` | uid da conta | a própria conta; a administração acha os de aluno | a própria conta, a partir de um convite ou do primeiro acesso; a administração apaga o de aluno na exclusão |
| `alunos` | id | equipe | administração |
| `financeiroDosAlunos` | id do aluno | administração | administração |
| `turmas` | id | equipe | administração |
| `registros` | `${turmaId}_${data}` (com `experimentais`: código para `'Nome|telefone[|alunoId]'`) | equipe | equipe (cancelamento só a administração; professor só nas unidades dele); aluno só a própria marcação ou reposição, nunca o mapa de experimentais |
| `creditos` | id determinístico | equipe; o aluno os dele | equipe; aluno o do próprio aviso e o uso na própria reposição |
| `pagamentos` | id | administração | administração |
| `vagas` | `${turmaId}_${data}` | equipe e aluno | equipe; aluno só um lugar a mais ou a menos, junto com o registro |
| `portal` | id do aluno | equipe e o próprio aluno | administração |
| `publico` | `estudio` | qualquer pessoa | administração; professor só os horários |

O titular fica gravado como administrador na equipe; quem é titular diz a posse (passar a conta
muda um documento só). Na equipe, marcações por aluno vão por mescla dentro de uma transação
(duas pessoas na mesma chamada não se apagam) e alunos fixos entram e saem da turma com
`arrayUnion` e `arrayRemove`.
