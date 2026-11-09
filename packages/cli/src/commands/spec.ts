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
  SPEC_PHASE_AGENTS,
  EXPORT_FILES,
  SPEC_PATHS,
} from '@methode-kuate/core'
import type { ExportTarget, SpecAnalysis, SpecPhase } from '@methode-kuate/core'
import { initI18n } from '../i18n/index.js'
import * as p from '@clack/prompts'
import { PHASE_COLORS } from '../utils/cycle-view.js'
import { resolveAiConfig } from '../utils/ai-select.js'
import type { AiSelectOptions } from '../utils/ai-select.js'
import {
  clarifyAll,
  createConstitution,
  isInteractive,
  reviewWholePack,
  runSpecPhase,
  writeWithBackup,
} from '../utils/spec-flow.js'

async function requireProject(cwd: string): Promise<Awaited<ReturnType<typeof readConfig>>> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red("Aucun projet KUATE trouvé. Lancez kuate init d'abord."))
    process.exit(1)
  }
  const config = await readConfig(cwd)
  initI18n(config.lang)
  return config
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

export async function specAnalyzeCommand(cwd: string, opts: AiSelectOptions & { ai?: boolean } = {}): Promise<void> {
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

  if (opts.ai) await reviewWholePack(cwd, await resolveAiConfig(opts))
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

export async function specClarifyCommand(cwd: string): Promise<void> {
  await requireProject(cwd)
  const { resolved, remaining } = await clarifyAll(cwd)
  if (resolved === 0 && remaining === 0) {
    console.log(chalk.green('  Aucune question ouverte.'))
    return
  }
  console.log(chalk.dim(`  ${resolved} résolue(s), ${remaining} restante(s). Journal : ${SPEC_PATHS.clarifications}`))
  if (remaining > 0) process.exitCode = 1
}

async function askFlags(): Promise<{ hasData: boolean; hasApi: boolean } | null> {
  const hasData = await p.confirm({ message: 'Le projet a-t-il des données persistantes (base de données) ?', initialValue: true })
  if (p.isCancel(hasData)) return null
  const hasApi = await p.confirm({ message: 'Le projet expose-t-il une API ?', initialValue: true })
  if (p.isCancel(hasApi)) return null
  return { hasData, hasApi }
}

export async function specConstitutionCommand(cwd: string, opts: AiSelectOptions = {}): Promise<void> {
  await requireProject(cwd)
  if (!isInteractive()) {
    console.error(chalk.red('  kuate spec constitution demande un terminal interactif.'))
    process.exitCode = 1
    return
  }
  const existing = (await readSpecFiles(cwd)).constitution
  if (existing?.trim()) {
    const ok = await p.confirm({ message: `${SPEC_PATHS.constitution} existe : la remplacer (l'ancienne version sera sauvegardée) ?`, initialValue: false })
    if (p.isCancel(ok) || !ok) return
  }
  const flags = await askFlags()
  if (!flags) return
  await createConstitution(cwd, await resolveAiConfig(opts), flags)
}

export async function specRunCommand(cwd: string, opts: AiSelectOptions & { phase?: string } = {}): Promise<void> {
  await requireProject(cwd)
  const phases: SpecPhase[] = ['K', 'U', 'A']

  let phase: SpecPhase | undefined
  if (opts.phase) {
    const wanted = opts.phase.toUpperCase() as SpecPhase
    if (!phases.includes(wanted)) {
      console.error(chalk.red(`  Phase invalide "${opts.phase}". Utilisez K, U ou A.`))
      process.exitCode = 1
      return
    }
    phase = wanted
  } else {
    const analysis = analyzeSpecs(await readSpecFiles(cwd))
    phase = phases.find(ph => issuesForPhase(analysis, ph).some(i => i.severity === 'error'))
  }
  if (!phase) {
    console.log(chalk.green('  Paquet de specs complet : porte passée pour K, U et A.'))
    console.log(chalk.dim(`  Passation : kuate spec export --target ${Object.keys(EXPORT_FILES).join('|')}`))
    return
  }

  const aiConfig = await resolveAiConfig(opts)
  if (phase === 'K' && !(await readSpecFiles(cwd)).constitution?.trim()) {
    if (!isInteractive()) {
      console.error(chalk.red('  Constitution absente : lancez kuate spec constitution dans un terminal interactif.'))
      process.exitCode = 1
      return
    }
    const flags = await askFlags()
    if (!flags) return
    if (!(await createConstitution(cwd, aiConfig, flags))) return
  }

  const { gatePassed } = await runSpecPhase(cwd, phase, aiConfig)
  console.log()
  if (gatePassed) {
    const next = phases[phases.indexOf(phase) + 1]
    console.log(next
      ? chalk.dim(`  Étape suivante : kuate spec (phase ${next}, agent ${SPEC_PHASE_AGENTS[next].lead}).`)
      : chalk.dim(`  Paquet terminé : kuate spec export --target ${Object.keys(EXPORT_FILES).join('|')}`))
  }
  console.log()
}
