import { parseSpecs, stripCodeFences } from './parse.js'
import { findMarkers, countMarkerStarts } from './clarify.js'
import { orderTasks } from './order.js'
import { SPEC_PATHS } from './files.js'
import type { SpecFiles, SpecPhase } from './types.js'

export interface SpecIssue {
  rule: string
  severity: 'error' | 'warning'
  phase: SpecPhase
  file: string
  id?: string
  message: string
}

export interface TraceRow {
  storyId: string
  criterionId?: string
  taskIds: string[]
  files: string[]
}

export interface SpecAnalysis {
  issues: SpecIssue[]
  trace: TraceRow[]
}

export const REQUIRED_ARCH_SECTIONS = [
  'Stack',
  'Structure des dossiers',
  'Conventions',
  "Variables d'environnement",
  'Décisions',
]

const PLACEHOLDER_WORD = /(?<![\p{L}\p{N}_./:-])(?:TBD|TODO)(?![\p{L}\p{N}_/-])/u

const blank = (text: string | undefined): boolean => !text || text.trim().length === 0

/** Remplace les blocs de code par des lignes vides (numéros de ligne conservés) et retire le code en ligne. */
function maskFences(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, m => '\n'.repeat(m.split('\n').length - 1))
}

function isPlaceholderValue(line: string): boolean {
  const noBullet = line.trim().replace(/^[-*+]\s+/, '')
  const value = noBullet.includes(':') ? noBullet.slice(noBullet.indexOf(':') + 1).trim() : noBullet
  const only = /^(?:à|a) définir[.!)]*$/i
  return only.test(value) || only.test(noBullet)
}

