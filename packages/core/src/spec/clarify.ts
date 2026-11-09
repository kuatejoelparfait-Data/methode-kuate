const MARKER = /\[NEEDS CLARIFICATION:\s*([^\]]+?)\s*\]/g
const FENCE_SPLIT = /(```[\s\S]*?```)/

export interface ClarificationMarker {
  question: string
  /** Texte exact du marqueur, à passer à applyClarification. */
  raw: string
}

/** Marqueurs ouverts hors blocs de code. */
export function findMarkers(text: string): ClarificationMarker[] {
  const found: ClarificationMarker[] = []
  text.replace(/\r\n?/g, '\n').split(FENCE_SPLIT).forEach((segment, i) => {
    if (i % 2 === 1) return
    for (const m of segment.matchAll(MARKER)) found.push({ question: m[1], raw: m[0] })
  })
  return found
}

/** Remplace la première occurrence du marqueur (hors bloc de code) par la réponse. */
export function applyClarification(text: string, raw: string, answer: string): string {
  const segments = text.split(FENCE_SPLIT)
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
