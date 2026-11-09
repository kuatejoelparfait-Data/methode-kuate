import path from 'node:path'
import fs from 'fs-extra'
import chalk from 'chalk'
import * as p from '@clack/prompts'
import {
  isKuateProject,
  readConfig,
  readCycle,
  computeCycleStatus,
  setPhaseOverride,
  addCycleNote,
  backupPhaseArtifact,
  formatCycleSummary,
  analyzeCycleWithAI,
  CYCLE_PHASES,
  CYCLE_PHASE_NAMES,
  PHASE_DOCS,
  CODE_DIRS,
  PROVIDER_LABELS,
} from '@methode-kuate/core'
import type { CycleDoc, Phase } from '@methode-kuate/core'
import { initI18n } from '../i18n/index.js'
import { resolveAiConfig } from '../utils/ai-select.js'
import type { AiSelectOptions } from '../utils/ai-select.js'
import { renderTracker, renderCycleTable, PHASE_COLORS } from '../utils/cycle-view.js'

export interface CycleOptions extends AiSelectOptions {
  analyse?: boolean
  json?: boolean
}

const IGNORED = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage'])

async function listCodeFiles(cwd: string, limit = 60): Promise<string[]> {
  const out: string[] = []
  const stack = CODE_DIRS.map(d => path.join(cwd, d)).filter(d => fs.existsSync(d))
  while (stack.length > 0 && out.length < limit) {
    const dir = stack.pop() as string
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!IGNORED.has(e.name)) stack.push(path.join(dir, e.name)) }
      else if (out.length < limit) out.push(path.relative(cwd, path.join(dir, e.name)).replace(/\\/g, '/'))
    }
  }
  return out.sort()
}

async function collectDocs(cwd: string): Promise<CycleDoc[]> {
  const docs: CycleDoc[] = []
  for (const phase of CYCLE_PHASES) {
    if (phase === 'T') {
      const files = await listCodeFiles(cwd)
      if (files.length > 0) docs.push({ phase, path: CODE_DIRS.join(', '), content: files.join('\n') })
      continue
    }
    const rel = PHASE_DOCS[phase]
    const abs = path.join(cwd, rel)
    if (fs.existsSync(abs)) docs.push({ phase, path: rel, content: await fs.readFile(abs, 'utf-8') })
  }
  return docs
}

async function runAnalysis(cwd: string, opts: CycleOptions): Promise<void> {
  const config = await readConfig(cwd)
  const aiConfig = await resolveAiConfig(opts)
  const state = await readCycle(cwd)
  const status = await computeCycleStatus(cwd, state)
  const docs = await collectDocs(cwd)

  if (docs.length === 0) {
    p.log.warn("Aucun document de phase à analyser. Lancez d'abord kuate projet ou kuate next.")
    return
  }

  console.log(chalk.dim(`  ${PROVIDER_LABELS[aiConfig.provider]} / ${aiConfig.model}`))
  const spin = p.spinner()
  spin.start('Analyse du cycle par IA...')
  let analysis
  try {
    analysis = await analyzeCycleWithAI(docs, formatCycleSummary(status, state), aiConfig, config.lang)
  } catch (err) {
    spin.stop(chalk.red(`Analyse impossible : ${(err as Error).message}`))
    return
  }
  spin.stop(chalk.green('Analyse terminée'))

  console.log()
  if (analysis.summary) console.log(`  ${analysis.summary}`)
  if (analysis.issues.length > 0) {
    console.log()
    console.log(chalk.bold('  Problèmes relevés :'))
    for (const issue of analysis.issues) {
      const color = PHASE_COLORS[issue.phase] ?? '#888'
      console.log(`    ${chalk.bold.hex(color)(`[${issue.phase}]`)} ${issue.problem}`)
      console.log(chalk.dim(`        → ${issue.fix}`))
    }
  }
  if (analysis.recommendations.length > 0) {
    console.log()
    console.log(chalk.bold('  Recommandations :'))
    for (const r of analysis.recommendations) console.log(`    · ${r}`)
  }
  console.log()

  if (analysis.recommendations.length > 0 && process.stdout.isTTY) {
    const save = await p.confirm({
      message: "Enregistrer les recommandations comme notes d'ajustement (transmises aux agents) ?",
      initialValue: false,
    })
    if (!p.isCancel(save) && save) {
      for (const r of analysis.recommendations) await addCycleNote(cwd, r)
      p.log.success(`${analysis.recommendations.length} note(s) ajoutée(s)`)
    }
  }
}

