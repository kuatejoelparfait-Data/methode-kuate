import path from 'node:path'
import fs from 'fs-extra'
import chalk from 'chalk'
import * as p from '@clack/prompts'
import {
  isKuateProject,
  readConfig,
  readGlobalAiConfig,
  runAgent,
  detectFilesInOutput,
  planProjectTasks,
  reviewCodeOutput,
  PROVIDER_LABELS,
} from '@methode-kuate/core'
import type { Phase, ProjectTask } from '@methode-kuate/core'
import { AGENTS_DEV } from '@methode-kuate/agents-dev'
import { AGENTS_BUSINESS } from '@methode-kuate/agents-business'
import { AGENTS_CONTENT } from '@methode-kuate/agents-content'
import { AGENTS_EDUCATION } from '@methode-kuate/agents-education'
import { initI18n } from '../i18n/index.js'

const PHASE_INFO: Record<Phase, { name: string; desc: string; color: string }> = {
  K: { name: 'Knower',      desc: 'Decouvrir & Contextualiser', color: '#FFB300' },
  U: { name: 'Unifier',     desc: 'Agreger & Synthetiser',      color: '#FF8C00' },
  A: { name: 'Architect',   desc: 'Concevoir & Structurer',     color: '#E06000' },
  T: { name: 'Transformer', desc: 'Executer & Restructurer',    color: '#C04800' },
  E: { name: 'Evaluator',   desc: 'Evaluer & Valider',          color: '#8B3500' },
}

const PHASE_AGENTS: Record<Phase, string[]> = {
  K: ['business-analyst', 'expert-finance-tech', 'expert-communication'],
  U: ['chef-projet', 'coach-agile', 'expert-lean', 'stratege-okr'],
  A: ['architecte-solution', 'expert-securite', 'concepteur-pedagogique', 'createur-formation'],
  T: ['dev-senior', 'expert-devops', 'tech-lead', 'expert-ia-ml', 'tuteur-ia', 'social-media-strategist', 'createur-contenu-educatif'],
  E: ['qa-strategist', 'expert-performance', 'copywriter-technique', 'expert-seo', 'evaluateur-competences'],
}

const BACK = '__BACK__'
const QUIT = '__QUIT__'

function getInstalledAgentsForPhase(cwd: string, phase: Phase): string[] {
  return PHASE_AGENTS[phase].filter(id =>
    fs.existsSync(path.join(cwd, '.kuate', 'agents', `${id}.md`))
  )
}

async function saveFile(cwd: string, filename: string, content: string): Promise<void> {
  const filePath = path.join(cwd, filename)
  await fs.ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, content, 'utf-8')
}

async function saveMemoryEntry(cwd: string, agentId: string, note: string): Promise<void> {
  const memoryPath = path.join(cwd, '.kuate', 'context', 'memory.md')
  const date = new Date().toISOString().split('T')[0]
  await fs.appendFile(memoryPath, `\n## ${date} -- ${agentId}\n\n${note.trim()}\n`)
}

// ── Load full project context ─────────────────────────────────────────────────

