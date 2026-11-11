import { describe, it, expect, beforeEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import {
  computeCycleStatus,
  readCycle,
  setPhaseOverride,
  addCycleNote,
  recordHistory,
  backupPhaseArtifact,
  backupFile,
  fallbackSuggestions,
  formatCycleSummary,
} from './index.js'

describe('cycle KUATE', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'kuate-cycle-'))
  })

  const write = async (rel: string, ageSeconds: number) => {
    const abs = path.join(cwd, rel)
    await fs.outputFile(abs, `# ${rel}\n`)
    const t = new Date(Date.now() - ageSeconds * 1000)
    await fs.utimes(abs, t, t)
  }
  const statusOf = async (phase: string) =>
    (await computeCycleStatus(cwd)).phases.find(p => p.phase === phase)!

  it('projet vide : tout est à faire, prochaine phase K', async () => {
    const s = await computeCycleStatus(cwd)
    expect(s.phases.map(p => p.status)).toEqual(['todo', 'todo', 'todo', 'todo', 'todo'])
    expect(s.next).toBe('K')
    expect(s.issues).toEqual([])
  })

  it('documents à jour : done, prochaine phase = première manquante', async () => {
    await write('docs/specs.md', 300)
    await write('docs/backlog.md', 200)
    const s = await computeCycleStatus(cwd)
    expect((await statusOf('K')).status).toBe('done')
    expect((await statusOf('U')).status).toBe('done')
    expect(s.next).toBe('A')
  })

  it('phase aval périmée quand la phase amont est modifiée après', async () => {
    await write('docs/backlog.md', 300)
    await write('docs/specs.md', 10)
    const u = await statusOf('U')
    expect(u.status).toBe('stale')
    expect(u.staleBecause).toBe('K')
    expect((await computeCycleStatus(cwd)).next).toBe('U')
  })

  it('validée : jamais périmée', async () => {
    await write('docs/backlog.md', 300)
    await write('docs/specs.md', 10)
    await setPhaseOverride(cwd, 'U', 'validated')
    expect((await statusOf('U')).status).toBe('validated')
  })

  it('sautée : ignorée dans le calcul de la prochaine phase', async () => {
    await setPhaseOverride(cwd, 'K', 'skipped')
    const s = await computeCycleStatus(cwd)
    expect((await statusOf('K')).status).toBe('skipped')
    expect(s.next).toBe('U')
  })

  it('rouvrir efface la décision', async () => {
    await setPhaseOverride(cwd, 'K', 'skipped')
    await setPhaseOverride(cwd, 'K', null)
    expect((await statusOf('K')).status).toBe('todo')
  })

  it('incohérence : backlog sans specs', async () => {
    await write('docs/backlog.md', 100)
    const s = await computeCycleStatus(cwd)
    expect(s.issues.some(i => i.includes('Phase U') && i.includes('phase K'))).toBe(true)
  })

  it('phase T détectée par la présence de code', async () => {
    await write('src/index.ts', 100)
    expect((await statusOf('T')).status).toBe('done')
    expect((await statusOf('T')).artifact).toBe('src')
  })

  it('code plus ancien que l\'architecture : T périmée', async () => {
    await write('src/index.ts', 500)
    await write('docs/architecture.md', 10)
    expect((await statusOf('T')).status).toBe('stale')
  })

  it('notes et historique persistent', async () => {
    await addCycleNote(cwd, 'Cibler uniquement le MVP')
    await recordHistory(cwd, { agentId: 'dev-senior', task: 'auth', phase: 'T' })
    const state = await readCycle(cwd)
    expect(state.notes[0].text).toBe('Cibler uniquement le MVP')
    expect(state.history[0]).toMatchObject({ agentId: 'dev-senior', phase: 'T' })
  })

  it('état corrompu : retombe sur un état vide', async () => {
    await fs.outputFile(path.join(cwd, '.kuate', 'cycle.json'), '{pas du json')
    const state = await readCycle(cwd)
    expect(state.notes).toEqual([])
    expect(state.overrides).toEqual({})
  })

  it('backup : copie le document, rien pour T ni fichier absent', async () => {
    await write('docs/specs.md', 10)
    const dest = await backupPhaseArtifact(cwd, 'K')
    expect(dest).toMatch(/\.kuate[\\/]backups[\\/].*docs__specs\.md$/)
    expect(await fs.pathExists(path.join(cwd, dest!))).toBe(true)
    expect(await backupPhaseArtifact(cwd, 'T')).toBeNull()
    expect(await backupFile(cwd, 'docs/inexistant.md')).toBeNull()
  })

  it('suggestions de secours : agents de la prochaine phase', async () => {
    const status = await computeCycleStatus(cwd)
    const out = fallbackSuggestions(status, [
      { id: 'business-analyst', name: 'BA', phase: 'K', description: 'user stories' },
      { id: 'dev-senior', name: 'Dev', phase: 'T', description: 'code' },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].agentId).toBe('business-analyst')
    expect(fallbackSuggestions({ phases: status.phases, issues: [], next: null }, [])).toEqual([])
  })

  it('résumé pour prompt : inclut statuts et notes', async () => {
    await addCycleNote(cwd, 'Pas de mobile')
    const state = await readCycle(cwd)
    const text = formatCycleSummary(await computeCycleStatus(cwd, state), state)
    expect(text).toContain('K Knower : à faire')
    expect(text).toContain('Pas de mobile')
  })
})