async function pickPhase(cwd: string, message: string): Promise<Phase | null> {
  const status = await computeCycleStatus(cwd)
  const res = await p.select<{ value: string; label: string; hint?: string }[], string>({
    message,
    options: status.phases.map(ps => ({
      value: ps.phase,
      label: `${ps.phase} — ${ps.name}`,
      hint: ps.artifact,
    })),
  })
  if (p.isCancel(res)) return null
  return res as Phase
}

export async function cycleCommand(cwd: string, opts: CycleOptions = {}): Promise<void> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red("Aucun projet KUATE trouvé. Lancez kuate init d'abord."))
    process.exit(1)
  }
  const config = await readConfig(cwd)
  initI18n(config.lang)

  if (opts.json) {
    const state = await readCycle(cwd)
    const status = await computeCycleStatus(cwd, state)
    console.log(JSON.stringify({ project: config.project, ...status, overrides: state.overrides, notes: state.notes }, null, 2))
    return
  }

  const interactive = !!process.stdin.isTTY && !!process.stdout.isTTY
  let analysedOnce = false

  while (true) {
    const state = await readCycle(cwd)
    const status = await computeCycleStatus(cwd, state)

    console.log()
    console.log(chalk.bold.hex('#FF8C00')(`  Cycle KUATE — ${config.project}`))
    console.log()
    console.log('  ' + renderTracker(status))
    console.log()
    console.log(renderCycleTable(status))
    if (state.notes.length > 0) {
      console.log()
      console.log(chalk.dim(`  ${state.notes.length} note(s) d'ajustement active(s)`))
    }
    console.log()

    if (opts.analyse && !analysedOnce) {
      analysedOnce = true
      await runAnalysis(cwd, opts)
      if (!interactive) return
      continue
    }
    if (!interactive) return

    const action = await p.select<{ value: string; label: string }[], string>({
      message: 'Ajuster le cycle ?',
      options: [
        { value: 'analyse', label: 'Analyser la cohérence (IA)' },
        { value: 'relaunch', label: 'Relancer une phase (ancien document sauvegardé)' },
        { value: 'validate', label: 'Marquer une phase comme validée' },
        { value: 'skip', label: 'Sauter une phase' },
        { value: 'reopen', label: 'Rouvrir une phase (annuler sautée / validée)' },
        { value: 'note', label: "Ajouter une note d'ajustement pour les agents" },
        { value: 'quit', label: 'Quitter' },
      ],
    })
    if (p.isCancel(action) || action === 'quit') { p.outro('Terminé'); return }

    if (action === 'analyse') {
      await runAnalysis(cwd, opts)
    } else if (action === 'note') {
      const text = await p.text({
        message: "Note d'ajustement :",
        placeholder: 'ex: MVP web uniquement, pas de mobile',
        validate: v => (v.trim().length < 3 ? 'Trop court' : undefined),
      })
      if (!p.isCancel(text)) { await addCycleNote(cwd, String(text)); p.log.success('Note ajoutée') }
    } else {
      const phase = await pickPhase(cwd, 'Quelle phase ?')
      if (!phase) continue

      if (action === 'validate') {
        await setPhaseOverride(cwd, phase, 'validated')
        p.log.success(`Phase ${phase} validée : ne sera plus considérée périmée`)
      } else if (action === 'skip') {
        await setPhaseOverride(cwd, phase, 'skipped')
        p.log.success(`Phase ${phase} sautée : kuate projet et kuate next l'ignoreront`)
      } else if (action === 'reopen') {
        await setPhaseOverride(cwd, phase, null)
        p.log.success(`Phase ${phase} rouverte`)
      } else if (action === 'relaunch') {
        const ok = await p.confirm({
          message: `Relancer la phase ${phase} (${CYCLE_PHASE_NAMES[phase]}) ?`,
          initialValue: true,
        })
        if (p.isCancel(ok) || !ok) continue
        const backup = await backupPhaseArtifact(cwd, phase)
        if (backup) p.log.info(`Ancien document sauvegardé : ${backup}`)
        await setPhaseOverride(cwd, phase, null)
        const { projetCommand } = await import('./projet.js')
        await projetCommand(cwd, phase, { provider: opts.provider, model: opts.model, chooseAi: opts.chooseAi })
        return
      }
    }
  }
}
