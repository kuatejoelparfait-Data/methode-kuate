import { describe, it, expect } from 'vitest'
import {
  SPEC_PHASE_AGENTS,
  SPEC_PHASE_OUTPUTS,
  phaseFormatContract,
  buildAuthorTask,
  buildRevisionTask,
  buildSpecReviewPrompt,
} from './format.js'
import { findMarkers, applyClarification, appendClarification } from './clarify.js'
import { filterDocFiles } from './safe-paths.js'

describe('contrats de format et prompts', () => {
  it('contrat K : stories et critères', () => {
    const c = phaseFormatContract('K')
    expect(c).toContain('AC-001 (US-001)')
    expect(c).toContain('Étant donné')
  })

  it('contrat U : champs de tâche', () => {
    const c = phaseFormatContract('U')
    for (const word of ['Covers:', 'Files:', 'Done when:', '[P]']) expect(c).toContain(word)
  })

  it('contrat A : sections obligatoires', () => {
    const c = phaseFormatContract('A')
    expect(c).toContain('## Structure des dossiers')
    expect(c).toContain('## Décisions')
  })

  it('agents et sorties par phase', () => {
    expect(SPEC_PHASE_AGENTS.K).toEqual({ lead: 'business-analyst', reviewers: ['qa-strategist', 'expert-securite'] })
    expect(SPEC_PHASE_AGENTS.U).toEqual({ lead: 'chef-projet', reviewers: ['tech-lead'] })
    expect(SPEC_PHASE_AGENTS.A).toEqual({ lead: 'architecte-solution', reviewers: ['expert-securite', 'expert-devops', 'tech-lead'] })
    expect(SPEC_PHASE_OUTPUTS.K).toEqual(['docs/specs.md'])
  })

  it('tâche de rédaction : contrat, projet, marqueur d\'ambiguïté', () => {
    const t = buildAuthorTask('K', { project: 'Facturo', method: 'agile', description: 'SaaS de facturation', priorDocs: '' })
    expect(t).toContain(phaseFormatContract('K'))
    expect(t).toContain('Facturo')
    expect(t).toContain('[NEEDS CLARIFICATION: ')
  })

  it('tâche de révision : document et problèmes', () => {
    const t = buildRevisionTask('U', '### T-001 — x', [
      { severity: 'major', problem: 'Tâche trop grosse', suggestion: 'Découper' },
    ])
    expect(t).toContain('### T-001 — x')
    expect(t).toContain('Tâche trop grosse')
  })

  it('prompt de relecture : réponse JSON attendue', () => {
    const p = buildSpecReviewPrompt('A', 'Tu es expert sécurité', '# Architecture')
    expect(p).toContain('Tu es expert sécurité')
    expect(p).toContain('"issues"')
  })
})

describe('marqueurs et clarifications', () => {
  const text = 'a [NEEDS CLARIFICATION: quel SSO ?] b\n[NEEDS CLARIFICATION: quelle base ?]'

  it('findMarkers : deux questions, aucune dans un bloc de code', () => {
    expect(findMarkers(text).map(m => m.question)).toEqual(['quel SSO ?', 'quelle base ?'])
    expect(findMarkers('```\n[NEEDS CLARIFICATION: x]\n```')).toEqual([])
  })

  it('applyClarification remplace exactement le marqueur', () => {
    const [first] = findMarkers(text)
    expect(applyClarification(text, first.raw, 'Google')).toBe('a Google b\n[NEEDS CLARIFICATION: quelle base ?]')
  })

  it('applyClarification ignore un marqueur dans un bloc de code', () => {
    const t = '```\n[NEEDS CLARIFICATION: x]\n```\n[NEEDS CLARIFICATION: x]'
    expect(applyClarification(t, '[NEEDS CLARIFICATION: x]', 'ok')).toBe('```\n[NEEDS CLARIFICATION: x]\n```\nok')
  })

  it('appendClarification crée puis complète le journal', () => {
    const entry = { date: '2026-11-10', file: 'docs/specs.md', question: 'quel SSO ?', answer: 'Google' }
    const first = appendClarification(undefined, entry)
    expect(first).toContain('2026-11-10')
    expect(first).toContain('docs/specs.md')
    expect(first).toContain('quel SSO ?')
    expect(first).toContain('Google')
    const second = appendClarification(first, { ...entry, question: 'quelle base ?', answer: 'PostgreSQL' })
    expect(second).toContain('quel SSO ?')
    expect(second).toContain('PostgreSQL')
  })
})

describe('filterDocFiles', () => {
  it('garde les chemins sous docs/ et normalise les séparateurs', () => {
    const out = filterDocFiles([
      { filename: 'docs/specs.md' },
      { filename: 'docs\\contracts\\a.md' },
    ])
    expect(out.map(f => f.filename)).toEqual(['docs/specs.md', 'docs/contracts/a.md'])
  })

  it('rejette traversée, chemins absolus, lecteur Windows et hors docs/', () => {
    const out = filterDocFiles([
      { filename: '../x.md' },
      { filename: 'docs/../../x.md' },
      { filename: '/etc/x' },
      { filename: 'C:\\x.md' },
      { filename: 'src/a.ts' },
    ])
    expect(out).toEqual([])
  })
})
