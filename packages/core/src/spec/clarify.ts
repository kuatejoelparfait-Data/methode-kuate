// Un marqueur : [NEEDS CLARIFICATION: question] — insensible à la casse, espace avant « : » toléré,
// question vide tolérée, un niveau de crochets imbriqués autorisé dans la question.
const MARKER = /\[\s*NEEDS\s+CLARIFICATION\s*:?\s*((?:[^[\]]|\[[^[\]]*\])*)\]/gi
const MARKER_START = /\[\s*NEEDS\s+CLARIFICATION/gi
const FENCE_SPLIT = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/

export interface ClarificationMarker {
  question: string
  /** Texte exact du marqueur, à passer à applyClarification. */
  raw: string
  /** Ligne (1-indexée) du marqueur dans le texte normalisé (fins de ligne en \n). */
  line: number
}

function normalize(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

/** Marqueurs ouverts hors blocs de code. */
export function findMarkers(text: string): ClarificationMarker[] {
  const found: ClarificationMarker[] = []
  let offset = 0
  normalize(text).split(FENCE_SPLIT).forEach((segment, i) => {
    if (i % 2 === 0) {
      for (const m of segment.matchAll(MARKER)) {
        const before = offset + (m.index as number)
        found.push({
          question: m[1].trim() || '(question non précisée)',
          raw: m[0],
          line: normalize(text).slice(0, before).split('\n').length,
        })
      }
    }
    offset += segment.length
  })
  return found
}

/** Nombre de débuts de marqueur hors blocs de code (même mal refermés). */
export function countMarkerStarts(text: string): number {
  let n = 0
  normalize(text).split(FENCE_SPLIT).forEach((segment, i) => {
    if (i % 2 === 0) n += [...segment.matchAll(MARKER_START)].length
  })
  return n
}

/** Remplace la première occurrence du marqueur (hors bloc de code) par la réponse. Renvoie le texte normalisé (\n). */
export function applyClarification(text: string, raw: string, answer: string): string {
  const segments = normalize(text).split(FENCE_SPLIT)
  for (let i = 0; i < segments.length; i += 2) {
    const at = segments[i].indexOf(raw)
    if (at !== -1) {
      segments[i] = segments[i].slice(0, at) + answer + segments[i].slice(at + raw.length)
      break
    }
  }
  return segments.join('')
}

export function appendClarification(
  existing: string | undefined,
  entry: { date: string; file: string; question: string; answer: string },
): string {
  const base = existing && existing.trim() ? existing.replace(/\s*$/, '\n') : '# Clarifications\n'
  return `${base}\n## ${entry.date} — ${entry.file}\n- Question : ${entry.question}\n- Réponse : ${entry.answer}\n`
}
