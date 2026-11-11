import { describe, it, expect } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { parseSpecs, normalizeId, stripCodeFences } from './parse.js'
import { readSpecFiles } from './files.js'

const SPECS = [
  '### US-001 — Connexion',
  'En tant qu\'utilisateur, je veux me connecter afin de voir mes factures.',
  '- AC-001 (US-001) : Étant donné un compte, quand je me connecte, alors je vois mon tableau de bord',
  '',
  '- FR-001 : Le système authentifie par email',
  '- NFR-001 : Réponse en moins de 2 s',
].join('\n')

const BACKLOG = [
  '### T-002 [P] — Page de connexion',
  'covers: US-001, AC-001.',
  'Depends: T-001',
  'Files: src\\a.ts, src/a.test.ts',
  'Done when: les tests passent',
].join('\n')

describe('parseSpecs', () => {
  it('extrait stories et critères avec rattachement', () => {
    const m = parseSpecs({ specs: SPECS, contracts: {} })
    expect(m.stories).toEqual([{ id: 'US-001', title: 'Connexion' }])
    expect(m.criteria[0].id).toBe('AC-001')
    expect(m.criteria[0].storyId).toBe('US-001')
    expect(m.criteria[0].text.startsWith('Étant donné')).toBe(true)
  })

  it('donne le même modèle avec des fins de ligne Windows', () => {
    const lf = parseSpecs({ specs: SPECS, backlog: BACKLOG, contracts: {} })
    const crlf = parseSpecs({
      specs: SPECS.replace(/\n/g, '\r\n'),
      backlog: BACKLOG.replace(/\n/g, '\r\n'),
      contracts: {},
    })
    expect(crlf.stories).toEqual(lf.stories)
    expect(crlf.criteria).toEqual(lf.criteria)
    expect(crlf.tasks.map(t => ({ ...t, block: '' }))).toEqual(lf.tasks.map(t => ({ ...t, block: '' })))
  })

  it('normalise les identifiants sans jamais les tronquer', () => {
    expect(normalizeId('us-1')).toBe('US-001')
    expect(normalizeId('T-12')).toBe('T-012')
    expect(normalizeId('AC-0001')).toBe('AC-0001')
  })

  it('parse un bloc de tâche (minuscules, point final, chemins Windows)', () => {
    const t = parseSpecs({ backlog: BACKLOG, contracts: {} }).tasks[0]
    expect(t.id).toBe('T-002')
    expect(t.title).toBe('Page de connexion')
    expect(t.parallel).toBe(true)
    expect(t.covers).toEqual(['US-001', 'AC-001'])
    expect(t.depends).toEqual(['T-001'])
    expect(t.files).toEqual(['src/a.ts', 'src/a.test.ts'])
    expect(t.doneWhen).toBe('les tests passent')
  })

  it('ignore les identifiants dans les blocs de code', () => {
    const text = '```\n### US-009 — Exemple\n- AC-009 (US-009) : x\n```\n' + SPECS
    const m = parseSpecs({ specs: text, contracts: {} })
    expect(m.stories.map(s => s.id)).toEqual(['US-001'])
    expect(stripCodeFences('a\n```\nb\n```\nc')).not.toContain('b')
  })

  it('lit les exigences FR et NFR', () => {
    const m = parseSpecs({ specs: SPECS, contracts: {} })
    expect(m.requirements).toEqual([
      { id: 'FR-001', kind: 'FR', text: 'Le système authentifie par email' },
      { id: 'NFR-001', kind: 'NFR', text: 'Réponse en moins de 2 s' },
    ])
  })

  it('liste les sections d\'architecture', () => {
    const m = parseSpecs({ architecture: '## Stack\nx\n## Structure des dossiers\ny', contracts: {} })
    expect(m.archSections).toEqual(['Stack', 'Structure des dossiers'])
  })

  it('lit les drapeaux données/API de la constitution', () => {
    const c = '- Données persistantes : oui\n- API exposée : non'
    expect(parseSpecs({ constitution: c, contracts: {} }).flags).toEqual({ hasData: true, hasApi: false })
    expect(parseSpecs({ contracts: {} }).flags).toEqual({ hasData: false, hasApi: false })
  })

  it('renvoie un modèle vide sans exception quand tout est absent', () => {
    const m = parseSpecs({ contracts: {} })
    expect(m.stories).toEqual([])
    expect(m.tasks).toEqual([])
  })
})

describe('readSpecFiles', () => {
  it('lit les documents et les contrats, undefined si absents', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'kuate-spec-'))
    const empty = await readSpecFiles(cwd)
    expect(empty.specs).toBeUndefined()
    expect(empty.contracts).toEqual({})

    await fs.outputFile(path.join(cwd, 'docs/specs.md'), '# specs')
    await fs.outputFile(path.join(cwd, 'docs/contracts/auth.md'), '# auth')
    const files = await readSpecFiles(cwd)
    expect(files.specs).toBe('# specs')
    expect(files.contracts['docs/contracts/auth.md']).toBe('# auth')
  })
})
