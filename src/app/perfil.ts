import { computed, effect } from '@preact/signals'
import { equipePorId, situacao } from '../dados/estado'
import { pode as podePapel } from '../dominio/permissoes'
import type { Acao } from '../dominio/permissoes'
import type { MembroEquipe, Papel } from '../dominio/tipos'
import { entrar, sair, sessao } from './sessao'

/** Quem está usando o app, pelo cadastro da equipe (undefined antes de os dados chegarem). */
export const membro = computed<MembroEquipe | undefined>(() => {
  const s = sessao.value
  return s ? equipePorId.value.get(s.membroId) : undefined
})

/** Papel atual: o do cadastro quando os dados chegaram, o guardado na sessão até lá. */
export const papel = computed<Papel | undefined>(() => membro.value?.papel ?? sessao.value?.papel)

export function pode(acao: Acao): boolean {
  return podePapel(papel.value, acao)
}

/**
 * Mantém a sessão de acordo com a equipe: quem foi desativado (ou sumiu numa demonstração
 * recomeçada) volta para a entrada; quem mudou de papel continua, com o papel novo guardado.
 */
export function acompanharSessao(): () => void {
  return effect(() => {
    const s = sessao.value
    if (!s || situacao.value !== 'pronto') return
    const m = equipePorId.value.get(s.membroId)
    if (!m || !m.ativo) sair()
    else if (m.papel !== s.papel) entrar({ membroId: m.id, papel: m.papel })
  })
}
