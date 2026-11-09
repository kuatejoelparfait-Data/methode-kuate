import path from 'node:path'
import fs from 'fs-extra'
import chalk from 'chalk'
import {
  isKuateProject,
  readConfig,
  readSpecFiles,
  analyzeSpecs,
  renderAnalysisReport,
  issuesForPhase,
  buildStoryFiles,
  buildImplementGuide,
  buildToolInstructions,
  backupFile,
  EXPORT_FILES,
  SPEC_PATHS,
} from '@methode-kuate/core'
import type { ExportTarget, SpecAnalysis, SpecPhase } from '@methode-kuate/core'
import { initI18n } from '../i18n/index.js'
import { PHASE_COLORS } from '../utils/cycle-view.js'

async function requireProject(cwd: string): Promise<Awaited<ReturnType<typeof readConfig>>> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red("Aucun projet KUATE trouvé. Lancez kuate init d'abord."))
    process.exit(1)
  }
  const config = await readConfig(cwd)
  initI18n(config.lang)
  return config
}

/** Écrit un fichier en sauvegardant l'ancienne version dans .kuate/backups/. */
async function writeWithBackup(cwd: string, rel: string, content: string): Promise<string | null> {
  const backup = await backupFile(cwd, rel)
  const abs = path.join(cwd, rel)
  await fs.ensureDir(path.dirname(abs))
  await fs.writeFile(abs, content, 'utf-8')
  return backup
}

const PHASE_NAMES: Record<SpecPhase, string> = { K: 'Knower', U: 'Unifier', A: 'Architect' }

function printAnalysis(analysis: SpecAnalysis): { errors: number; warnings: number } {
  let errors = 0
  let warnings = 0
  for (const phase of ['K', 'U', 'A'] as SpecPhase[]) {
    const list = issuesForPhase(analysis, phase)
    const color = PHASE_COLORS[phase] ?? '#888'
    const e = list.filter(i => i.severity === 'error').length
    errors += e
    warnings += list.length - e
    const state = e === 0 ? chalk.green('complète') : chalk.yellow(`${e} erreur(s)`)
    console.log(`  ${chalk.bold.hex(color)(phase)}  ${PHASE_NAMES[phase].padEnd(10)} ${state}`)
    for (const i of list) {
      const tag = i.severity === 'error' ? chalk.red(`[${i.rule}]`) : chalk.yellow(`[${i.rule}]`)
      console.log(`      ${tag} ${i.id ? `${i.id} — ` : ''}${i.message}`)
    }
  }
  return { errors, warnings }
}

export async function specAnalyzeCommand(cwd: string): Promise<void> {
  const config = await requireProject(cwd)
  const analysis = analyzeSpecs(await readSpecFiles(cwd))

  console.log()
  console.log(chalk.bold.hex('#FF8C00')(`  Porte de complétude — ${config.project}`))
  console.log()
  const { errors, warnings } = printAnalysis(analysis)
  console.log()

  const report = path.join(cwd, SPEC_PATHS.analysis)
  await fs.ensureDir(path.dirname(report))
  await fs.writeFile(report, renderAnalysisReport(analysis, config.project), 'utf-8')

  if (errors === 0) {
    console.log(chalk.green(`  Porte passée (${warnings} avertissement(s)). Rapport : ${SPEC_PATHS.analysis}`))
  } else {
    console.log(chalk.red(`  ${errors} erreur(s) : la porte n'est pas passée. Rapport : ${SPEC_PATHS.analysis}`))
    process.exitCode = 1
  }
  console.log()
}

async function writeStories(cwd: string, stories: Record<string, string>): Promise<void> {
  const dir = path.join(cwd, SPEC_PATHS.storiesDir)
  await fs.ensureDir(dir)
  for (const [name, content] of Object.entries(stories)) {
    await fs.writeFile(path.join(dir, name), content, 'utf-8')
  }
}

export async function specStoriesCommand(cwd: string): Promise<void> {
  await requireProject(cwd)
  const stories = buildStoryFiles(await readSpecFiles(cwd))
  const names = Object.keys(stories)
  if (names.length === 0) {
    console.error(chalk.red(`  Aucune tâche trouvée dans ${SPEC_PATHS.backlog} (format : ### T-001 — Titre).`))
    process.exitCode = 1
    return
  }
  await writeStories(cwd, stories)
  console.log(chalk.green(`  ${names.length} fichier(s) de tâche écrit(s) dans ${SPEC_PATHS.storiesDir}/`))
}

export async function specExportCommand(cwd: string, opts: { target: ExportTarget; force?: boolean }): Promise<void> {
  const config = await requireProject(cwd)
  const files = await readSpecFiles(cwd)
  const analysis = analyzeSpecs(files)
  const errors = analysis.issues.filter(i => i.severity === 'error')

  if (errors.length > 0 && !opts.force) {
    console.log()
    console.log(chalk.red(`  Passation refusée : ${errors.length} erreur(s) dans le paquet de specs.`))
    printAnalysis(analysis)
    console.log()
    console.log(chalk.dim('  Corrigez-les (kuate spec), ou forcez avec --force.'))
    process.exitCode = 1
    return
  }
  if (errors.length > 0) console.log(chalk.yellow(`  --force : export malgré ${errors.length} erreur(s).`))

  const stories = buildStoryFiles(files)
  await writeStories(cwd, stories)
  const written: Array<[string, string | null]> = [
    [SPEC_PATHS.implement, await writeWithBackup(cwd, SPEC_PATHS.implement, buildImplementGuide(files, config.project))],
    [EXPORT_FILES[opts.target], await writeWithBackup(cwd, EXPORT_FILES[opts.target], buildToolInstructions(opts.target, files, config.project))],
  ]

  console.log()
  console.log(chalk.green(`  Passation prête (${opts.target}) :`))
  console.log(`    ${chalk.cyan(`${SPEC_PATHS.storiesDir}/`)}  ${Object.keys(stories).length} tâche(s)`)
  for (const [rel, backup] of written) {
    console.log(`    ${chalk.cyan(rel)}${backup ? chalk.dim(`  (ancienne version : ${backup})`) : ''}`)
  }
  console.log()
}
