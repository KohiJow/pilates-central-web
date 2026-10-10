import { useLayoutEffect } from 'preact/hooks'
import { Avisos } from '../componentes/Avisos'
import { carregar, repositorio } from '../dados/estado'
import { AppDoAluno } from '../telas/aluno/AppDoAluno'
import { EntrarComEmail } from '../telas/conta/EntrarComEmail'
import { AbrindoConta, ConfirmarEmail, FalhaAoAbrir, PrimeiroAcesso, SemAcessoAConta } from '../telas/conta/EtapasDaConta'
import { Portas } from '../telas/conta/Portas'
import { Entrar } from '../telas/Entrar'
import { conta } from './conta'
import { Estrutura } from './Estrutura'
import { modo } from './modo'
import { emFoco } from './navegacao'
import { hoje } from './relogio'
import { sessao, sessaoDoAluno } from './sessao'

function recarregar() {
  const repo = repositorio.peek()
  if (repo) void carregar(repo, hoje.peek())
}

function Tela() {
  const m = modo.value
  if (m === null) return <Portas />
  if (m === 'demonstracao') {
    if (sessao.value) return <Estrutura aoRecarregar={recarregar} />
    if (sessaoDoAluno.value) return <AppDoAluno />
    return <Entrar />
  }
  const c = conta.value
  switch (c.etapa) {
    case 'carregando':
    case 'verificando':
      return <AbrindoConta />
    case 'falhou':
      return <FalhaAoAbrir mensagem={c.mensagem} />
    case 'fora':
      return <EntrarComEmail />
    case 'confirmar':
      return <ConfirmarEmail email={c.email} enviadoEm={c.enviadoEm} falhaNoEnvio={c.falhaNoEnvio} />
    case 'primeiroAcesso':
      return <PrimeiroAcesso email={c.email} />
    case 'semAcesso':
      return <SemAcessoAConta email={c.email} mensagem={c.mensagem} />
    case 'equipe':
      return sessao.value ? <Estrutura aoRecarregar={recarregar} /> : <AbrindoConta />
    case 'aluno':
      return <AppDoAluno />
  }
}

/** Qual moldura está na tela: ao trocar (entrar, sair), a página volta ao topo. */
function moldura(): string {
  if (modo.value === null) return 'portas'
  if (modo.value === 'demonstracao') return sessao.value ? 'equipe' : sessaoDoAluno.value ? 'aluno' : 'entrar'
  return conta.value.etapa
}

export function App() {
  const dentro = (modo.value === 'demonstracao' && (sessao.value || sessaoDoAluno.value)) || conta.value.etapa === 'equipe' || conta.value.etapa === 'aluno'
  const atual = moldura()
  // a rolagem da tela de entrada (que é comprida) não pode vazar para o app
  useLayoutEffect(() => window.scrollTo(0, 0), [atual])
  return (
    <>
      <Tela />
      <Avisos semAbas={!dentro || emFoco.value} />
    </>
  )
}