async function loadFullContext(cwd: string): Promise<string> {
  const lines: string[] = []
  const contextDir = path.join(cwd, '.kuate', 'context')

  for (const sec of ['business', 'architecture', 'constraints', 'glossary', 'memory']) {
    const fp = path.join(contextDir, `${sec}.md`)
    if (!fs.existsSync(fp)) continue
    const content = (await fs.readFile(fp, 'utf-8')).trim()
    if (content.length < 50) continue
    lines.push(`### ${sec.toUpperCase()}\n${content.slice(0, 2000)}`)
  }

  const specsPath = path.join(cwd, 'docs', 'specs.md')
  if (fs.existsSync(specsPath)) {
    const specs = await fs.readFile(specsPath, 'utf-8')
    lines.push(`### SPECS\n${specs.slice(0, 4000)}`)
  }

  const kuateMd = path.join(cwd, 'KUATE.md')
  if (fs.existsSync(kuateMd)) {
    const km = await fs.readFile(kuateMd, 'utf-8')
    lines.push(`### KUATE.md\n${km.slice(0, 2000)}`)
  }

  return lines.join('\n\n')
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function progressBar(done: number, total: number, width = 30): string {
  const filled = Math.round((done / total) * width)
  const empty = width - filled
  return chalk.hex('#C04800')('='.repeat(filled)) + chalk.dim('-'.repeat(empty)) +
    chalk.dim(` ${done}/${total}`)
}

// ── EXPORT PHASE T FOR EXTERNAL TOOL ─────────────────────────────────────────

async function exportPhaseTForExternalTool(
  cwd: string,
  config: Awaited<ReturnType<typeof readConfig>>,
  tasks: ProjectTask[],
): Promise<void> {
  const toolChoice = await p.select<{ value: string; label: string; hint?: string }[], string>({
    message: 'Quel outil externe ?',
    options: [
      {
        value: 'claude-code',
        label: 'Claude Code',
        hint: 'Genere KUATE-phase-T.md + .claude/AGENTS.md avec instructions',
      },
      {
        value: 'codex',
        label: 'Codex CLI (OpenAI)',
        hint: 'Genere KUATE-phase-T.md avec prompt Codex structure',
      },
      {
        value: 'cursor',
        label: 'Cursor / Windsurf / Copilot',
        hint: 'Genere .cursor/rules/kuate-phase-t.md avec contexte agent',
      },
      {
        value: 'generic',
        label: 'Autre outil (fichier universel)',
        hint: 'Genere KUATE-phase-T.md lisible par n\'importe quel LLM',
      },
      {
        value: BACK,
        label: chalk.dim('Retour'),
      },
    ],
  })

  if (p.isCancel(toolChoice) || toolChoice === BACK) return

  const fullContext = await loadFullContext(cwd)
  const date = new Date().toISOString().split('T')[0]

  // Lire les prompts des agents si disponibles
  const agentPrompts: Record<string, string> = {}
  for (const task of tasks) {
    if (agentPrompts[task.agentId]) continue
    const agentFile = path.join(cwd, '.kuate', 'agents', `${task.agentId}.md`)
    if (fs.existsSync(agentFile)) {
      agentPrompts[task.agentId] = await fs.readFile(agentFile, 'utf-8')
    }
  }

  // ── Contenu commun ────────────────────────────────────────────────────────
  const taskListMd = tasks.map((t, i) =>
    `### Tache ${i + 1} : ${t.title}\n\n` +
    `**Agent** : \`${t.agentId}\`  \n` +
    `**Phase KUATE** : ${t.phase}  \n` +
    `**Description** : ${t.description}\n`
  ).join('\n')

  const agentPromptsMd = Object.entries(agentPrompts).map(([id, prompt]) =>
    `### Agent : ${id}\n\n\`\`\`\n${prompt.slice(0, 1500)}\n\`\`\``
  ).join('\n\n')

  const contextBlock = fullContext.length > 200
    ? `## Contexte projet\n\n${fullContext.slice(0, 6000)}`
    : ''

  let outputPath = ''
  let content = ''

  if (toolChoice === 'claude-code') {
    // AGENTS.md pour Claude Code (lu automatiquement par `claude`)
    const agentsMdPath = path.join(cwd, '.claude', 'AGENTS.md')
    await fs.ensureDir(path.join(cwd, '.claude'))

    const agentsMd = [
      `# Phase T KUATE — ${config.project}`,
      ``,
      `> Genere par kuate phase T le ${date}`,
      ``,
      `## Instructions pour Claude Code`,
      ``,
      `Ce fichier decrit le plan de developpement de la Phase T du projet **${config.project}**.`,
      `Executez les taches dans l'ordre. Pour chaque tache :`,
      `1. Lisez la description et le role de l'agent`,
      `2. Implementez le code correspondant`,
      `3. Validez avant de passer a la suivante`,
      ``,
      `---`,
      ``,
      contextBlock,
      ``,
      `## Plan de developpement (${tasks.length} taches)`,
      ``,
      taskListMd,
      ``,
      `## Prompts des agents`,
      ``,
      agentPromptsMd,
    ].join('\n')

    await fs.writeFile(agentsMdPath, agentsMd, 'utf-8')
    outputPath = '.claude/AGENTS.md'

    // Aussi KUATE-phase-T.md a la racine
    content = agentsMd
    await fs.writeFile(path.join(cwd, 'KUATE-phase-T.md'), content, 'utf-8')
    outputPath = '.claude/AGENTS.md + KUATE-phase-T.md'

  } else if (toolChoice === 'cursor') {
    const rulesDir = path.join(cwd, '.cursor', 'rules')
    await fs.ensureDir(rulesDir)
    outputPath = '.cursor/rules/kuate-phase-t.md'
    content = [
      `---`,
      `description: Phase T KUATE — plan de developpement ${config.project}`,
      `alwaysApply: true`,
      `---`,
      ``,
      `# Plan Phase T — ${config.project}`,
      ``,
      `> Genere le ${date}. Executez ces ${tasks.length} taches dans l'ordre.`,
      ``,
      contextBlock,
      ``,
      `## Taches`,
      ``,
      taskListMd,
      ``,
      `## Agents`,
      ``,
      agentPromptsMd,
    ].join('\n')
    await fs.writeFile(path.join(cwd, outputPath), content, 'utf-8')

  } else if (toolChoice === 'codex') {
    outputPath = 'KUATE-phase-T.md'
    content = [
      `# Plan Phase T — ${config.project}`,
      ``,
      `> Pour Codex CLI : \`codex --context KUATE-phase-T.md "execute task 1"\``,
      ``,
      contextBlock,
      ``,
      `## Taches a executer (${tasks.length} au total)`,
      ``,
      taskListMd,
      ``,
      `## Contexte agents`,
      ``,
      agentPromptsMd,
    ].join('\n')
    await fs.writeFile(path.join(cwd, outputPath), content, 'utf-8')

  } else {
    // generic
    outputPath = 'KUATE-phase-T.md'
    content = [
      `# Phase T — ${config.project}`,
      ``,
      `> Genere le ${date} par kuate phase T`,
      ``,
      contextBlock,
      ``,
      `## Plan (${tasks.length} taches)`,
      ``,
      taskListMd,
      ``,
      `## Prompts agents`,
      ``,
      agentPromptsMd,
    ].join('\n')
    await fs.writeFile(path.join(cwd, outputPath), content, 'utf-8')
  }

  console.log()
  p.log.success(chalk.green(`Fichier(s) genere(s) : ${outputPath}`))
  console.log()

  if (toolChoice === 'claude-code') {
    console.log(chalk.dim('  Ouvrez ce projet avec Claude Code :'))
    console.log(chalk.cyan('  claude'))
    console.log(chalk.dim('  Le fichier .claude/AGENTS.md sera lu automatiquement.'))
  } else if (toolChoice === 'cursor') {
    console.log(chalk.dim('  Ouvrez Cursor dans ce dossier — la regle sera appliquee automatiquement.'))
  } else if (toolChoice === 'codex') {
    console.log(chalk.dim('  Utilisez Codex CLI :'))
    console.log(chalk.cyan(`  codex --context KUATE-phase-T.md "execute task 1 : ${tasks[0]?.title ?? '...'}" `))
  } else {
    console.log(chalk.dim('  Ouvrez KUATE-phase-T.md et copiez le contenu dans votre outil IA.'))
  }
  console.log()
}

// ── AUTONOMOUS PHASE T ────────────────────────────────────────────────────────

async function autonomousPhaseT(
  cwd: string,
  config: Awaited<ReturnType<typeof readConfig>>,
  aiConfig: NonNullable<Awaited<ReturnType<typeof readGlobalAiConfig>>>,
): Promise<void> {
  const color = PHASE_INFO.T.color
  const allAgents = [...AGENTS_DEV, ...AGENTS_BUSINESS, ...AGENTS_CONTENT, ...AGENTS_EDUCATION]

  const agentsDir = path.join(cwd, '.kuate', 'agents')
  const installedT = allAgents.filter(a =>
    PHASE_AGENTS.T.includes(a.id) && fs.existsSync(path.join(agentsDir, `${a.id}.md`))
  )

  if (installedT.length === 0) {
    console.error(chalk.red('Aucun agent de phase T installe. Relancez kuate init.'))
    return
  }

  const spin = p.spinner()
  spin.start('Chargement du contexte des phases precedentes...')
  const fullContext = await loadFullContext(cwd)
  spin.stop(chalk.green('Contexte charge'))

  if (fullContext.length < 100) {
    p.log.warn('Contexte projet insuffisant. Lancez kuate memory seed puis kuate phase K, U, A avant la phase T.')
    const forceAny = await p.confirm({
      message: 'Continuer quand meme avec le contexte disponible ?',
      initialValue: false,
    })
    if (p.isCancel(forceAny) || !forceAny) return
  }

  const agentInputs = installedT.map(a => ({
    id: a.id,
    name: (a as Record<string, unknown>).nameFr as string ?? a.name,
    domain: a.domain,
    phase: a.phase,
    description: (a as Record<string, unknown>).descriptionFr as string ?? '',
  }))

  // Plan
  const planSpin = p.spinner()
  planSpin.start('Analyse du projet et planification des taches...')

  let tasks: ProjectTask[] = []
  try {
    tasks = await planProjectTasks(
      `Projet : ${config.project}\nMethodologie : ${config.method}\n\n${fullContext}`,
      agentInputs,
      aiConfig,
      config.lang,
    )
    planSpin.stop(chalk.green(`Plan genere -- ${tasks.length} taches`))
  } catch (err) {
    planSpin.stop(chalk.yellow(`Erreur planification : ${(err as Error).message}`))
    return
  }

  if (tasks.length === 0) {
    p.log.warn('Aucune tache generee. Enrichissez le contexte projet avec kuate memory seed.')
    return
  }

  // Display plan
  console.log()
  console.log(chalk.bold.hex(color)('  Plan de developpement :'))
  console.log()
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    console.log(`  ${chalk.dim(`${i + 1}.`)} ${chalk.bold(t.title.padEnd(35))} ${chalk.cyan(t.agentId)}`)
    console.log(chalk.dim(`     ${t.description.slice(0, 80)}${t.description.length > 80 ? '...' : ''}`))
  }
  console.log()

  // Mode selection with back
  const modeChoice = await p.select<{ value: string; label: string; hint?: string }[], string>({
    message: 'Mode de developpement ?',
    options: [
      {
        value: 'auto',
        label: chalk.bold.hex(color)('Autonome -- les agents iterent seuls jusqu\'a validation'),
        hint: 'Generation > Revue tech-lead > Correction > Sauvegarde automatique',
      },
      {
        value: 'supervised',
        label: 'Supervise -- confirmation apres chaque tache',
        hint: 'Vous validez manuellement avant de passer a la suivante',
      },
      {
        value: 'interactive',
        label: 'Interactif classique -- choisir agent par agent',
      },
      {
        value: 'export',
        label: 'Exporter vers un outil externe',
        hint: 'Claude Code, Codex, Cursor, Windsurf... — genere un fichier pret a ouvrir',
      },
      {
        value: BACK,
        label: chalk.dim('Retour'),
      },
    ],
  })

  if (p.isCancel(modeChoice) || modeChoice === BACK) return

  if (modeChoice === 'interactive') {
    await interactivePhaseLoop(cwd, 'T', config, aiConfig)
    return
  }

  if (modeChoice === 'export') {
    await exportPhaseTForExternalTool(cwd, config, tasks)
    return
  }

  let autoSave = modeChoice === 'auto'
  if (modeChoice === 'supervised') {
    const svChoice = await p.confirm({ message: 'Auto-save des fichiers generes ?', initialValue: true })
    if (p.isCancel(svChoice)) return
    autoSave = svChoice
  }

  console.log()
  console.log(chalk.bold.hex(color)('  == Developpement autonome demarre =='))
  console.log(chalk.dim(`  ${tasks.length} taches  revue automatique  ${PROVIDER_LABELS[aiConfig.provider]}`))
  console.log()

  const allGeneratedFiles: string[] = []
  let tasksDone = 0

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]

    console.log()
    console.log(
      `  ${progressBar(i, tasks.length)}  ` +
      chalk.bold.hex(color)(`Tache ${i + 1}/${tasks.length} : ${task.title}`)
    )
    console.log(chalk.dim(`  Agent : ${task.agentId}`))
    console.log(chalk.dim('  ' + '-'.repeat(60)))
    console.log()

    let output = ''
    let approved = false
    let attempts = 0
    const MAX_ATTEMPTS = 2

    // Instruction de format fichier — obligatoire pour detectFilesInOutput
    const FILE_FORMAT_INSTRUCTION = `\n\nIMPORATNT — Format obligatoire pour chaque fichier généré :
\`\`\`typescript
// chemin/exact/du/fichier.ts
...code complet ici...
\`\`\`
Le chemin doit être la PREMIÈRE ligne du bloc, en commentaire. Un bloc par fichier.`

    while (!approved && attempts < MAX_ATTEMPTS) {
      const taskPrompt = attempts === 0
        ? task.description + FILE_FORMAT_INSTRUCTION
        : `CORRECTION DEMANDEE -- Reprends et corrige les problemes suivants, en regénérant TOUS les fichiers dans le bon format.\n\nProblemes : ${output.slice(0, 500)}\n\nFix demandé : ${task.description}` + FILE_FORMAT_INSTRUCTION

      try {
        const result = await runAgent({
          agentId: task.agentId,
          task: taskPrompt,
          cwd,
          aiConfig,
          onChunk: (chunk) => process.stdout.write(chunk),
        })
        output = result.content
      } catch (err) {
        console.error(chalk.red(`\n  Erreur agent : ${(err as Error).message}`))
        break
      }

      console.log('\n')

      const files = detectFilesInOutput(output)
      if (files.length > 0) {
        if (autoSave) {
          for (const f of files) {
            await saveFile(cwd, f.filename, f.content)
            console.log(chalk.green(`  ${f.filename}`))
            allGeneratedFiles.push(f.filename)
          }
        } else {
          const sv = await p.confirm({
            message: `Sauvegarder ${files.length} fichier(s) ?`,
            initialValue: true,
          })
          if (!p.isCancel(sv) && sv) {
            for (const f of files) {
              await saveFile(cwd, f.filename, f.content)
              allGeneratedFiles.push(f.filename)
            }
          }
        }
      }

      if (output.length > 100) {
        const reviewSpin = p.spinner()
        reviewSpin.start(`Revue technique (tentative ${attempts + 1}/${MAX_ATTEMPTS})...`)
        const review = await reviewCodeOutput(output, task.description, aiConfig, config.lang)

        if (review.approved) {
          reviewSpin.stop(chalk.green('Code valide'))
          approved = true
        } else {
          reviewSpin.stop(chalk.yellow(`${review.issues.length} probleme(s) identifie(s)`))
          for (const issue of review.issues) {
            console.log(chalk.yellow(`    - ${issue}`))
          }
          if (attempts < MAX_ATTEMPTS - 1) {
            console.log(chalk.dim('  > Correction automatique en cours...'))
            console.log()
          }
        }
      } else {
        approved = true
      }

      attempts++
    }

    if (modeChoice === 'supervised' && i < tasks.length - 1) {
      const cont = await p.confirm({
        message: `Tache ${i + 1} terminee. Continuer vers : "${tasks[i + 1].title}" ?`,
        initialValue: true,
      })
      if (p.isCancel(cont) || !cont) {
        p.log.warn(`Developpement interrompu a la tache ${i + 1}.`)
        break
      }
    }

    await saveMemoryEntry(cwd, task.agentId, `[Phase T] ${task.title} -- termine`)
    tasksDone++
  }

  // Summary
  console.log()
  console.log(progressBar(tasksDone, tasks.length))
  console.log()
  console.log(chalk.bold.hex(color)('  == Phase T terminee =='))
  console.log()
  console.log(chalk.green(`  ${tasksDone}/${tasks.length} taches realisees`))
  console.log(chalk.green(`  ${allGeneratedFiles.length} fichier(s) sauvegarde(s)`))
  if (allGeneratedFiles.length > 0) {
    for (const f of allGeneratedFiles.slice(0, 8)) {
      console.log(`    - ${f}`)
    }
    if (allGeneratedFiles.length > 8) {
      console.log(chalk.dim(`    ... et ${allGeneratedFiles.length - 8} autres`))
    }
  }
  console.log()
  console.log(chalk.dim('  Phase suivante :') + ' ' + chalk.bold.hex('#8B3500')('[ E ] Evaluator') + chalk.dim(' -- Evaluer & Valider'))
  console.log(chalk.dim('  Lancez : ') + chalk.cyan('kuate phase E'))
  console.log()
}

