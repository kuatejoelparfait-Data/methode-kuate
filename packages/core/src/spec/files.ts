import path from 'node:path'
import fs from 'fs-extra'
import type { SpecFiles } from './types.js'

/** Chemins (relatifs à la racine du projet) des documents du paquet de specs. */
export const SPEC_PATHS = {
  constitution: 'docs/constitution.md',
  specs: 'docs/specs.md',
  backlog: 'docs/backlog.md',
  architecture: 'docs/architecture.md',
  dataModel: 'docs/data-model.md',
  clarifications: 'docs/clarifications.md',
  contractsDir: 'docs/contracts',
  analysis: 'docs/analysis.md',
  implement: 'docs/IMPLEMENT.md',
  storiesDir: 'docs/stories',
} as const

async function readIfExists(cwd: string, rel: string): Promise<string | undefined> {
  const abs = path.join(cwd, rel)
  return (await fs.pathExists(abs)) ? fs.readFile(abs, 'utf-8') : undefined
}

export async function readSpecFiles(cwd: string): Promise<SpecFiles> {
  const contracts: Record<string, string> = {}
  const dir = path.join(cwd, SPEC_PATHS.contractsDir)
  if (await fs.pathExists(dir)) {
    for (const name of (await fs.readdir(dir)).filter(n => n.endsWith('.md')).sort()) {
      contracts[`${SPEC_PATHS.contractsDir}/${name}`] = await fs.readFile(path.join(dir, name), 'utf-8')
    }
  }
  return {
    constitution: await readIfExists(cwd, SPEC_PATHS.constitution),
    specs: await readIfExists(cwd, SPEC_PATHS.specs),
    backlog: await readIfExists(cwd, SPEC_PATHS.backlog),
    architecture: await readIfExists(cwd, SPEC_PATHS.architecture),
    dataModel: await readIfExists(cwd, SPEC_PATHS.dataModel),
    clarifications: await readIfExists(cwd, SPEC_PATHS.clarifications),
    contracts,
  }
}
