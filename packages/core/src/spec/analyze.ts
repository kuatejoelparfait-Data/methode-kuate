import { parseSpecs, stripCodeFences } from './parse.js'
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

const PLACEHOLDER = /(?<![\p{L}\p{N}])(?:TBD|TODO|à définir|a définir)(?![\p{L}\p{N}])|\?\?\?/iu
const MARKER = /\[NEEDS CLARIFICATION/i

const blank = (text: string | undefined): boolean => !text || text.trim().length === 0

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
    const clean = stripCodeFences(text as string)
    if (MARKER.test(clean)) add('G1', 'error', phase, file, 'Marqueur [NEEDS CLARIFICATION] non résolu (kuate spec clarify).')
    if (PLACEHOLDER.test(clean)) add('G1', 'error', phase, file, 'Texte provisoire restant (TBD, TODO, « à définir » ou ???).')
  }

  // G8 — identifiants en double
  const dupes = (ids: string[]): string[] => ids.filter((id, i) => ids.indexOf(id) !== i)
  for (const id of new Set(dupes(model.stories.map(s => s.id)))) add('G8', 'error', 'K', SPEC_PATHS.specs, `Identifiant ${id} défini plusieurs fois.`, id)
  for (const id of new Set(dupes(model.criteria.map(c => c.id)))) add('G8', 'error', 'K', SPEC_PATHS.specs, `Identifiant ${id} défini plusieurs fois.`, id)
  for (const id of new Set(dupes(model.tasks.map(t => t.id)))) add('G8', 'error', 'U', SPEC_PATHS.backlog, `Identifiant ${id} défini plusieurs fois.`, id)

  // G2 — chaque story a au moins un critère
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
