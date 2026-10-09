import { signal } from '@preact/signals'
import type { ItemDeAba } from '../componentes/BarraAbas'
import type { Papel } from '../dominio/tipos'

export type Aba = 'hoje' | 'agenda' | 'mais'

const TODAS: Record<Aba, ItemDeAba<Aba>> = {
  hoje: { id: 'hoje', rotulo: 'Hoje', icone: 'hoje' },
  agenda: { id: 'agenda', rotulo: 'Agenda', icone: 'agenda' },
  mais: { id: 'mais', rotulo: 'Mais', icone: 'mais' },
}

// Abas por papel. Na etapa 2 entram "Alunos" (os dois papéis) e "Financeiro" (só a dona).
const POR_PAPEL: Record<Papel, Aba[]> = {
  dona: ['hoje', 'agenda', 'mais'],
  professor: ['hoje', 'agenda', 'mais'],
}

export function abasDoPapel(papel: Papel): ItemDeAba<Aba>[] {
  return POR_PAPEL[papel].map((id) => TODAS[id])
}

function abaDoEndereco(): Aba {
  const nome = location.hash.replace(/^#\/?/, '')
  return nome === 'agenda' || nome === 'mais' ? nome : 'hoje'
}

export const aba = signal<Aba>(abaDoEndereco())

/**
 * Troca de aba sem empilhar histórico (o "voltar" do celular fecha folhas e sai do app,
 * não fica passeando pelas abas). A tela nova entra deslizando do lado da aba escolhida
 * (animação em CSS, ver .tela em movimento.css).
 */
export function irPara(nova: Aba, papel: Papel): void {
  const atual = aba.peek()
  if (nova === atual) return
  const ordem = POR_PAPEL[papel]
  const direcao = ordem.indexOf(nova) > ordem.indexOf(atual) ? 'frente' : 'tras'
  history.replaceState(history.state, '', `${location.pathname}${location.search}#/${nova}`)
  document.documentElement.dataset.direcao = direcao
  aba.value = nova
  window.scrollTo(0, 0)
}
