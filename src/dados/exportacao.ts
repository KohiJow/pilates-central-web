// Exportação dos dados de um aluno (LGPD): carrega o histórico que faltar e monta o arquivo.
import { agoraDoApp, hoje } from '../app/relogio'
import { competenciaDe, somarDias } from '../dominio/datas'
import { deslocarCompetencia } from '../dominio/pagamentos'
import { dadosDoAluno, nomeDoArquivoDeDados } from '../dominio/privacidade'
import { aceito, recusado } from '../dominio/resultado'
import type { Resultado } from '../dominio/resultado'
import type { Competencia, Id } from '../dominio/tipos'
import { participacoesEntre } from './consultas'
import { alunosPorId, base, creditos, financeiro, garantirIntervalo, repositorio } from './estado'

/** Até onde o arquivo vai para trás (presenças e pagamentos). */
const DIAS_DE_HISTORICO = 730

function competenciasEntre(de: Competencia, ate: Competencia): Competencia[] {
  const saida: Competencia[] = []
  for (let c = de; c <= ate && saida.length < 36; c = deslocarCompetencia(c, 1)) saida.push(c)
  return saida
}

export async function exportarDadosDoAluno(alunoId: Id, comFinanceiro: boolean): Promise<Resultado<{ nome: string; conteudo: string }>> {
  const aluno = alunosPorId.peek().get(alunoId)
  const repo = repositorio.peek()
  const b = base.peek()
  if (!aluno || !repo || !b) return recusado('nada-a-fazer', 'Os dados ainda não carregaram.')
  const dia = hoje.peek()
  const limite = somarDias(dia, -DIAS_DE_HISTORICO)
  const de = aluno.desde > limite ? aluno.desde : limite
  try {
    await garantirIntervalo(de, dia)
    const pagamentos = comFinanceiro ? await repo.pagamentos(competenciasEntre(competenciaDe(de), competenciaDe(dia))) : []
    const fin = comFinanceiro ? financeiro.peek().get(alunoId) : undefined
    const dados = dadosDoAluno({
      aluno,
      unidades: b.unidades,
      turmas: b.turmas,
      ...(fin ? { financeiro: fin } : {}),
      pagamentos,
      creditos: [...creditos.peek().values()],
      participacoes: participacoesEntre(de, dia),
      geradoEm: agoraDoApp().toISOString(),
      nomeEstudio: b.configuracao.nomeEstudio,
    })
    return aceito({ nome: nomeDoArquivoDeDados(aluno, dia), conteudo: JSON.stringify(dados, null, 2) })
  } catch {
    return recusado('nada-a-fazer', 'Não deu para juntar os dados agora. Confira a internet e tente de novo.')
  }
}
