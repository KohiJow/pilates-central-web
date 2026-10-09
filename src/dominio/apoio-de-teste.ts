// Fábricas pequenas para os testes do domínio (não entram no app).
import type { Contexto } from './presenca'
import type { CreditoReposicao, RegistroAula, Turma } from './tipos'

export function turma(parcial: Partial<Turma> = {}): Turma {
  return {
    id: 't-sex-07',
    unidadeId: 'u-centro',
    diaDaSemana: 5,
    inicio: '07:00',
    duracaoMin: 50,
    capacidade: 5,
    professorId: 'p-1',
    alunosFixos: ['a1', 'a2', 'a3', 'a4'],
    ativa: true,
    desde: '2026-01-01',
    ...parcial,
  }
}

export function registro(parcial: Partial<RegistroAula> & Pick<RegistroAula, 'turmaId' | 'data'>): RegistroAula {
  return {
    id: `${parcial.turmaId}_${parcial.data}`,
    unidadeId: 'u-centro',
    marcacoes: {},
    reposicoes: {},
    atualizadoEm: '2026-10-01T10:00:00.000Z',
    ...parcial,
  }
}

export function credito(parcial: Partial<CreditoReposicao> = {}): CreditoReposicao {
  return {
    id: 'cr_a9_t-qua-07_2026-10-07',
    alunoId: 'a9',
    unidadeId: 'u-centro',
    origem: { turmaId: 't-qua-07', data: '2026-10-07' },
    criadoEm: '2026-10-06T12:00:00.000Z',
    validoAte: '2026-11-06',
    ...parcial,
  }
}

/** Contexto com o relógio do estúdio em `data` às `hora`. */
export function contexto(data: string, hora: string, config: Partial<Contexto['config']> = {}): Contexto {
  const [h, m] = hora.split(':').map(Number)
  return {
    agora: { data, minutos: (h ?? 0) * 60 + (m ?? 0) },
    instante: `${data}T${hora}:00.000-03:00`,
    config: { validadeCreditoDias: 30, antecedenciaAvisoHoras: 3, ...config },
  }
}

export function buscaEm(creditos: CreditoReposicao[]): (id: string) => CreditoReposicao | undefined {
  return (id) => creditos.find((c) => c.id === id)
}
