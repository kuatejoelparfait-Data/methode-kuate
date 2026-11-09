import { describe, it, expect } from 'vitest'
import { buildStoryFiles, STORY_RULE } from './stories.js'
import { completeFiles } from './fixtures.js'

describe('buildStoryFiles', () => {
  it('produit un fichier par tâche, nommé par son identifiant', () => {
    expect(Object.keys(buildStoryFiles(completeFiles())).sort()).toEqual(['T-001.md', 'T-002.md', 'T-003.md'])
  })

  it('embarque tâche, story, critères, extraits d\'architecture et consigne', () => {
    const t1 = buildStoryFiles(completeFiles())['T-001.md']
    expect(t1).toContain('Done when: les tests de connexion passent')
    expect(t1).toContain('US-001 — Connexion')
    expect(t1).toContain('accéder à mes factures')
    expect(t1).toContain('Étant donné un mot de passe erroné')
    expect(t1).toContain('PostgreSQL, Express')
    expect(t1).toContain('DATABASE_URL')
    expect(t1).toContain('Fonctions pures')
    expect(t1).toContain(STORY_RULE)
  })

  it('une tâche qui ne cite qu\'un critère contient aussi sa story parente', () => {
    const files = completeFiles()
    files.backlog = (files.backlog as string).replace('Covers: US-002, AC-003, FR-001', 'Covers: AC-003')
    const t2 = buildStoryFiles(files)['T-002.md']
    expect(t2).toContain('US-002 — Création de facture')
    expect(t2).toContain('numéro unique')
  })

  it('inclut les exigences citées', () => {
    expect(buildStoryFiles(completeFiles())['T-003.md']).toContain('moins de 2 secondes')
  })

  it('inclut modèle de données et contrats en entier quand ils sont courts', () => {
    const t1 = buildStoryFiles(completeFiles())['T-001.md']
    expect(t1).toContain('passwordHash')
    expect(t1).toContain('POST /invoices')
  })

  it('ne cite que les chemins quand data-model et contrats dépassent 4000 caractères', () => {
    const files = completeFiles()
    files.contracts = { 'docs/contracts/invoices.md': 'X'.repeat(5000) }
    const t1 = buildStoryFiles(files)['T-001.md']
    expect(t1).toContain('docs/contracts/invoices.md')
    expect(t1).not.toContain('X'.repeat(100))
    expect(t1).toContain('docs/data-model.md')
  })

  it('renvoie un objet vide sans backlog', () => {
    expect(buildStoryFiles({ contracts: {} })).toEqual({})
  })
})
