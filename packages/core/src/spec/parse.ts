import type { SpecFiles, SpecModel, SpecTask } from './types.js'

function lf(text: string | undefined): string {
  return (text ?? '').replace(/\r\n?/g, '\n')
}

/** Retire les blocs de code ``` (les exemples de format n'ont pas valeur de spec). */
export function stripCodeFences(text: string): string {
  return lf(text).replace(/```[\s\S]*?```/g, '')
}

/** `us-1` devient `US-001` ; les identifiants de plus de 3 chiffres ne sont jamais tronqués. */
export function normalizeId(raw: string): string {
  const m = /^([A-Za-z]+)-(\d+)$/.exec(raw.trim())
  if (!m) return raw.trim().toUpperCase()
  return `${m[1].toUpperCase()}-${m[2].padStart(3, '0')}`
}

const TITLE_SEP = '[—–:-]'

function parseTasks(backlog: string): SpecTask[] {
  const text = stripCodeFences(backlog)
  const heads = [...text.matchAll(/^###\s+(t-\d+)\b(.*)$/gim)]
  return heads.map((h, i) => {
    const start = h.index as number
    const end = i + 1 < heads.length ? (heads[i + 1].index as number) : text.length
    const block = text.slice(start, end).trim()
    const rest = /^\s*(\[p\])?\s*(?:[—–:-]\s*)?(.*)$/i.exec(h[2]) as RegExpExecArray
    const field = (name: string): string => {
      const m = new RegExp(`^\\s*${name}\\s*:\\s*(.*)$`, 'im').exec(block)
      return m ? m[1].trim() : ''
    }
    const ids = (value: string, pattern: string): string[] =>
      [...value.matchAll(new RegExp(pattern, 'gi'))].map(x => normalizeId(x[0]))
    return {
      id: normalizeId(h[1]),
      title: rest[2].trim(),
      parallel: !!rest[1],
      covers: ids(field('covers'), '(?:us|ac|fr|nfr)-\\d+'),
      depends: ids(field('depends'), 't-\\d+'),
      files: field('files')
        .split(',')
        .map(f => f.trim().replace(/`/g, '').replace(/\\/g, '/'))
        .filter(Boolean),
      doneWhen: field('done when'),
      block,
    }
  })
}

export function parseSpecs(files: SpecFiles): SpecModel {
  const specs = stripCodeFences(files.specs ?? '')

  const stories = [...specs.matchAll(new RegExp(`^###\\s+(us-\\d+)\\s*${TITLE_SEP}\\s*(.+?)\\s*$`, 'gim'))]
    .map(m => ({ id: normalizeId(m[1]), title: m[2] }))

  const criteria = [...specs.matchAll(/^\s*[-*]\s*(ac-\d+)\s*\(\s*(us-\d+)\s*\)\s*:\s*(.+?)\s*$/gim)]
    .map(m => ({ id: normalizeId(m[1]), storyId: normalizeId(m[2]), text: m[3] }))

  const requirements = [...specs.matchAll(/^\s*[-*]\s*((?:n?fr)-\d+)\s*:\s*(.+?)\s*$/gim)]
    .map(m => {
      const id = normalizeId(m[1])
      return { id, kind: id.startsWith('NFR') ? ('NFR' as const) : ('FR' as const), text: m[2] }
    })

  const archSections = [...stripCodeFences(files.architecture ?? '').matchAll(/^##\s+(?!#)(.+?)\s*$/gm)]
    .map(m => m[1])

  const constitution = lf(files.constitution)
  const flag = (re: RegExp): boolean => (re.exec(constitution)?.[1] ?? '').toLowerCase() === 'oui'

  return {
    stories,
    criteria,
    requirements,
    tasks: parseTasks(files.backlog ?? ''),
    archSections,
    flags: {
      hasData: flag(/donn[ée]es persistantes\s*:\s*(oui|non)/i),
      hasApi: flag(/api expos[ée]e\s*:\s*(oui|non)/i),
    },
  }
}

/** Contenu d'une section `## Titre` jusqu'à la section `## ` suivante (insensible à la casse). */
export function extractSection(text: string | undefined, heading: string): string {
  const lines = stripCodeFences(text ?? '').split('\n')
  const want = heading.trim().toLowerCase()
  const start = lines.findIndex(l => /^##\s+(?!#)/.test(l) && l.replace(/^##\s+/, '').trim().toLowerCase() === want)
  if (start === -1) return ''
  let end = lines.findIndex((l, i) => i > start && /^##\s+(?!#)/.test(l))
  if (end === -1) end = lines.length
  return lines.slice(start + 1, end).join('\n').trim()
}

/** Phrase(s) de présentation d'une story : lignes entre son titre et sa première puce ou son prochain titre. */
export function storyIntro(specs: string | undefined, storyId: string): string {
  const lines = stripCodeFences(specs ?? '').split('\n')
  const start = lines.findIndex(l => new RegExp('^###\\s+' + storyId + '\\b', 'i').test(l))
  if (start === -1) return ''
  const body: string[] = []
  for (const l of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(l) || /^\s*[-*]\s/.test(l)) break
    body.push(l)
  }
  return body.join('\n').trim()
}
