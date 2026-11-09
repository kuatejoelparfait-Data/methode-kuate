import { SPEC_PHASE_OUTPUTS } from './format.js'
import type { SpecPhase } from './types.js'

/** Vrai si le fichier fait partie des sorties attendues de la phase (contrats : un seul niveau sous docs/contracts/). */
export function isPhaseOutput(phase: SpecPhase, filename: string): boolean {
  return SPEC_PHASE_OUTPUTS[phase].some(pattern =>
    pattern.endsWith('/*.md')
      ? filename.startsWith(pattern.slice(0, -4)) && !filename.slice(pattern.length - 4).includes('/') && filename.endsWith('.md')
      : filename === pattern,
  )
}

const DATA_LINE = /^.*donn[ée]es persistantes\s*:.*$/im
const API_LINE = /^.*api expos[ée]e\s*:.*$/im

/** Fixe les lignes `- Données persistantes : oui|non` et `- API exposée : oui|non` aux réponses de l'utilisateur. */
export function ensureConstitutionFlags(text: string, flags: { hasData: boolean; hasApi: boolean }): string {
  const dataLine = `- Données persistantes : ${flags.hasData ? 'oui' : 'non'}`
  const apiLine = `- API exposée : ${flags.hasApi ? 'oui' : 'non'}`
  let out = text.replace(/\r\n?/g, '\n')
  out = DATA_LINE.test(out) ? out.replace(DATA_LINE, dataLine) : `${out.replace(/\s*$/, '')}\n\n${dataLine}\n`
  out = API_LINE.test(out) ? out.replace(API_LINE, apiLine) : `${out.replace(/\s*$/, '')}\n${apiLine}\n`
  return out
}
