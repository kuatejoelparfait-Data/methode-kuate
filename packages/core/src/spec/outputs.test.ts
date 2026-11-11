import { describe, it, expect } from 'vitest'
import { isPhaseOutput, ensureConstitutionFlags } from './outputs.js'
import { buildSpecReviewPrompt } from './format.js'
import { parseSpecs } from './parse.js'

describe('isPhaseOutput', () => {
  it('n\'accepte que les fichiers attendus de la phase', () => {
    expect(isPhaseOutput('K', 'docs/specs.md')).toBe(true)
    expect(isPhaseOutput('K', 'docs/backlog.md')).toBe(false)
    expect(isPhaseOutput('A', 'docs/architecture.md')).toBe(true)
    expect(isPhaseOutput('A', 'docs/data-model.md')).toBe(true)
    expect(isPhaseOutput('A', 'docs/contracts/auth.md')).toBe(true)
    expect(isPhaseOutput('A', 'docs/contracts/sub/x.md')).toBe(false)
    expect(isPhaseOutput('U', 'docs/backlog.md')).toBe(true)
  })
})

describe('ensureConstitutionFlags', () => {
  it('ajoute les deux lignes aux réponses données', () => {
    const out = ensureConstitutionFlags('# Constitution', { hasData: true, hasApi: false })
    expect(parseSpecs({ constitution: out, contracts: {} }).flags).toEqual({ hasData: true, hasApi: false })
  })

  it('remplace des lignes existantes sans les dupliquer', () => {
    const first = ensureConstitutionFlags('# Constitution', { hasData: true, hasApi: false })
    const second = ensureConstitutionFlags(first, { hasData: false, hasApi: true })
    expect(second.match(/Données persistantes/g)?.length).toBe(1)
    expect(second.match(/API exposée/g)?.length).toBe(1)
    expect(parseSpecs({ constitution: second, contracts: {} }).flags).toEqual({ hasData: false, hasApi: true })
  })
})

describe('relecture du paquet complet', () => {
  it('le prompt vise le paquet entier', () => {
    const p = buildSpecReviewPrompt('pack', 'Tu es développeur', '# Paquet')
    expect(p).toContain('paquet de specs complet')
    expect(p).toContain('"issues"')
  })
})
