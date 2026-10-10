import type { JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { pode } from '../../app/perfil'
import { CabecalhoDeSubtela } from '../../componentes/CabecalhoDeSubtela'
import { EsqueletoDeLista } from '../../componentes/Esqueleto'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { alunosPorId, equipePorId, repositorio } from '../../dados/estado'
import { descreverAuditoria, LINHAS_DO_REGISTRO, quandoFoi } from '../../dominio/auditoria'
import type { RegistroDeAuditoria } from '../../dominio/tipos'
import { SemAcesso } from './SemAcesso'

type Estado = { situacao: 'carregando' } | { situacao: 'pronto'; linhas: RegistroDeAuditoria[] } | { situacao: 'erro' }

/**
 * Registro de alterações (só a administração): quem lançou ou apagou pagamento, excluiu
 * cadastro, mexeu em acesso ou passou a conta, e quando. Fica gravado só com códigos; os nomes
 * são os de agora.
 */
export function RegistroDeAlteracoes() {
  const [estado, setEstado] = useState<Estado>({ situacao: 'carregando' })
  const repo = repositorio.value
  const podeVer = pode('ver-financeiro')

  useEffect(() => {
    if (!repo || !podeVer) return
    let vivo = true
    repo
      .auditoria(LINHAS_DO_REGISTRO)
      .then((linhas) => vivo && setEstado({ situacao: 'pronto', linhas }))
      .catch(() => vivo && setEstado({ situacao: 'erro' }))
    return () => {
      vivo = false
    }
  }, [repo, podeVer])

  if (!podeVer) return <SemAcesso titulo="Registro de alterações" texto="Só a administração vê o registro de alterações." />

  const nomes = {
    equipe: (id: string) => equipePorId.value.get(id)?.nome,
    aluno: (id: string) => alunosPorId.value.get(id)?.nome,
  }

  return (
    <section class="tela" aria-labelledby="titulo-registro">
      <CabecalhoDeSubtela voltarPara="Mais" rotulo="Estúdio" titulo="Registro de alterações" idTitulo="titulo-registro" />
      <p class="texto-secundario">
        Quem lançou ou apagou pagamento, excluiu cadastro, mudou acesso ou passou a conta, e quando. Nada aqui se edita nem se apaga.
      </p>
      {estado.situacao === 'carregando' ? (
        <EsqueletoDeLista itens={4} altura={64} />
      ) : estado.situacao === 'erro' ? (
        <EstadoVazio icone="info" rotulo="Não carregou" texto="Confira a internet e abra de novo." />
      ) : estado.linhas.length === 0 ? (
        <EstadoVazio icone="regras" rotulo="Nada registrado ainda" texto="O primeiro pagamento lançado aparece aqui." />
      ) : (
        <ul class="lista" aria-label="Alterações, da mais recente para a mais antiga">
          {estado.linhas.map((r, i) => (
            <li key={r.id} class="lista-item" style={{ '--i': i } as JSX.CSSProperties} data-auditoria={r.acao}>
              <span class="lista-item-texto">
                <span class="lista-item-titulo">{descreverAuditoria(r, nomes)}</span>
                <span class="lista-item-sub">{quandoFoi(r.em)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
