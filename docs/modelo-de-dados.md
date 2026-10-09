# Modelo de dados

Código em `src/dominio/` (tipos em `tipos.ts`). Nada ali sabe de onde vêm os dados: as mesmas
funções servem ao modo demonstração (dados no aparelho) e ao Firebase (etapa 2).

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
| `MembroEquipe` | `id`, `nome`, `papel` (`dona` ou `professor`), `email`, `telefone`, `unidades[]`, `ativo` | No Firebase o `id` será o uid do login. |
| `Aluno` | `id`, `nome`, `unidadeId`, `telefone`, `email`, `vezesPorSemana`, `situacao` (`ativo`, `pausado`, `inativo`), `valorMensal`, `formaPagamento`, `observacao`, `desde` | As turmas fixas do aluno são derivadas de `Turma.alunosFixos` (`turmasDoAluno`), para não haver duas fontes. A observação é texto livre visível só à equipe; não há ficha de saúde estruturada. |
| `Turma` | `id`, `unidadeId`, `diaDaSemana` (0 = domingo), `inicio`, `duracaoMin`, `capacidade`, `professorId`, `alunosFixos[]`, `ativa`, `desde` | Uma turma por dia da semana: "seg/qua/sex às 7h" são três turmas. |
| `RegistroAula` | `id`, `turmaId`, `unidadeId`, `data`, `marcacoes` (aluno para `presente`, `faltou` ou `avisou`), `reposicoes` (aluno para crédito usado), `cancelamento?` (`motivo`: `feriado` ou `estudio`, `observacao`), `atualizadoEm` | As exceções de uma aula. Sem registro, a aula é a turma pura. |
| `CreditoReposicao` | `id`, `alunoId`, `unidadeId`, `origem` (turma e data da falta), `criadoEm`, `validoAte`, `usadoEm?` (turma e data da reposição) | Situação derivada: disponível, usado ou vencido (`situacaoDoCredito`). |
| `Pagamento` | `id`, `alunoId`, `unidadeId`, `competencia` (`'2026-10'`), `valor`, `forma`, `pagoEm`, `observacao` | Preenchido à mão pela dona (etapa 2). |
| `Configuracao` | `nomeEstudio`, `whatsapp`, `validadeCreditoDias`, `antecedenciaAvisoHoras`, `capacidadePadrao` | Padrão em `configuracao.ts`: 30 dias de validade, 3 horas de antecedência, 5 lugares. |

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
- **Resumo financeiro** (`pagamentos.ts`): esperado (soma das mensalidades dos ativos), recebido,
  por forma de pagamento e quem está pendente na competência.

## Regras

### Presença (`presenca.ts`)

- Presente e falta só a partir do dia da aula (dá para marcar na porta, antes de começar).
- "Avisou" só enquanto a aula não terminou; depois disso é falta.
- Avisar com pelo menos `antecedenciaAvisoHoras` gera um crédito de reposição válido por
  `validadeCreditoDias` a partir da data da aula. Em cima da hora fica registrado, sem crédito;
  a dona pode dar o crédito mesmo assim (`concederCredito`).
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

### Permissões (`permissoes.ts`)

| Ação | Dona | Professor |
|---|:-:|:-:|
| Ver agenda, marcar presença, encaixar reposição, ver alunos | sim | sim |
| Dar crédito fora do prazo, cancelar aula | sim | não |
| Editar alunos, turmas, equipe e configuração | sim | não |
| Ver financeiro, registrar pagamento | sim | não |

A interface consulta essa tabela; as regras do Firestore (etapa 2) devem seguir a mesma.

## Proposta de coleções no Firestore (etapa 2)

| Coleção | Documento | Quem lê | Quem escreve |
|---|---|---|---|
| `configuracao` | `estudio` | equipe | dona |
| `unidades` | id | equipe | dona |
| `equipe` | uid do login | equipe | dona |
| `alunos` | id | equipe (o professor sem `valorMensal` e `formaPagamento`: separar em `alunosFinanceiro`) | dona |
| `turmas` | id | equipe | dona |
| `registros` | `${turmaId}_${data}` | equipe | equipe (campos `marcacoes.*` e `reposicoes.*`); `cancelamento` só a dona |
| `creditos` | id determinístico | equipe | equipe |
| `pagamentos` | id | dona | dona |

Para duas pessoas marcando a mesma aula ao mesmo tempo, o adaptador do Firebase deve gravar por
campo (`updateDoc` com `marcacoes.<aluno>`) dentro de um lote, e não o documento inteiro.