/** Premier texte provisoire (TBD, TODO, « à définir » seul, ???) hors code, avec sa ligne. */
function findPlaceholder(text: string): { line: number; excerpt: string } | null {
  const lines = maskFences(text).split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/`[^`\n]*`/g, '')
    if (PLACEHOLDER_WORD.test(line) || line.includes('???') || isPlaceholderValue(line)) {
      return { line: i + 1, excerpt: lines[i].trim().slice(0, 80) }
    }
  }
  return null
}

const DECORATED_ID = /^\s*(?:#{1,6}\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+|\*\*)\**\s*((?:US|AC|T)-\d+)/i
const VALID_LINE: Record<'US' | 'AC' | 'T', RegExp> = {
  US: /^###\s+us-\d+\s*[—–:-]\s*\S/i,
  AC: /^\s*[-*]\s*ac-\d+\s*\(\s*us-\d+\s*\)\s*:\s*\S/i,
  T: /^###\s+t-\d+\b/i,
}
const EXPECTED_FORMAT: Record<'US' | 'AC' | 'T', string> = {
  US: '### US-001 — Titre',
  AC: '- AC-001 (US-001) : Étant donné …, quand …, alors …',
  T: '### T-001 — Titre',
}

/** Lignes qui commencent comme une définition d'identifiant (titre, puce, gras) sans respecter le format. */
function malformedIdLines(text: string, kinds: Array<'US' | 'AC' | 'T'>): Array<{ line: number; excerpt: string; kind: 'US' | 'AC' | 'T' }> {
  const out: Array<{ line: number; excerpt: string; kind: 'US' | 'AC' | 'T' }> = []
  maskFences(text).split('\n').forEach((raw, i) => {
    const m = DECORATED_ID.exec(raw)
    if (!m) return
    const kind = m[1].split('-')[0].toUpperCase() as 'US' | 'AC' | 'T'
    if (kinds.includes(kind) && !VALID_LINE[kind].test(raw)) out.push({ line: i + 1, excerpt: raw.trim().slice(0, 80), kind })
  })
  return out
}

export function analyzeSpecs(files: SpecFiles): SpecAnalysis {
  const model = parseSpecs(files)
  const issues: SpecIssue[] = []
  const add = (
    rule: string,
    severity: SpecIssue['severity'],
    phase: SpecPhase,
    file: string,
    message: string,
    id?: string,
  ): void => { issues.push({ rule, severity, phase, file, message, ...(id ? { id } : {}) }) }

  // G0 — documents absents ou vides
  const required: Array<[SpecPhase, string, string | undefined]> = [
    ['K', SPEC_PATHS.specs, files.specs],
    ['U', SPEC_PATHS.backlog, files.backlog],
    ['A', SPEC_PATHS.architecture, files.architecture],
  ]
  for (const [phase, file, text] of required) {
    if (blank(text)) add('G0', 'error', phase, file, `${file} est absent ou vide.`)
  }

  // G1 — ambiguïtés restantes
  const scanned: Array<[SpecPhase, string, string | undefined]> = [
    ['K', SPEC_PATHS.constitution, files.constitution],
    ['K', SPEC_PATHS.specs, files.specs],
    ['U', SPEC_PATHS.backlog, files.backlog],
    ['A', SPEC_PATHS.architecture, files.architecture],
    ['A', SPEC_PATHS.dataModel, files.dataModel],
    ...Object.entries(files.contracts).map(([p, t]): [SpecPhase, string, string] => ['A', p, t]),
  ]
  for (const [phase, file, text] of scanned) {
    if (blank(text)) continue
    const source = text as string
    const markers = findMarkers(source)
    if (markers.length > 0) {
      add('G1', 'error', phase, file, `Marqueur [NEEDS CLARIFICATION] non résolu à la ligne ${markers[0].line} (${markers.length} au total ; kuate spec clarify).`)
    }
    if (countMarkerStarts(source) > markers.length) {
      add('G1', 'error', phase, file, 'Marqueur [NEEDS CLARIFICATION] mal formé (crochet non refermé) : corrigez-le à la main.')
    }
    const placeholder = findPlaceholder(source)
    if (placeholder) {
      add('G1', 'error', phase, file, `Texte provisoire (TBD, TODO, « à définir » ou ???) à la ligne ${placeholder.line} : « ${placeholder.excerpt} ».`)
    }
  }

  // G9 — lignes d'identifiants hors format (sinon elles seraient ignorées sans bruit)
  const g9: Array<[SpecPhase, string, string | undefined, Array<'US' | 'AC' | 'T'>]> = [
    ['K', SPEC_PATHS.specs, files.specs, ['US', 'AC']],
    ['U', SPEC_PATHS.backlog, files.backlog, ['T']],
  ]
  for (const [phase, file, text, kinds] of g9) {
    if (blank(text)) continue
    for (const bad of malformedIdLines(text as string, kinds)) {
      add('G9', 'error', phase, file, `Ligne ${bad.line} : « ${bad.excerpt} » ressemble à une définition d'identifiant mais n'a pas le format attendu (${EXPECTED_FORMAT[bad.kind]}).`)
    }
  }

  // G8 — identifiants en double
  const dupes = (ids: string[]): string[] => ids.filter((id, i) => ids.indexOf(id) !== i)
  for (const id of new Set(dupes(model.stories.map(s => s.id)))) add('G8', 'error', 'K', SPEC_PATHS.specs, `Identifiant ${id} défini plusieurs fois.`, id)
  for (const id of new Set(dupes(model.criteria.map(c => c.id)))) add('G8', 'error', 'K', SPEC_PATHS.specs, `Identifiant ${id} défini plusieurs fois.`, id)
  for (const id of new Set(dupes(model.tasks.map(t => t.id)))) add('G8', 'error', 'U', SPEC_PATHS.backlog, `Identifiant ${id} défini plusieurs fois.`, id)

  // G2 — chaque story a au moins un critère (et il y a au moins une story)
  if (!blank(files.specs) && model.stories.length === 0) {
    add('G2', 'error', 'K', SPEC_PATHS.specs, 'Aucune story (### US-001 — Titre) trouvée dans le document.')
  }
  for (const s of model.stories) {
    if (!model.criteria.some(c => c.storyId === s.id)) {
      add('G2', 'error', 'K', SPEC_PATHS.specs, `${s.id} n'a aucun critère d'acceptation.`, s.id)
    }
  }

  // G3 / G4 — couverture par les tâches
  const covered = new Set(model.tasks.flatMap(t => t.covers))
  for (const s of model.stories) {
    const acs = model.criteria.filter(c => c.storyId === s.id)
    if (!covered.has(s.id) && !acs.some(c => covered.has(c.id))) {
      add('G3', 'error', 'U', SPEC_PATHS.backlog, `${s.id} n'est couverte par aucune tâche.`, s.id)
    }
  }
  for (const c of model.criteria) {
    if (!covered.has(c.id)) add('G4', 'error', 'U', SPEC_PATHS.backlog, `${c.id} n'est couvert par aucune tâche.`, c.id)
  }

  // G5 — tâches complètes et références valides
  const knownRefs = new Set([
    ...model.stories.map(s => s.id),
    ...model.criteria.map(c => c.id),
    ...model.requirements.map(r => r.id),
  ])
  if (!blank(files.backlog) && model.tasks.length === 0) {
    add('G5', 'error', 'U', SPEC_PATHS.backlog, 'Aucune tâche (### T-001 — Titre) trouvée dans le document.')
  }
  for (const t of model.tasks) {
    if (t.covers.length === 0) add('G5', 'error', 'U', SPEC_PATHS.backlog, `${t.id} n'a pas de ligne Covers.`, t.id)
    if (t.files.length === 0) add('G5', 'error', 'U', SPEC_PATHS.backlog, `${t.id} n'a pas de ligne Files.`, t.id)
    if (!t.doneWhen) add('G5', 'error', 'U', SPEC_PATHS.backlog, `${t.id} n'a pas de critère « Done when ».`, t.id)
    for (const ref of t.covers.filter(r => !knownRefs.has(r))) {
      add('G5', 'error', 'U', SPEC_PATHS.backlog, `${t.id} référence ${ref}, qui n'existe pas.`, t.id)
    }
  }

  // G6 — dépendances
  const taskIds = new Set(model.tasks.map(t => t.id))
  for (const t of model.tasks) {
    for (const d of t.depends.filter(x => !taskIds.has(x))) {
      add('G6', 'error', 'U', SPEC_PATHS.backlog, `${t.id} dépend de ${d}, qui n'existe pas.`, t.id)
    }
  }
  const order = orderTasks(model.tasks)
  if (order.cycle) add('G6', 'error', 'U', SPEC_PATHS.backlog, `Cycle de dépendances entre ${order.cycle.join(', ')}.`)

  // G7 — architecture
  if (!blank(files.architecture)) {
    const have = new Set(model.archSections.map(s => s.toLowerCase()))
    for (const section of REQUIRED_ARCH_SECTIONS) {
      if (!have.has(section.toLowerCase())) {
        add('G7', 'error', 'A', SPEC_PATHS.architecture, `Section « ## ${section} » manquante.`)
      }
    }
  }
  if (model.flags.hasData && blank(files.dataModel)) {
    add('G7', 'error', 'A', SPEC_PATHS.dataModel, `${SPEC_PATHS.dataModel} requis (la constitution déclare des données persistantes).`)
  }
  if (model.flags.hasApi && Object.keys(files.contracts).length === 0) {
    add('G7', 'error', 'A', SPEC_PATHS.contractsDir, `${SPEC_PATHS.contractsDir}/ requis (la constitution déclare une API exposée).`)
  }

  // Avertissements
  if (blank(files.constitution)) {
    add('W2', 'warning', 'K', SPEC_PATHS.constitution, `${SPEC_PATHS.constitution} absente (kuate spec constitution).`)
  }
  const archText = stripCodeFences(files.architecture ?? '')
  for (const t of model.tasks) {
    const strays = t.files.filter(f => {
      const dir = f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : ''
      return dir !== '' && !archText.includes(dir)
    })
    if (strays.length > 0) {
      add('W1', 'warning', 'U', SPEC_PATHS.backlog, `${t.id} : ${strays.join(', ')} hors des dossiers cités dans l'architecture.`, t.id)
    }
  }
  for (const r of model.requirements.filter(x => x.kind === 'NFR' && !covered.has(x.id))) {
    add('W3', 'warning', 'U', SPEC_PATHS.backlog, `${r.id} n'est couvert par aucune tâche.`, r.id)
  }

  // Traçabilité : une ligne par critère (ou par story sans critère)
  const trace: TraceRow[] = []
  for (const s of model.stories) {
    const acs = model.criteria.filter(c => c.storyId === s.id)
    const rows = acs.length > 0 ? acs.map(c => c.id) : [undefined]
    for (const criterionId of rows) {
      const ref = criterionId ?? s.id
      const tasks = model.tasks.filter(t => t.covers.includes(ref))
      trace.push({
        storyId: s.id,
        ...(criterionId ? { criterionId } : {}),
        taskIds: tasks.map(t => t.id),
        files: [...new Set(tasks.flatMap(t => t.files))],
      })
    }
  }

  return { issues, trace }
}

export function issuesForPhase(a: SpecAnalysis, phase: SpecPhase): SpecIssue[] {
  return a.issues.filter(i => i.phase === phase)
}

export function renderAnalysisReport(a: SpecAnalysis, project: string): string {
  const errors = a.issues.filter(i => i.severity === 'error')
  const warnings = a.issues.filter(i => i.severity === 'warning')
  const line = (i: SpecIssue): string => `- [${i.rule}] ${i.id ? `${i.id} — ` : ''}${i.message} (${i.file})`
  return [
    `# Analyse du paquet de specs — ${project}`,
    '',
    `## Erreurs (${errors.length})`,
    ...(errors.length ? errors.map(line) : ['Aucune.']),
    '',
    `## Avertissements (${warnings.length})`,
    ...(warnings.length ? warnings.map(line) : ['Aucun.']),
    '',
    '## Matrice de traçabilité',
    '',
    '| Story | Critère | Tâches | Fichiers |',
    '|---|---|---|---|',
    ...a.trace.map(r => `| ${r.storyId} | ${r.criterionId ?? '—'} | ${r.taskIds.join(', ') || '—'} | ${r.files.join(', ') || '—'} |`),
    '',
  ].join('\n')
}
