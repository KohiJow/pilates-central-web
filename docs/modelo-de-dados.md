# Modelo de dados

Código em `src/dominio/` (tipos em `tipos.ts`). Nada ali sabe de onde vêm os dados: as mesmas
funções servem ao modo demonstração (dados no aparelho) e ao Firebase (etapa 3).

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
| `Aluno` | `id`, `nome`, `unidadeId`, `telefone`, `email`, `vezesPorSemana`, `situacao` (`ativo`, `pausado`, `inativo` = arquivado), `observacao`, `desde` | As turmas fixas do aluno são derivadas de `Turma.alunosFixos` (`turmasDoAluno`), para não haver duas fontes. A observação é texto livre visível só à equipe; não há ficha de saúde estruturada. |
| `FinanceiroDoAluno` | `alunoId`, `unidadeId`, `valorMensal`, `formaPreferida`, `diaVencimento` | A parte do cadastro que o professor não lê. Fica separada porque no Firestore a regra libera ou nega o documento inteiro. |
| `Turma` | `id`, `unidadeId`, `diaDaSemana` (0 = domingo), `inicio`, `duracaoMin`, `capacidade`, `professorId`, `alunosFixos[]`, `fixosDesde`, `ativa`, `desde` | Uma turma por dia da semana: "seg/qua/sex às 7h" são três turmas. `fixosDesde` guarda desde quando cada aluno está na turma: quem entra hoje não aparece nas aulas que já passaram. |
| `RegistroAula` | `id`, `turmaId`, `unidadeId`, `data`, `marcacoes` (aluno para `presente`, `faltou` ou `avisou`), `reposicoes` (aluno para crédito usado), `cancelamento?` (`motivo`: `feriado` ou `estudio`, `observacao`), `atualizadoEm` | As exceções de uma aula. Sem registro, a aula é a turma pura. |
| `CreditoReposicao` | `id`, `alunoId`, `unidadeId`, `motivo` (`aviso`, `cancelamento`, `cortesia`), `origem` (turma e data da falta), `criadoEm`, `validoAte`, `usadoEm?` (turma e data da reposição) | Situação derivada: disponível, usado ou vencido (`situacaoDoCredito`). Só os de aviso contam para o limite do mês. |
| `Pagamento` | `id`, `alunoId`, `unidadeId`, `competencia` (`'2026-10'`), `valor`, `forma`, `pagoEm`, `observacao`, `registradoPorId` | Lançado à mão pela administração. Formas: Pix, cartão de crédito, cartão de débito, dinheiro, transferência, Gympass, TotalPass, outro. |
| `Configuracao` | `nomeEstudio`, `whatsapp`, `validadeCreditoDias`, `antecedenciaAvisoHoras`, `limiteReposicoesMes`, `alertaAusenciasSeguidas`, `capacidadePadrao` | Padrão em `configuracao.ts`: 30 dias de validade, 3 horas de antecedência, sem limite por mês, destaque a partir de 3 ausências seguidas, 5 lugares. |

## Visões derivadas (calculadas a cada leitura)

- **`Aula`** (`montarAula`, `aulasDoDia` em `agenda.ts`): a turma numa data, com horário de fim,
  participantes e lotação. Participantes: fixos ativos (na ordem da turma), depois reposições;
  quem saiu da turma mas tem presença registrada naquela data continua aparecendo (histórico).
  Aluno pausado ou inativo não ocupa lugar.
- **Lugares ocupados** = fixos que não avisaram falta + reposições. **Vagas** = capacidade menos
  ocupados (nunca negativo; aula cancelada não tem vaga).
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

### Permissões (`permissoes.ts`)

| Ação | Titular | Administrador | Professor |
|---|:-:|:-:|:-:|
| Ver agenda e turmas, marcar presença, encaixar reposição, ver alunos (sem valores) | sim | sim | sim |
| Ver todas as unidades, dar crédito fora do prazo, cancelar aula | sim | sim | não |
| Editar alunos, turmas, unidades e configuração | sim | sim | não |
| Ver financeiro, lançar pagamento | sim | sim | não |
| Convidar e editar professores | sim | sim | não |
| Convidar, promover e tirar administradores; passar a conta adiante | sim | não | não |

A interface consulta essa tabela; as regras do Firestore (etapa 3) devem seguir a mesma.

## Proposta de coleções no Firestore (etapa 3)

"Administração" = titular ou administrador.

| Coleção | Documento | Quem lê | Quem escreve |
|---|---|---|---|
| `configuracao` | `estudio` | equipe | administração |
| `unidades` | id | equipe | administração |
| `equipe` | uid do login | equipe | administração para professores; titular para administradores e para o próprio papel |
| `alunos` | id | equipe | administração |
| `financeiroDosAlunos` | id do aluno | administração | administração |
| `turmas` | id | equipe | administração |
| `registros` | `${turmaId}_${data}` | equipe | equipe (campos `marcacoes.*` e `reposicoes.*`); `cancelamento` só a administração |
| `creditos` | id determinístico | equipe | equipe |
| `pagamentos` | id | administração | administração |

Para duas pessoas marcando a mesma aula ao mesmo tempo, o adaptador do Firebase deve gravar por
campo (`updateDoc` com `marcacoes.<aluno>`) dentro de um lote, e não o documento inteiro. Os alunos
fixos de uma turma, com `arrayUnion` e `arrayRemove`.