// ── CLASSIC INTERACTIVE LOOP ──────────────────────────────────────────────────

async function interactivePhaseLoop(
  cwd: string,
  phase: Phase,
  config: Awaited<ReturnType<typeof readConfig>>,
  aiConfig: NonNullable<Awaited<ReturnType<typeof readGlobalAiConfig>>>,
): Promise<void> {
  const phaseInfo = PHASE_INFO[phase]
  const installedAgents = getInstalledAgentsForPhase(cwd, phase)

  if (installedAgents.length === 0) {
    console.error(chalk.red(`Aucun agent de phase ${phase} installe.`))
    return
  }

  let continueSession = true

  while (continueSession) {
    // Agent selection
    const agentOptions = [
      ...installedAgents.map(id => ({
        value: id,
        label: id,
        hint: `agent ${phase}`,
      })),
      { value: QUIT, label: chalk.dim('Terminer la session') },
    ]

    const selectedAgent = await p.select<{ value: string; label: string; hint?: string }[], string>({
      message: 'Quel agent pour cette tache ?',
      options: agentOptions,
    })
    if (p.isCancel(selectedAgent) || selectedAgent === QUIT) {
      p.cancel('Session terminee')
      break
    }

    // Task input -- empty = back to agent selection
    const task = await p.text({
      message: 'Decris la tache (laisse vide pour revenir au choix d\'agent) :',
      placeholder: 'ex: creer le systeme d\'authentification avec Clerk',
    })
    if (p.isCancel(task)) { p.cancel('Session terminee'); break }
    const taskStr = String(task).trim()
    if (taskStr === '') continue

    console.log()
    console.log(chalk.bold.hex(phaseInfo.color)(`  [ ${String(selectedAgent)} ] en cours...`))
    console.log(chalk.dim('  ' + '-'.repeat(50)))
    console.log()

    let result
    try {
      result = await runAgent({
        agentId: String(selectedAgent),
        task: taskStr,
        cwd,
        aiConfig,
        onChunk: (chunk) => process.stdout.write(chunk),
      })
    } catch (err) {
      console.error(chalk.red(`\n  Erreur IA : ${(err as Error).message}`))
      const retry = await p.confirm({ message: 'Continuer la session ?', initialValue: true })
      if (p.isCancel(retry) || !retry) break
      continue
    }

    console.log()
    console.log(chalk.dim('  ' + '-'.repeat(50)))
    console.log()

    // File save
    const detectedFiles = detectFilesInOutput(result.content)
    if (detectedFiles.length > 0) {
      const saveFiles = await p.confirm({
        message: `Sauvegarder ${detectedFiles.length} fichier(s) detecte(s) ?`,
        initialValue: true,
      })
      if (!p.isCancel(saveFiles) && saveFiles) {
        for (const f of detectedFiles) {
          await saveFile(cwd, f.filename, f.content)
          console.log(chalk.green(`    ${f.filename}`))
        }
        console.log()
      }
    }

    // Memory note
    const memNote = await p.text({
      message: 'Note memoire ? (Entree pour ignorer)',
      placeholder: `${String(selectedAgent)} : ${taskStr.slice(0, 60)}`,
    })
    if (!p.isCancel(memNote) && String(memNote).trim()) {
      await saveMemoryEntry(cwd, String(selectedAgent), String(memNote).trim())
      p.log.success('Memorise dans .kuate/context/memory.md')
    }

    console.log()

    // Continue menu with back
    const next = await p.select<{ value: string; label: string }[], string>({
      message: 'Que faire ensuite ?',
      options: [
        { value: 'continue', label: `Continuer en phase ${phase}` },
        { value: 'same',     label: 'Meme agent -- nouvelle tache' },
        { value: 'quit',     label: chalk.dim('Terminer la session') },
      ],
    })

    if (p.isCancel(next) || next === 'quit') {
      continueSession = false
    }
    // 'same' keeps selectedAgent; 'continue' loops to agent selection
  }

  // Next phase suggestion
  const phases: Phase[] = ['K', 'U', 'A', 'T', 'E']
  const currentIdx = phases.indexOf(phase)
  if (currentIdx >= 0 && currentIdx < phases.length - 1) {
    const nextPhase = phases[currentIdx + 1]
    const nextInfo = PHASE_INFO[nextPhase]
    console.log()
    console.log(
      chalk.dim('  Phase suivante : ') +
      chalk.bold.hex(nextInfo.color)(`[ ${nextPhase} ] ${nextInfo.name}`) +
      chalk.dim(` -- ${nextInfo.desc}`)
    )
    console.log(chalk.dim('  Lancez : ') + chalk.cyan(`kuate phase ${nextPhase}`))
    console.log()
  } else if (currentIdx === phases.length - 1) {
    p.log.success('Phase E terminee -- projet complet !')
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function phaseCommand(cwd: string, phase: Phase): Promise<void> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red("Aucun projet KUATE trouve. Lancez kuate init d'abord."))
    process.exit(1)
  }

  const config = await readConfig(cwd)
  initI18n(config.lang)

  const aiConfig = await readGlobalAiConfig()
  if (!aiConfig) {
    console.error(chalk.red('IA non configuree. Lancez kuate config ai.'))
    process.exit(1)
  }

  const phaseInfo = PHASE_INFO[phase]

  console.log()
  console.log(chalk.bold.hex(phaseInfo.color)(`  [ ${phase} ] ${phaseInfo.name} -- ${phaseInfo.desc}`))
  console.log(chalk.dim(`  ${config.project}  /  ${PROVIDER_LABELS[aiConfig.provider]} / ${aiConfig.model}`))
  console.log()

  // Phase T: propose autonomous mode
  if (phase === 'T') {
    const modeSelect = await p.select<{ value: string; label: string; hint?: string }[], string>({
      message: 'Mode Phase T ?',
      options: [
        {
          value: 'autonomous',
          label: chalk.bold.hex(phaseInfo.color)('Autonome -- developpement complet de A a Z'),
          hint: 'L\'IA planifie, code, valide et itere jusqu\'a la fin du projet',
        },
        {
          value: 'interactive',
          label: 'Interactif -- choisir agent et tache a la main',
          hint: 'Controle total -- ideal pour des taches ponctuelles',
        },
        {
          value: BACK,
          label: chalk.dim('Retour'),
        },
      ],
    })

    if (p.isCancel(modeSelect) || modeSelect === BACK) {
      p.cancel('Annule')
      return
    }

    if (modeSelect === 'autonomous') {
      await autonomousPhaseT(cwd, config, aiConfig)
      return
    }
  }

  await interactivePhaseLoop(cwd, phase, config, aiConfig)
}
