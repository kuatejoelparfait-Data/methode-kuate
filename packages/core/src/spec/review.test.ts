import { describe, it, expect } from 'vitest'
import { parseReviewIssues } from './format.js'

describe('parseReviewIssues', () => {
  it('garde les entrées valides et écarte les autres', () => {
    const out = parseReviewIssues({
      issues: [
        { severity: 'major', problem: 'x', suggestion: 'y' },
        { foo: 1 },
      ],
    })
    expect(out).toEqual([{ severity: 'major', problem: 'x', suggestion: 'y' }])
  })

  it('sévérité inconnue → minor', () => {
    const out = parseReviewIssues({ issues: [{ severity: 'catastrophic', problem: 'x', suggestion: 'y' }] })
    expect(out[0].severity).toBe('minor')
  })

  it('suggestion absente tolérée', () => {
    const out = parseReviewIssues({ issues: [{ severity: 'blocking', problem: 'x' }] })
    expect(out).toEqual([{ severity: 'blocking', problem: 'x', suggestion: '' }])
  })

  it('entrées non conformes → tableau vide', () => {
    expect(parseReviewIssues(null)).toEqual([])
    expect(parseReviewIssues('texte')).toEqual([])
    expect(parseReviewIssues({ issues: 'non' })).toEqual([])
    expect(parseReviewIssues({ issues: [null, 3, 'a'] })).toEqual([])
  })
})
