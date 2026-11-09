import { describe, it, expect, beforeEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { completeFiles } from './fixtures.js'
import { readSpecFiles, SPEC_PATHS } from './files.js'
import { analyzeSpecs } from './analyze.js'
import { buildStoryFiles } from './stories.js'
import { buildImplementGuide } from './export.js'
import type { SpecFiles } from './types.js'

async function writePackage(cwd: string, files: SpecFiles): Promise<void> {
  const put = (rel: string, text: string | undefined) =>
    text === undefined ? Promise.resolve() : fs.outputFile(path.join(cwd, rel), text)
  await put(SPEC_PATHS.constitution, files.constitution)
  await put(SPEC_PATHS.specs, files.specs)
  await put(SPEC_PATHS.backlog, files.backlog)
  await put(SPEC_PATHS.architecture, files.architecture)
  await put(SPEC_PATHS.dataModel, files.dataModel)
  for (const [rel, text] of Object.entries(files.contracts)) await put(rel, text)
}

describe('paquet de specs sur disque', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'kuate-pack-'))
  })

  it('paquet complet : porte passée, fichiers de tâche et guide produits', async () => {
    await writePackage(cwd, completeFiles())
    const files = await readSpecFiles(cwd)
    expect(analyzeSpecs(files).issues.filter(i => i.severity === 'error')).toEqual([])
    expect(Object.keys(buildStoryFiles(files))).toEqual(['T-001.md', 'T-002.md', 'T-003.md'])
    expect(buildImplementGuide(files, 'Facturo')).toContain('Groupe 1')
  })

  it('paquet avec fins de ligne Windows : même résultat', async () => {
    const f = completeFiles()
    const crlf: SpecFiles = {
      ...f,
      specs: (f.specs as string).replace(/\n/g, '\r\n'),
      backlog: (f.backlog as string).replace(/\n/g, '\r\n'),
      architecture: (f.architecture as string).replace(/\n/g, '\r\n'),
    }
    await writePackage(cwd, crlf)
    expect(analyzeSpecs(await readSpecFiles(cwd)).issues.filter(i => i.severity === 'error')).toEqual([])
  })

  it('paquet cassé : l\'erreur cite la bonne tâche après relecture du disque', async () => {
    const f = completeFiles()
    await writePackage(cwd, {
      ...f,
      backlog: (f.backlog as string).replace('Files: src/invoices/create.ts, src/invoices/create.test.ts\n', ''),
    })
    const errors = analyzeSpecs(await readSpecFiles(cwd)).issues.filter(i => i.severity === 'error')
    expect(errors.some(i => i.rule === 'G5' && i.id === 'T-002')).toBe(true)
  })
})
