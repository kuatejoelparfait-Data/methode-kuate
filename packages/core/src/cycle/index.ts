import path from 'node:path'
import fs from 'fs-extra'
import type { Phase } from '../types.js'
import { readSpecFiles } from '../spec/files.js'
import { analyzeSpecs, issuesForPhase } from '../spec/analyze.js'

// ── Constantes du cycle KUATE ────────────────────────────────────────────────

export const CYCLE_PHASES: Phase[] = ['K', 'U', 'A', 'T', 'E']

export const CYCLE_PHASE_NAMES: Record<Phase, string> = {
  K: 'Knower',
  U: 'Unifier',
  A: 'Architect',
  T: 'Transformer',
  E: 'Evaluator',
}

/** Document produit par chaque phase (T produit du code, pas un document unique). */
export const PHASE_DOCS: Record<Exclude<Phase, 'T'>, string> = {
  K: 'docs/specs.md',
  U: 'docs/backlog.md',
  A: 'docs/architecture.md',
  E: 'docs/evaluation.md',
}

export const CODE_DIRS = ['src', 'app', 'lib', 'server', 'api']

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage'])
const WALK_LIMIT = 3000
const STALE_TOLERANCE_MS = 2000

// ── État persistant (.kuate/cycle.json) ──────────────────────────────────────

export type PhaseOverride = 'skipped' | 'validated'

export interface CycleNote {
  date: string
  text: string
}

export interface HistoryEntry {
  date: string
  agentId: string
  task: string
  phase: string
}

export interface CycleState {
  version: 1
  /** Décisions manuelles : phase sautée ou validée (jamais considérée périmée). */
  overrides: Partial<Record<Phase, PhaseOverride>>
  /** Notes d'ajustement transmises aux agents. */
  notes: CycleNote[]
  /** Actions réalisées via kuate next / kuate projet (évite les suggestions répétées). */
  history: HistoryEntry[]
}

const HISTORY_CAP = 200
const NOTES_CAP = 50

export function cycleStatePath(cwd: string): string {
  return path.join(cwd, '.kuate', 'cycle.json')
}

function emptyState(): CycleState {
  return { version: 1, overrides: {}, notes: [], history: [] }
}

export async function readCycle(cwd: string): Promise<CycleState> {
  const file = cycleStatePath(cwd)
  if (!fs.existsSync(file)) return emptyState()
  try {
    const raw = JSON.parse(await fs.readFile(file, 'utf-8')) as Partial<CycleState>
    const overrides: CycleState['overrides'] = {}
    for (const ph of CYCLE_PHASES) {
      const o = raw.overrides?.[ph]
      if (o === 'skipped' || o === 'validated') overrides[ph] = o
    }
    return {
      version: 1,
      overrides,
      notes: Array.isArray(raw.notes) ? raw.notes : [],
      history: Array.isArray(raw.history) ? raw.history : [],
    }
  } catch {
    return emptyState()
  }
}

export async function writeCycle(cwd: string, state: CycleState): Promise<void> {
  await fs.ensureDir(path.dirname(cycleStatePath(cwd)))
  await fs.writeFile(cycleStatePath(cwd), JSON.stringify(state, null, 2), 'utf-8')
}

export async function setPhaseOverride(cwd: string, phase: Phase, override: PhaseOverride | null): Promise<void> {
  const state = await readCycle(cwd)
  if (override) state.overrides[phase] = override
  else delete state.overrides[phase]
  await writeCycle(cwd, state)
}

export async function addCycleNote(cwd: string, text: string): Promise<void> {
  const state = await readCycle(cwd)
  state.notes.push({ date: new Date().toISOString(), text: text.trim() })
  state.notes = state.notes.slice(-NOTES_CAP)
  await writeCycle(cwd, state)
}

export async function recordHistory(cwd: string, entry: Omit<HistoryEntry, 'date'>): Promise<void> {
  const state = await readCycle(cwd)
  state.history.push({ date: new Date().toISOString(), ...entry })
  state.history = state.history.slice(-HISTORY_CAP)
  await writeCycle(cwd, state)
}

// ── Calcul du statut ─────────────────────────────────────────────────────────

export type PhaseStatusKind = 'todo' | 'done' | 'stale' | 'skipped' | 'validated'

