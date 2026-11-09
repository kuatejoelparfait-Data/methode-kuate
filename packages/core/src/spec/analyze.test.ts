import { describe, it, expect } from 'vitest'
import { analyzeSpecs, issuesForPhase, renderAnalysisReport } from './analyze.js'
import { completeFiles } from './fixtures.js'
import type { SpecFiles } from './types.js'

/** Part du paquet valide et applique un remplacement de texte dans un document. */
function broken(doc: keyof Omit<SpecFiles, 'contracts'>, from: string, to: string): SpecFiles {
  const files = completeFiles()
  const text = files[doc] as string
  expect(text).toContain(from)
  return { ...files, [doc]: text.replace(from, to) }
}

const errors = (f: SpecFiles) => analyzeSpecs(f).issues.filter(i => i.severity === 'error')
const has = (f: SpecFiles, rule: string, id?: string) =>
  errors(f).some(i => i.rule === rule && (id === undefined || i.id === id))

describe('analyzeSpecs', () => {
  it('paquet complet : aucune erreur et une ligne de traçabilité par critère', () => {
    const a = analyzeSpecs(completeFiles())
    expect(a.issues.filter(i => i.severity === 'error')).toEqual([])
    const ac2 = a.trace.find(r => r.criterionId === 'AC-002')
    expect(ac2?.storyId).toBe('US-001')
    expect(ac2?.taskIds).toEqual(['T-001'])
    expect(a.trace.filter(r => r.criterionId).length).toBe(3)
  })

  it('G1 : marqueur dans specs → phase K, dans backlog → phase U', () => {
    const marker = '[NEEDS CLARIFICATION: quel SSO ?]'
    const k = errors(broken('specs', 'Connexion', `Connexion ${marker}`)).find(i => i.rule === 'G1')
    expect(k?.phase).toBe('K')
    expect(k?.file).toBe('docs/specs.md')
    const u = errors(broken('backlog', 'Authentification', `Authentification ${marker}`)).find(i => i.rule === 'G1')
    expect(u?.phase).toBe('U')
  })

  it('G1 : TBD, TODO, À définir et ??? sont des erreurs', () => {
    for (const word of ['TBD', 'TODO', 'À définir', '???']) {
      expect(has(broken('architecture', 'Express plutôt', `${word} Express plutôt`), 'G1')).toBe(true)
    }
  })

  it('G1 : pas de faux positif dans un bloc de code ni dans un mot', () => {
    expect(has(broken('architecture', 'TypeScript, Node 20', '```\nTODO exemple\n```\nTypeScript, Node 20'), 'G1')).toBe(false)
    expect(has(broken('architecture', 'TypeScript, Node 20', 'mastodon TypeScript, Node 20'), 'G1')).toBe(false)
  })

  it('G2 : story sans critère', () => {
    const f = broken('specs', '- AC-003 (US-002) : Étant donné un client existant, quand je valide le formulaire, alors la facture est enregistrée avec un numéro unique', '')
    expect(has(f, 'G2', 'US-002')).toBe(true)
  })

  it('G4 : critère non couvert par une tâche', () => {
    expect(has(broken('backlog', 'Covers: US-001, AC-001, AC-002', 'Covers: US-001, AC-001'), 'G4', 'AC-002')).toBe(true)
  })

  it('G3 : story non couverte (ni elle ni ses critères)', () => {
    expect(has(broken('backlog', 'Covers: US-002, AC-003, FR-001', 'Covers: FR-001'), 'G3', 'US-002')).toBe(true)
  })

  it('G5 : tâche sans Files, et référence inconnue', () => {
    expect(has(broken('backlog', 'Files: src/invoices/create.ts, src/invoices/create.test.ts\n', ''), 'G5', 'T-002')).toBe(true)
    expect(has(broken('backlog', 'Covers: NFR-001', 'Covers: NFR-001, US-999'), 'G5', 'T-003')).toBe(true)
  })

  it('G6 : dépendance inconnue et cycle', () => {
    expect(has(broken('backlog', 'Depends: T-001\nFiles: src/perf', 'Depends: T-999\nFiles: src/perf'), 'G6', 'T-003')).toBe(true)
    const cyc = errors(broken('backlog', '### T-001 — Authentification\nCovers', '### T-001 — Authentification\nDepends: T-002\nCovers'))
    expect(cyc.some(i => i.rule === 'G6' && /cycle/i.test(i.message))).toBe(true)
  })

  it('G7 : section manquante, data-model et contrats requis', () => {
    expect(has(broken('architecture', '## Décisions', '## Autre'), 'G7')).toBe(true)
    expect(has({ ...completeFiles(), dataModel: undefined }, 'G7')).toBe(true)
    expect(has({ ...completeFiles(), contracts: {} }, 'G7')).toBe(true)
  })

  it('G8 : identifiant en double', () => {
    expect(has(broken('specs', '### US-002 — Création de facture', '### US-001 — Doublon'), 'G8', 'US-001')).toBe(true)
  })

  it('G0 : documents absents → erreurs claires pour K, U et A, sans exception', () => {
    const issues = analyzeSpecs({ contracts: {} }).issues.filter(i => i.rule === 'G0')
    expect(issues.map(i => i.phase).sort()).toEqual(['A', 'K', 'U'])
  })

  it('avertissements : constitution absente, fichier hors dossiers cités', () => {
    const noConst = analyzeSpecs({ ...completeFiles(), constitution: undefined })
    expect(noConst.issues.find(i => i.rule === 'W2')?.severity).toBe('warning')
    const stray = analyzeSpecs(broken('backlog', 'src/perf/budget.test.ts', 'tools/budget.test.ts'))
    expect(stray.issues.some(i => i.rule === 'W1' && i.id === 'T-003')).toBe(true)
  })

  it('issuesForPhase filtre par phase', () => {
    const a = analyzeSpecs({ contracts: {} })
    expect(issuesForPhase(a, 'U').every(i => i.phase === 'U')).toBe(true)
    expect(issuesForPhase(a, 'U').length).toBeGreaterThan(0)
  })

  it('renderAnalysisReport : sections et matrice', () => {
    const report = renderAnalysisReport(analyzeSpecs(completeFiles()), 'Facturo')
    expect(report).toContain('Erreurs')
    expect(report).toContain('Avertissements')
    expect(report).toContain('US-001')
    expect(report).toContain('T-001')
  })

  it('G2 : specs sans aucune story, G5 : backlog sans aucune tâche', () => {
    const files = { ...completeFiles(), specs: '# Specs\n\nTexte libre sans story.', backlog: '# Backlog\n\nTexte libre.' }
    const errs = analyzeSpecs(files).issues.filter(i => i.severity === 'error')
    expect(errs.some(i => i.rule === 'G2' && i.phase === 'K' && !i.id)).toBe(true)
    expect(errs.some(i => i.rule === 'G5' && i.phase === 'U' && !i.id)).toBe(true)
  })
})
