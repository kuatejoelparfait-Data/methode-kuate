import { describe, it, expect } from 'vitest'
import { EXPORT_FILES, buildImplementGuide, buildToolInstructions } from './export.js'
import { STORY_RULE } from './stories.js'
import { completeFiles } from './fixtures.js'

describe('buildImplementGuide', () => {
  it('liste les tâches par groupes selon les dépendances', () => {
    const guide = buildImplementGuide(completeFiles(), 'Facturo')
    const g1 = guide.indexOf('Groupe 1')
    const g2 = guide.indexOf('Groupe 2')
    expect(g1).toBeGreaterThan(-1)
    expect(g2).toBeGreaterThan(g1)
    expect(guide.slice(g1, g2)).toContain('T-001')
    expect(guide.slice(g2)).toContain('T-002')
    expect(guide.slice(g2)).toContain('T-003')
  })

  it('marque les tâches parallélisables et renvoie vers leur fichier', () => {
    const guide = buildImplementGuide(completeFiles(), 'Facturo')
    expect(guide).toMatch(/T-002[^\n]*\(parallélisable\)/)
    expect(guide).not.toMatch(/T-001[^\n]*\(parallélisable\)/)
    expect(guide).toContain('docs/stories/T-001.md')
  })

  it('signale les tâches non ordonnables en cas de cycle', () => {
    const files = completeFiles()
    files.backlog = (files.backlog as string).replace('### T-001 — Authentification\n', '### T-001 — Authentification\nDepends: T-002\n')
    expect(buildImplementGuide(files, 'Facturo')).toContain('cycle')
  })
})

describe('buildToolInstructions', () => {
  it('contient constitution, consigne de tâche et renvois', () => {
    for (const target of ['claude', 'copilot', 'cursor', 'agents'] as const) {
      const text = buildToolInstructions(target, completeFiles(), 'Facturo')
      expect(text).toContain('Constitution — Facturo')
      expect(text).toContain(STORY_RULE)
      expect(text).toContain('docs/IMPLEMENT.md')
      expect(text).toContain('docs/stories/')
    }
  })

  it('cursor : frontmatter alwaysApply', () => {
    const text = buildToolInstructions('cursor', completeFiles(), 'Facturo')
    expect(text.startsWith('---\n')).toBe(true)
    expect(text).toContain('alwaysApply: true')
  })

  it('EXPORT_FILES donne le chemin de chaque cible', () => {
    expect(EXPORT_FILES).toEqual({
      claude: 'CLAUDE.md',
      copilot: '.github/copilot-instructions.md',
      cursor: '.cursor/rules/kuate.mdc',
      agents: 'AGENTS.md',
    })
  })
})
