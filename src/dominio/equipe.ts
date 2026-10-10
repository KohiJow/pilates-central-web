// Regras da equipe: quem convida quem, quem muda o papel de quem e como a conta muda de mãos.
// O ator (quem está usando o app) entra em toda regra: a tela só oferece o que passa aqui, e as
// regras do Firestore (firestore.rules) repetem as mesmas recusas do lado do banco.
import { ehAdministracao, NOME_DO_PAPEL, pode } from './permissoes'
import { aceito, recusado, semErros } from './resultado'
import type { ErrosDeCampo, Resultado } from './resultado'
import { ehEmailValido, normalizar, normalizarTelefone, primeiroNome } from './texto'
import type { Id, Instante, MembroEquipe, Papel, Turma, Unidade } from './tipos'

export interface RascunhoMembro {
  nome: string
  email: string
  telefone: string
  papel: Exclude<Papel, 'titular'>
  unidades: Id[]
}

export type CampoMembro = 'nome' | 'email' | 'telefone' | 'unidades'

export function validarMembro(
  r: RascunhoMembro,
  equipe: readonly MembroEquipe[],
  unidades: readonly Unidade[],
  idAtual?: Id,
): ErrosDeCampo<CampoMembro> {
  const erros: ErrosDeCampo<CampoMembro> = {}
  if (r.nome.trim().length < 3) erros.nome = 'Escreva o nome da pessoa.'
  if (!ehEmailValido(r.email)) erros.email = 'Confira o e-mail: é por ele que a pessoa vai entrar.'
  else {
    const email = normalizar(r.email)
    const outro = equipe.find((m) => m.id !== idAtual && normalizar(m.email) === email)
    if (outro) erros.email = `${outro.nome} já usa este e-mail.`
  }
  if (r.telefone.trim() && !normalizarTelefone(r.telefone)) erros.telefone = 'Use DDD e número, por exemplo (19) 90000-0000.'
  const ativas = new Set(unidades.filter((u) => u.ativa).map((u) => u.id))
  if (r.papel === 'professor' && !r.unidades.some((u) => ativas.has(u))) {
    erros.unidades = 'Escolha pelo menos uma unidade.'
  }
  return erros
}

function semPermissao(texto: string) {
  return recusado<never>('sem-permissao', texto)
}

/**
 * Convida alguém para a equipe. A administração convida professores; só quem é titular
 * convida (e promove) administradores. Na demonstração o convite fica registrado; no Firebase
 * vira um documento de convite para o e-mail da pessoa (ver firestore.rules).
 */
export function convidar(
  ator: MembroEquipe,
  r: RascunhoMembro,
  equipe: readonly MembroEquipe[],
  unidades: readonly Unidade[],
  id: Id,
  instante: Instante,
): Resultado<MembroEquipe> {
  if (r.papel === 'administrador' && !pode(ator.papel, 'gerenciar-administradores')) {
    return semPermissao('Só quem é responsável pela conta convida alguém para a administração.')
  }
  if (!pode(ator.papel, 'convidar-professor')) return semPermissao('Só a administração convida pessoas.')
  const erros = validarMembro(r, equipe, unidades)
  if (!semErros(erros)) return recusado('dados-invalidos', Object.values(erros)[0] ?? 'Confira os dados.')
  return aceito({
    id,
    nome: r.nome.trim(),
    papel: r.papel,
    email: r.email.trim().toLowerCase(),
    telefone: normalizarTelefone(r.telefone) ?? '',
    // administração vê todas as unidades; a lista fica para quando der aula
    unidades: [...r.unidades],
    ativo: true,
    convite: { enviadoEm: instante, porId: ator.id },
  })
}

/** Quem pode mexer no cadastro (nome, contato, unidades) de `alvo`. */
export function podeEditarMembro(ator: MembroEquipe, alvo: MembroEquipe): boolean {
  if (ator.id === alvo.id) return true
  if (alvo.papel === 'titular') return false
  if (alvo.papel === 'administrador') return pode(ator.papel, 'gerenciar-administradores')
  return pode(ator.papel, 'editar-professores')
}

