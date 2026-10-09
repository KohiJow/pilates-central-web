import { LINEAR_SUAVE, LINEAR_VIVA } from './mola'
import { suportaLinear } from './preferencias'

// Durações de 180 a 320 ms. Acima disso a interface parece lenta para quem está entre uma aula
// e outra; abaixo, o olho não acompanha.
export const DURACAO = { curta: 180, media: 240, longa: 320 } as const

export const CURVA = {
  suave: suportaLinear ? LINEAR_SUAVE : 'cubic-bezier(0.22, 1, 0.36, 1)',
  viva: suportaLinear ? LINEAR_VIVA : 'cubic-bezier(0.34, 1.36, 0.64, 1)',
  saida: 'cubic-bezier(0.4, 0, 1, 1)',
  padrao: 'cubic-bezier(0.2, 0, 0, 1)',
} as const