export interface PhaseStatus {
  phase: Phase
  name: string
  status: PhaseStatusKind
  /** Document (ou dossiers de code pour T). */
  artifact?: string
  /** Dernière modification de l'artefact (ISO). */
  modifiedAt?: string
  /** Si périmée : phase amont modifiée plus récemment. */
  staleBecause?: Phase
  /** Porte de complétude du paquet de specs (K, U, A) quand le document de la phase existe. */
  gate?: { errors: number; warnings: number }
}

export interface CycleStatus {
  phases: PhaseStatus[]
  issues: string[]
  /** Prochaine phase à traiter (todo ou périmée), null si tout est à jour. */
  next: Phase | null
}

async function newestMtime(dir: string): Promise<number> {
  let newest = 0
  let seen = 0
  const stack = [dir]
  while (stack.length > 0 && seen < WALK_LIMIT) {
    const current = stack.pop() as string
    let entries: fs.Dirent[]
    try {
      entries = await fs.readdir(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (++seen > WALK_LIMIT) break
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) stack.push(path.join(current, entry.name))
        continue
      }
      try {
        const m = (await fs.stat(path.join(current, entry.name))).mtimeMs
        if (m > newest) newest = m
      } catch { /* fichier disparu : ignoré */ }
    }
  }
  // Dossier vide : on retombe sur sa propre date.
  return newest > 0 ? newest : (await fs.stat(dir)).mtimeMs
}

async function probeArtifact(cwd: string, phase: Phase): Promise<{ artifact?: string; mtime?: number }> {
  if (phase === 'T') {
    const dirs = CODE_DIRS.filter(d => fs.existsSync(path.join(cwd, d)))
    if (dirs.length === 0) return {}
    const times = await Promise.all(dirs.map(d => newestMtime(path.join(cwd, d))))
    return { artifact: dirs.join(', '), mtime: Math.max(...times) }
  }
  const rel = PHASE_DOCS[phase]
  const abs = path.join(cwd, rel)
  if (!fs.existsSync(abs)) return {}
  return { artifact: rel, mtime: (await fs.stat(abs)).mtimeMs }
}

export async function computeCycleStatus(cwd: string, stateArg?: CycleState): Promise<CycleStatus> {
  const state = stateArg ?? await readCycle(cwd)
  const probes = await Promise.all(CYCLE_PHASES.map(ph => probeArtifact(cwd, ph)))

  // Porte de complétude : seulement si un document K, U ou A existe.
  const hasSpecDoc = probes.some((pr, i) => pr.artifact !== undefined && CYCLE_PHASES[i] !== 'T' && CYCLE_PHASES[i] !== 'E')
  const analysis = hasSpecDoc ? analyzeSpecs(await readSpecFiles(cwd)) : null

  const phases: PhaseStatus[] = []
  const issues: string[] = []

  CYCLE_PHASES.forEach((phase, i) => {
    const { artifact, mtime } = probes[i]
    const base: PhaseStatus = {
      phase,
      name: CYCLE_PHASE_NAMES[phase],
      status: 'todo',
      artifact,
      modifiedAt: mtime ? new Date(mtime).toISOString() : undefined,
    }
    if (analysis && artifact !== undefined && (phase === 'K' || phase === 'U' || phase === 'A')) {
      const list = issuesForPhase(analysis, phase)
      base.gate = {
        errors: list.filter(x => x.severity === 'error').length,
        warnings: list.filter(x => x.severity === 'warning').length,
      }
    }
    const override = state.overrides[phase]

    if (override === 'skipped') { phases.push({ ...base, status: 'skipped' }); return }
    if (override === 'validated') { phases.push({ ...base, status: 'validated' }); return }
    if (mtime === undefined) { phases.push(base); return }

    // Périmée : une phase amont a été modifiée après cet artefact.
    let staleBecause: Phase | undefined
    let latest = mtime + STALE_TOLERANCE_MS
    for (let j = 0; j < i; j++) {
      const upstream = probes[j].mtime
      if (upstream !== undefined && upstream > latest) {
        latest = upstream
        staleBecause = CYCLE_PHASES[j]
      }
    }
    phases.push(staleBecause ? { ...base, status: 'stale', staleBecause } : { ...base, status: 'done' })
  })

  // Incohérences : phase produite alors qu'une phase amont (non sautée) n'existe pas.
  phases.forEach((ps, i) => {
    if (ps.artifact === undefined || ps.status === 'skipped') return
    const missing = phases.slice(0, i).find(up => up.status === 'todo')
    if (missing) {
      issues.push(`Phase ${ps.phase} (${ps.artifact}) présente alors que la phase ${missing.phase} (${missing.name}) n'a pas été faite.`)
    }
  })
  for (const ps of phases) {
    if (ps.status === 'stale' && ps.staleBecause) {
      issues.push(`Phase ${ps.phase} périmée : la phase ${ps.staleBecause} a été modifiée après.`)
    }
  }

  const next = phases.find(ps => ps.status === 'todo' || ps.status === 'stale')?.phase ?? null
  return { phases, issues, next }
}