/** Atualiza nome, contato e unidades. O papel muda só por `mudarPapel` e `transferirTitularidade`. */
export function editarMembro(
  ator: MembroEquipe,
  alvo: MembroEquipe,
  r: Omit<RascunhoMembro, 'papel'>,
  equipe: readonly MembroEquipe[],
  unidades: readonly Unidade[],
): Resultado<MembroEquipe> {
  if (!podeEditarMembro(ator, alvo)) return semPermissao('Você não pode mudar o cadastro desta pessoa.')
  // o professor atualiza o próprio contato, mas não escolhe as próprias unidades
  const unidadesFinais = pode(ator.papel, 'editar-professores') ? r.unidades : alvo.unidades
  const papel = alvo.papel === 'titular' ? 'administrador' : alvo.papel
  const erros = validarMembro({ ...r, unidades: unidadesFinais, papel }, equipe, unidades, alvo.id)
  if (!semErros(erros)) return recusado('dados-invalidos', Object.values(erros)[0] ?? 'Confira os dados.')
  return aceito({
    ...alvo,
    nome: r.nome.trim(),
    email: r.email.trim().toLowerCase(),
    telefone: normalizarTelefone(r.telefone) ?? '',
    unidades: [...unidadesFinais],
  })
}

/**
 * Promove um professor a administrador ou devolve um administrador para professor.
 * Só o titular faz isso, e ninguém mexe no papel do titular por aqui.
 */
export function mudarPapel(ator: MembroEquipe, alvo: MembroEquipe, novo: Exclude<Papel, 'titular'>): Resultado<MembroEquipe> {
  if (!pode(ator.papel, 'gerenciar-administradores')) {
    return semPermissao('Só quem é responsável pela conta muda quem faz parte da administração.')
  }
  if (alvo.papel === 'titular') return semPermissao('Para deixar de ser responsável, passe a conta para outra pessoa.')
  if (!alvo.ativo) return recusado('nada-a-fazer', `${primeiroNome(alvo.nome)} está desativado.`)
  if (alvo.papel === novo) return recusado('nada-a-fazer', `${primeiroNome(alvo.nome)} já é ${NOME_DO_PAPEL[novo].toLowerCase()}.`)
  return aceito({ ...alvo, papel: novo })
}

/** Tira o acesso de alguém (o histórico de aulas continua com o nome dele). */
export function desativarMembro(ator: MembroEquipe, alvo: MembroEquipe, turmas: readonly Turma[]): Resultado<MembroEquipe> {
  if (ator.id === alvo.id) return semPermissao('Você não pode tirar o seu próprio acesso.')
  if (alvo.papel === 'titular') return semPermissao('Quem é responsável pela conta não pode ser desativado.')
  if (alvo.papel === 'administrador' && !pode(ator.papel, 'gerenciar-administradores')) {
    return semPermissao('Só quem é responsável pela conta tira alguém da administração.')
  }
  if (!pode(ator.papel, 'editar-professores')) return semPermissao('Só a administração muda a equipe.')
  if (!alvo.ativo) return recusado('nada-a-fazer', `${primeiroNome(alvo.nome)} já está desativado.`)
  const dele = turmas.filter((t) => t.ativa && t.professorId === alvo.id).length
  if (dele > 0) {
    return recusado(
      'conflito',
      `${primeiroNome(alvo.nome)} dá ${dele === 1 ? '1 turma' : `${dele} turmas`}. Passe para outra pessoa antes.`,
    )
  }
  return aceito({ ...alvo, ativo: false })
}

export function reativarMembro(ator: MembroEquipe, alvo: MembroEquipe): Resultado<MembroEquipe> {
  if (alvo.papel === 'administrador' && !pode(ator.papel, 'gerenciar-administradores')) {
    return semPermissao('Só quem é responsável pela conta devolve o acesso de quem administra.')
  }
  if (!pode(ator.papel, 'editar-professores')) return semPermissao('Só a administração muda a equipe.')
  if (alvo.ativo) return recusado('nada-a-fazer', `${primeiroNome(alvo.nome)} já está ativo.`)
  return aceito({ ...alvo, ativo: true })
}

