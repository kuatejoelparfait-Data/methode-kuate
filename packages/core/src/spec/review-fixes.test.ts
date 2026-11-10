import { describe, it, expect } from 'vitest'
import { parseSpecs } from './parse.js'
import { analyzeSpecs } from './analyze.js'
import { completeFiles } from './fixtures.js'
import { findMarkers, applyClarification } from './clarify.js'
import { extractDocFiles } from './extract.js'
import { buildRevisionTask } from './format.js'
import type { SpecFiles } from './types.js'

const withSpecs = (extra: string): SpecFiles => {
  const f = completeFiles()
  return { ...f, specs: `${f.specs}\n${extra}` }
}
const withBacklog = (extra: string): SpecFiles => {
  const f = completeFiles()
  return { ...f, backlog: `${f.backlog}\n\n${extra}` }
}
const withArch = (extra: string): SpecFiles => {
  const f = completeFiles()
  return { ...f, architecture: `${f.architecture}\n${extra}` }
}
const errors = (f: SpecFiles) => analyzeSpecs(f).issues.filter(i => i.severity === 'error')
const has = (f: SpecFiles, rule: string, phase?: string) =>
  errors(f).some(i => i.rule === rule && (phase === undefined || i.phase === phase))

describe('C2 — en-têtes d\'identifiants mal formés ne passent plus silencieusement', () => {
  it.each([
    '### US-003 Export PDF',
    '### US-003',
    '## US-003 — Export PDF',
    '#### US-003 — Export PDF',
    '### **US-003** — Export PDF',
    '### US-003. Export PDF',
  ])('story « %s » → G9 en phase K', line => {
    expect(has(withSpecs(line), 'G9', 'K')).toBe(true)
  })

  it.each([
    '- **AC-009** (US-001) : x',
    '- AC-009 : x',
    '1. AC-009 (US-001) : x',
    '- AC-009 (US-001) — x',
    '- [ ] AC-009 (US-001) : x',
  ])('critère « %s » → G9 en phase K', line => {
    expect(has(withSpecs(line), 'G9', 'K')).toBe(true)
  })

  it.each([
    '## T-004 — Titre\nCovers: US-001\nFiles: src/a.ts\nDone when: ok',
    '#### T-004 — Titre',
    '### **T-004** — Titre',
  ])('tâche « %s » → G9 en phase U', text => {
    expect(has(withBacklog(text), 'G9', 'U')).toBe(true)
  })

  it('le format valide et une simple mention en prose ne lèvent pas G9', () => {
    expect(has(completeFiles(), 'G9')).toBe(false)
    expect(has(withSpecs('Voir US-001 et AC-001 pour le détail.'), 'G9')).toBe(false)
  })
})

describe('I1 — une ligne de champ vide ne capture pas la ligne suivante', () => {
  it('Files vide : files = [] ; Done when vide : doneWhen = ""', () => {
    const a = parseSpecs({ backlog: '### T-001 — x\nCovers: US-001\nFiles:\nDone when: les tests passent', contracts: {} }).tasks[0]
    expect(a.files).toEqual([])
    expect(a.doneWhen).toBe('les tests passent')
    const b = parseSpecs({ backlog: '### T-001 — x\nDone when:\nNote : rien.', contracts: {} }).tasks[0]
    expect(b.doneWhen).toBe('')
  })

  it('Files vide → G5', () => {
    const f = completeFiles()
    f.backlog = (f.backlog as string).replace(
      'Files: src/perf/budget.test.ts\n',
      'Files:\n',
    )
    expect(errors(f).some(i => i.rule === 'G5' && i.id === 'T-003')).toBe(true)
  })
})