// ── Sauvegardes ──────────────────────────────────────────────────────────────

function timestamp(): string {
  return new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
}

/** Copie un fichier du projet dans .kuate/backups/ avant écrasement. Retourne le chemin ou null. */
export async function backupFile(cwd: string, relPath: string): Promise<string | null> {
  const abs = path.join(cwd, relPath)
  if (!fs.existsSync(abs) || !(await fs.stat(abs)).isFile()) return null
  const dest = path.join(cwd, '.kuate', 'backups', `${timestamp()}-${relPath.replace(/[\\/]/g, '__')}`)
  await fs.ensureDir(path.dirname(dest))
  await fs.copyFile(abs, dest)
  return path.relative(cwd, dest)
}

/** Sauvegarde le document d'une phase (rien pour T : le code est géré par git). */
export async function backupPhaseArtifact(cwd: string, phase: Phase): Promise<string | null> {
  if (phase === 'T') return null
  return backupFile(cwd, PHASE_DOCS[phase])
}

// ── Résumé pour les prompts IA ───────────────────────────────────────────────

const STATUS_LABELS: Record<PhaseStatusKind, string> = {
  todo: 'à faire',
  done: 'produite',
  stale: 'PÉRIMÉE (à mettre à jour)',
  skipped: 'sautée volontairement (ne pas proposer)',
  validated: 'validée manuellement',
}

export function statusLabel(kind: PhaseStatusKind): string {
  return STATUS_LABELS[kind]
}

export function formatCycleSummary(status: CycleStatus, state: CycleState): string {
  const lines = status.phases.map(ps => {
    const where = ps.artifact ? ` — ${ps.artifact}` : ''
    const gate = ps.gate
      ? ps.gate.errors > 0 ? ` — porte : ${ps.gate.errors} erreur(s) (kuate spec analyze)` : ' — porte : complète'
      : ''
    return `- ${ps.phase} ${ps.name} : ${STATUS_LABELS[ps.status]}${where}${gate}`
  })
  if (status.issues.length > 0) {
    lines.push('', 'Incohérences détectées :', ...status.issues.map(i => `- ${i}`))
  }
  const notes = state.notes.slice(-5)
  if (notes.length > 0) {
    lines.push('', "Notes d'ajustement de l'utilisateur :", ...notes.map(n => `- ${n.text}`))
  }
  return lines.join('\n')
}

export function formatHistory(state: CycleState, limit = 15): string {
  return state.history
    .slice(-limit)
    .map(h => `- [${h.phase}] ${h.agentId} : ${h.task}`)
    .join('\n')
}

// ── Suggestions de secours (sans IA) ─────────────────────────────────────────

export interface CycleSuggestion {
  agentId: string
  task: string
  phase: string
  reason: string
}

export interface CycleAgentInfo {
  id: string
  name: string
  phase: string
  description: string
}

/** Suggestions déterministes basées sur la prochaine phase à traiter. */
export function fallbackSuggestions(status: CycleStatus, agents: CycleAgentInfo[]): CycleSuggestion[] {
  if (!status.next) return []
  const target = status.phases.find(ps => ps.phase === status.next) as PhaseStatus
  const reason = target.status === 'stale'
    ? `Phase ${target.phase} périmée : à mettre à jour`
    : `Phase ${target.phase} (${target.name}) pas encore faite`
  return agents
    .filter(a => a.phase === target.phase)
    .slice(0, 3)
    .map(a => ({
      agentId: a.id,
      task: `${target.status === 'stale' ? 'Mettre à jour' : 'Démarrer'} la phase ${target.phase} : ${a.description || a.name}`,
      phase: target.phase,
      reason,
    }))
}
