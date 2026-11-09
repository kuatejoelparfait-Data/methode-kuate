import path from 'node:path'
import fs from 'fs-extra'
import chalk from 'chalk'
import * as p from '@clack/prompts'
import {
  isKuateProject,
  readConfig,
  readGlobalAiConfig,
  readCycle,
  computeCycleStatus,
  formatCycleSummary,
  formatHistory,
  fallbackSuggestions,
  recordHistory,
  backupFile,
  generateNextSuggestions,
  runAgent,
  detectFilesInOutput,
  PROVIDER_LABELS,
} from '@methode-kuate/core'
import { AGENTS_DEV } from '@methode-kuate/agents-dev'
import { AGENTS_BUSINESS } from '@methode-kuate/agents-business'
import { AGENTS_CONTENT } from '@methode-kuate/agents-content'
import { AGENTS_EDUCATION } from '@methode-kuate/agents-education'
import type { AgentDefinition } from '@methode-kuate/core'
import { initI18n } from '../i18n/index.js'
import { resolveAiConfig } from '../utils/ai-select.js'
import { renderTracker } from '../utils/cycle-view.js'
import type { AiSelectOptions } from '../utils/ai-select.js'

const PHASE_COLORS: Record<string, string> = {
  K: '#FFB300',
  U: '#FF8C00',
  A: '#E06000',
  T: '#C04800',
  E: '#8B3500',
}

const PHASE_NAMES: Record<string, string> = {
  K: 'Knower',
  U: 'Unifier',
  A: 'Architect',
  T: 'Transformer',
  E: 'Evaluator',
}

async function loadProjectContext(cwd: string, config: Awaited<ReturnType<typeof readConfig>>): Promise<string> {
  const contextDir = path.join(cwd, '.kuate', 'context')
  const sections = ['business', 'architecture', 'constraints', 'glossary']
  const lines: string[] = [
    `Projet : ${config.project}`,
    `Langue : ${config.lang}`,
    `Méthodologie : ${config.method}`,
    `Domaines : ${config.domains.join(', ')}`,
    '',
  ]

  for (const sec of sections) {
    const filePath = path.join(contextDir, `${sec}.md`)
    if (!fs.existsSync(filePath)) continue
    const content = (await fs.readFile(filePath, 'utf-8')).trim()
    if (!content || content.startsWith('# ') && content.length < 80) continue
    const preview = content.split('\n').slice(0, 10).join('\n')
    lines.push(`### ${sec.toUpperCase()}\n${preview}`)
  }

  return lines.join('\n')
}

async function loadRecentMemory(cwd: string): Promise<string> {
  const memPath = path.join(cwd, '.kuate', 'context', 'memory.md')
  if (!fs.existsSync(memPath)) return ''
  const content = await fs.readFile(memPath, 'utf-8')
  // Dernières 20 lignes significatives
  const lines = content.split('\n').filter(l => l.trim()).slice(-20)
  return lines.join('\n')
}

async function saveMemoryEntry(cwd: string, agentId: string, note: string): Promise<void> {
  const memoryPath = path.join(cwd, '.kuate', 'context', 'memory.md')
  const date = new Date().toISOString().split('T')[0]
  await fs.appendFile(memoryPath, `\n## ${date} — ${agentId}\n\n${note.trim()}\n`)
}

/** Statut du cycle + historique, transmis à l'IA pour des suggestions qui tiennent compte de l'avancement. */
async function loadCycleContext(cwd: string) {
  const state = await readCycle(cwd)
  const status = await computeCycleStatus(cwd, state)
  return {
    state,
    status,
    extra: {
      cycleSummary: formatCycleSummary(status, state),
      doneActions: formatHistory(state),
    },
  }
}