/** Quem pode mexer no convite de `alvo`: a administração nos de professor, só o titular nos de administração. */
function podeMexerNoConvite(ator: MembroEquipe, alvo: MembroEquipe): Resultado<true> {
  if (!alvo.convite) return recusado('nada-a-fazer', `${primeiroNome(alvo.nome)} já fez o primeiro acesso.`)
  if (alvo.papel === 'administrador' && !pode(ator.papel, 'gerenciar-administradores')) {
    return semPermissao('Só quem é responsável pela conta mexe em convites para a administração.')
  }
  if (!pode(ator.papel, 'editar-professores')) return semPermissao('Só a administração mexe em convites.')
  return aceito(true)
}

/**
 * Revoga um convite que ainda não foi aceito: a pessoa fica sem acesso (no Firebase, o convite
 * para o e-mail dela some) e o cadastro fica guardado para convidar de novo.
 */
export function revogarConvite(ator: MembroEquipe, alvo: MembroEquipe): Resultado<MembroEquipe> {
  const p = podeMexerNoConvite(ator, alvo)
  if (!p.ok) return p
  if (!alvo.ativo) return recusado('nada-a-fazer', 'Este convite já foi revogado.')
  return aceito({ ...alvo, ativo: false })
}

/**
 * Manda o convite de novo (venceu, ou foi revogado): o prazo recomeça agora e, se estava
 * revogado, a pessoa volta a poder entrar.
 */
export function renovarConvite(ator: MembroEquipe, alvo: MembroEquipe, instante: Instante): Resultado<MembroEquipe> {
  const p = podeMexerNoConvite(ator, alvo)
  if (!p.ok) return p
  return aceito({ ...alvo, ativo: true, convite: { enviadoEm: instante, porId: ator.id } })
}

/**
 * Passa a conta para um administrador. Quem era titular vira administrador (continua com o
 * mesmo acesso ao dia a dia). O novo titular precisa já ter entrado no app: com o login de
 * verdade, isso quer dizer e-mail confirmado.
 */
export function transferirTitularidade(ator: MembroEquipe, alvo: MembroEquipe): Resultado<MembroEquipe[]> {
  if (!pode(ator.papel, 'transferir-titularidade')) {
    return semPermissao('Só quem é responsável pela conta pode passá-la adiante.')
  }
  if (ator.id === alvo.id) return recusado('nada-a-fazer', 'Você já é responsável pela conta.')
  if (alvo.papel !== 'administrador') {
    return recusado('conflito', 'A conta só pode passar para alguém da administração. Promova a pessoa antes.')
  }
  if (!alvo.ativo) return recusado('conflito', `${primeiroNome(alvo.nome)} está desativado.`)
  if (alvo.convite) {
    return recusado('conflito', `${primeiroNome(alvo.nome)} ainda não fez o primeiro acesso. Espere o convite ser aceito.`)
  }
  return aceito([
    { ...ator, papel: 'administrador' },
    { ...alvo, papel: 'titular' },
  ])
}

const ORDEM_DO_PAPEL: Record<Papel, number> = { titular: 0, administrador: 1, professor: 2 }

/** Equipe na ordem da tela: titular, administração, professores; ativos antes; por nome. */
export function ordenarEquipe(equipe: readonly MembroEquipe[]): MembroEquipe[] {
  return [...equipe].sort(
    (a, b) =>
      Number(b.ativo) - Number(a.ativo) ||
      ORDEM_DO_PAPEL[a.papel] - ORDEM_DO_PAPEL[b.papel] ||
      a.nome.localeCompare(b.nome, 'pt-BR'),
  )
}

/** Quem pode dar aula numa unidade: professores dela e a administração (que vê todas). */
export function quemPodeDarAula(equipe: readonly MembroEquipe[], unidadeId: Id): MembroEquipe[] {
  return ordenarEquipe(equipe).filter((m) => m.ativo && (ehAdministracao(m.papel) || m.unidades.includes(unidadeId)))
}