describe('I2 — pas de faux positifs G1 sur du vocabulaire courant', () => {
  it.each([
    'Application de todo-list collaborative',
    '- `src/todo/todo.service.ts`',
    'Ce module sert à définir les priorités',
    'Utiliser `TODO` en commentaire est interdit',
    '~~~\nTODO exemple\n~~~',
  ])('« %s » n\'est pas une erreur G1', text => {
    expect(has(withArch(text), 'G1')).toBe(false)
  })

  it.each([
    'TODO écrire la section',
    'TBD',
    '- Base de données : à définir',
    'Hébergement ???',
  ])('« %s » est une erreur G1 localisée', text => {
    const issue = errors(withArch(text)).find(i => i.rule === 'G1')
    expect(issue).toBeDefined()
    expect(issue?.message).toMatch(/ligne \d+/)
  })
})

describe('I3 — G1 et clarify reconnaissent les mêmes marqueurs', () => {
  it.each([
    '[NEEDS CLARIFICATION: quel SSO ?]',
    '[needs clarification: quel SSO ?]',
    '[NEEDS CLARIFICATION : quel SSO ?]',
    '[NEEDS CLARIFICATION]',
  ])('« %s » : G1 bloque et findMarkers le voit', marker => {
    expect(has(withArch(marker), 'G1')).toBe(true)
    expect(findMarkers(marker)).toHaveLength(1)
  })

  it('question contenant des crochets : marqueur entier, remplacement complet', () => {
    const text = 'a [NEEDS CLARIFICATION: format [A] ou [B] ?] b'
    const [m] = findMarkers(text)
    expect(m.question).toBe('format [A] ou [B] ?')
    expect(applyClarification(text, m.raw, 'A')).toBe('a A b')
  })

  it('marqueur jamais refermé : G1 explicite', () => {
    const issue = errors(withArch('[NEEDS CLARIFICATION: oublié de fermer')).find(i => i.rule === 'G1')
    expect(issue?.message).toMatch(/mal formé/i)
  })
})

describe('I5 — une clarification n\'est appliquée que si le texte change', () => {
  it('marqueur sur deux lignes dans un fichier CRLF', () => {
    const text = 'a [NEEDS CLARIFICATION: quel\r\nSSO ?] b\r\nfin'
    const [m] = findMarkers(text)
    const out = applyClarification(text, m.raw, 'Google')
    expect(out).not.toBe(text)
    expect(out).toContain('a Google b')
    expect(out).not.toContain('NEEDS')
  })
})

describe('C1 — extraction de documents contenant des blocs de code', () => {
  const F5 = '`````'
  const F3 = '```'

  it('clôture externe plus longue : le document entier est conservé', () => {
    const content = [
      F5 + 'markdown', '// docs/architecture.md', '## Stack', 'x', '## Structure des dossiers',
      F3, 'src/', F3, '## Décisions', '- y', F5,
    ].join('\n')
    const { files } = extractDocFiles(content)
    expect(files).toHaveLength(1)
    expect(files[0].filename).toBe('docs/architecture.md')
    expect(files[0].content).toContain('## Décisions')
    expect(files[0].content).toContain('src/')
    expect(files[0].content).not.toContain('// docs/architecture.md')
  })

  it('bloc simple, chemin en commentaire # ou //', () => {
    const content = [F3 + 'markdown', '# docs/specs.md', '### US-001 — x', F3, '', F3, '// docs/backlog.md', 'y', F3].join('\n')
    expect(extractDocFiles(content).files.map(f => f.filename)).toEqual(['docs/specs.md', 'docs/backlog.md'])
  })

  it('ignore les blocs sans chemin et signale un bloc non terminé', () => {
    const lone = [F3 + 'bash', 'npm install', F3].join('\n')
    expect(extractDocFiles(lone).files).toEqual([])
    const open = [F3 + 'markdown', '// docs/specs.md', 'texte sans fin'].join('\n')
    const r = extractDocFiles(open)
    expect(r.files).toEqual([])
    expect(r.warnings.length).toBeGreaterThan(0)
  })
})

describe('I4 — la révision d\'un document existant reçoit les décisions déjà prises', () => {
  it('buildRevisionTask inclut le journal de clarifications', () => {
    const t = buildRevisionTask('K', '### US-001 — x', [], '- Question : quel SSO ?\n- Réponse : Google')
    expect(t).toContain('Google')
    expect(t).toContain('### US-001 — x')
  })
})