export async function nextCommand(cwd: string, aiOpts: AiSelectOptions = {}): Promise<void> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red("Aucun projet KUATE trouvé. Lancez kuate init d'abord."))
    process.exit(1)
  }

  const config = await readConfig(cwd)
  initI18n(config.lang)

  const aiConfig = await resolveAiConfig(aiOpts)

  // Agents installés dans ce projet
  const allAgents: AgentDefinition[] = [
    ...AGENTS_DEV,
    ...AGENTS_BUSINESS,
    ...AGENTS_CONTENT,
    ...AGENTS_EDUCATION,
  ]
  const agentsDir = path.join(cwd, '.kuate', 'agents')
  const installedAgents = allAgents.filter(a =>
    fs.existsSync(path.join(agentsDir, `${a.id}.md`))
  )

  if (installedAgents.length === 0) {
    console.error(chalk.red('Aucun agent installé. Relancez kuate init.'))
    process.exit(1)
  }

  console.log()
  console.log(
    chalk.bold.hex('#FF8C00')(`  ${config.project}`) +
    chalk.dim(` · ${PROVIDER_LABELS[aiConfig.provider]} / ${aiConfig.model}`)
  )
  const cycle0 = await loadCycleContext(cwd)
  console.log()
  console.log('  ' + renderTracker(cycle0.status))
  for (const issue of cycle0.status.issues.slice(0, 3)) console.log(chalk.yellow(`  ⚠ ${issue}`))
  console.log(chalk.dim('  kuate cycle pour analyser et ajuster le cycle'))
  console.log()
  console.log(chalk.dim('  Analyse du projet pour suggérer la prochaine action...'))
  console.log()

  // Charger contexte + mémoire
  const [projectContext, recentMemory] = await Promise.all([
    loadProjectContext(cwd, config),
    loadRecentMemory(cwd),
  ])

  const agentInputs = installedAgents.map(a => ({
    id: a.id,
    name: (a as Record<string, unknown>).nameFr as string ?? a.name,
    domain: a.domain,
    phase: a.phase,
    description: (a as Record<string, unknown>).descriptionFr as string ?? '',
  }))

  // Appel IA pour suggestions
  const spin = p.spinner()
  spin.start('Génération des suggestions...')

  const skippedPhases = new Set(
    Object.entries(cycle0.state.overrides).filter(([, v]) => v === 'skipped').map(([k]) => k),
  )
  const keepRelevant = <T extends { phase: string }>(list: T[]): T[] =>
    list.filter(s => !skippedPhases.has(s.phase))

  let suggestions: Awaited<ReturnType<typeof generateNextSuggestions>> = []
  try {
    suggestions = keepRelevant(await generateNextSuggestions(
      projectContext,
      agentInputs,
      recentMemory,
      aiConfig,
      config.lang,
      cycle0.extra,
    ))
    spin.stop(chalk.green(`${suggestions.length} suggestions générées`))
  } catch (err) {
    spin.stop(chalk.yellow(`Erreur IA : ${(err as Error).message}`))
  }

  if (suggestions.length === 0) {
    // Filet de sécurité : suggestions déterministes basées sur le cycle
    suggestions = fallbackSuggestions(cycle0.status, agentInputs)
    if (suggestions.length > 0) {
      p.log.warn('Suggestions IA indisponibles — suggestions de secours basées sur le cycle.')
    } else if (cycle0.status.next === null) {
      p.log.info('Cycle à jour. Vous pouvez décrire une tâche manuellement.')
    } else {
      p.log.warn('Aucune suggestion. Vérifiez la mémoire projet (kuate memory seed).')
    }
  }

  console.log()

  // ── Boucle interactive ────────────────────────────────────────────────────
  const CUSTOM = '__CUSTOM__'
  const QUIT = '__QUIT__'

  let continueLoop = true

  while (continueLoop) {
    if (suggestions.length === 0) console.log(chalk.dim('  (aucune suggestion — décrivez une tâche ou quittez)'))
    // Afficher les suggestions
    const options = [
      ...suggestions.map((s, i) => {
        const color = PHASE_COLORS[s.phase] ?? '#FF8C00'
        const phaseBadge = chalk.bold.hex(color)(`[${s.phase}]`)
        const agentLabel = chalk.cyan(s.agentId.padEnd(26))
        const taskLabel = chalk.white(
          s.task.length > 55 ? s.task.slice(0, 55) + '…' : s.task
        )
        return {
          value: String(i),
          label: `${phaseBadge} ${agentLabel} ${taskLabel}`,
          hint: s.reason,
        }
      }),
      { value: CUSTOM, label: chalk.dim('Decrire une autre tache manuellement') },
      { value: QUIT,   label: chalk.dim('Quitter') },
    ]

    const choice = await p.select<{ value: string; label: string; hint?: string }[], string>({
      message: 'Quelle action lancer ?',
      options,
    })

    if (p.isCancel(choice) || choice === QUIT) {
      p.cancel('Session terminée')
      break
    }

    let agentId: string
    let task: string

    if (choice === CUSTOM) {
      // Sélection manuelle de l'agent
      const agentChoice = await p.select<{ value: string; label: string; hint?: string }[], string>({
        message: 'Quel agent ?',
        options: [
          ...installedAgents.map(a => ({
            value: a.id,
            label: chalk.bold.hex(PHASE_COLORS[a.phase] ?? '#FF8C00')(`[${a.phase}]`) +
              '  ' + a.id,
            hint: a.domain,
          })),
          { value: '__BACK__', label: chalk.dim('Retour') },
        ],
      })
      if (p.isCancel(agentChoice) || agentChoice === '__BACK__') continue
      agentId = String(agentChoice)

      const taskInput = await p.text({
        message: 'Décris la tâche :',
        placeholder: 'ex: Créer le composant de tableau de bord avec graphiques',
        validate: (v) => (v.trim().length < 5 ? 'Trop court (min 5 caractères)' : undefined),
      })
      if (p.isCancel(taskInput)) break
      task = String(taskInput).trim()
    } else {
      const idx = parseInt(choice, 10)
      const selected = suggestions[idx]
      agentId = selected.agentId
      task = selected.task
    }

    // ── Exécuter l'agent ──────────────────────────────────────────────────
    console.log()
    const color = PHASE_COLORS[
      installedAgents.find(a => a.id === agentId)?.phase ?? 'T'
    ] ?? '#FF8C00'
    console.log(chalk.bold.hex(color)(`  ◆ ${agentId}`))
    console.log(chalk.dim(`  ${task}`))
    console.log(chalk.dim('  ' + '─'.repeat(55)))
    console.log()

    let result
    try {
      result = await runAgent({
        agentId,
        task,
        cwd,
        aiConfig,
        onChunk: (chunk) => process.stdout.write(chunk),
      })
    } catch (err) {
      console.error(chalk.red(`\n  Erreur IA : ${(err as Error).message}`))
      const retry = await p.confirm({ message: 'Continuer avec une autre action ?', initialValue: true })
      if (p.isCancel(retry) || !retry) break
      continue
    }

    console.log()
    console.log()
    console.log(chalk.dim('  ' + '─'.repeat(55)))
    console.log()

    await recordHistory(cwd, {
      agentId,
      task,
      phase: installedAgents.find(a => a.id === agentId)?.phase ?? 'T',
    })

    // Fichiers détectés
    const files = detectFilesInOutput(result.content)
    if (files.length > 0) {
      console.log(chalk.bold(`  ${files.length} fichier(s) généré(s) :`))
      for (const f of files) {
        console.log(`    ${chalk.cyan(f.filename)}`)
      }
      console.log()
      const existing = files.filter(f => fs.existsSync(path.join(cwd, f.filename)))
      if (existing.length > 0) {
        console.log(chalk.yellow(`  ${existing.length} fichier(s) existant(s) seront remplacés (ancienne version sauvegardée dans .kuate/backups) :`))
        for (const f of existing) console.log(chalk.dim(`    ${f.filename}`))
        console.log()
      }
      const saveFiles = await p.confirm({
        message: `Sauvegarder ${files.length > 1 ? 'tous les fichiers' : 'ce fichier'} dans le projet ?`,
        initialValue: true,
      })
      if (!p.isCancel(saveFiles) && saveFiles) {
        for (const f of files) {
          const filePath = path.join(cwd, f.filename)
          await backupFile(cwd, f.filename)
          await fs.ensureDir(path.dirname(filePath))
          await fs.writeFile(filePath, f.content, 'utf-8')
          console.log(`    ${chalk.green('✓')} ${f.filename}`)
        }
        console.log()
      }
    }

    // Note mémoire
    const memNote = await p.text({
      message: 'Note mémoire ? (Entrée pour ignorer)',
      placeholder: `${agentId} : ${task.slice(0, 60)}`,
    })
    if (!p.isCancel(memNote) && String(memNote).trim()) {
      await saveMemoryEntry(cwd, agentId, String(memNote).trim())
      p.log.success('Mémorisé dans .kuate/context/memory.md')
    }

    console.log()

    // Suite ?
    const next = await p.select<{ value: string; label: string }[], string>({
      message: 'Que faire ensuite ?',
      options: [
        { value: 'suggest', label: chalk.green('Nouvelles suggestions IA') },
        { value: 'same',    label: chalk.cyan('Choisir dans la meme liste') },
        { value: 'quit',    label: chalk.dim('Terminer') },
      ],
    })

    if (p.isCancel(next) || next === 'quit') {
      continueLoop = false
    } else if (next === 'suggest') {
      // Régénérer avec mémoire mise à jour
      const newMemory = await loadRecentMemory(cwd)
      const cycleNow = await loadCycleContext(cwd)
      console.log()
      console.log('  ' + renderTracker(cycleNow.status))
      const reSpin = p.spinner()
      reSpin.start('Nouvelles suggestions...')
      try {
        suggestions = keepRelevant(await generateNextSuggestions(
          projectContext,
          agentInputs,
          newMemory,
          aiConfig,
          config.lang,
          cycleNow.extra,
        ))
        reSpin.stop(chalk.green(`${suggestions.length} nouvelles suggestions`))
      } catch {
        suggestions = suggestions.length > 0 ? suggestions : fallbackSuggestions(cycleNow.status, agentInputs)
        reSpin.stop(chalk.yellow('Suggestions IA non régénérées — conservation des précédentes ou de secours'))
      }
      console.log()
    }
    // 'same' → reboucle avec même liste
  }

  console.log()
  console.log(chalk.dim(`  Session terminée · ${config.project}`))
  console.log()
}
