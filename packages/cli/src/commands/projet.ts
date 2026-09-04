/**
 * kuate projet — Pipeline complet K→U→A→T→E
 *
 * Lance les agents phase par phase pour générer tous les livrables du projet :
 *   K  Knower      → docs/specs.md        (user stories, exigences, critères)
 *   U  Unifier     → docs/backlog.md      (backlog priorisé, sprints)
 *   A  Architect   → docs/architecture.md (stack, décisions, schémas)
 *   T  Transformer → code source          (mode autonome ou export outil externe)
 *   E  Evaluator   → docs/evaluation.md  (qualité, tests, sécurité, retro)
 *
 * Après chaque phase : proposition de continuer, exporter ou arrêter.
 */

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
  PROVIDER_LABELS,
} from '@methode-kuate/core'
import type { Phase } from '@methode-kuate/core'
import { AGENTS_DEV } from '@methode-kuate/agents-dev'
import { AGENTS_BUSINESS } from '@methode-kuate/agents-business'
import { AGENTS_CONTENT } from '@methode-kuate/agents-content'
import { AGENTS_EDUCATION } from '@methode-kuate/agents-education'
import { initI18n } from '../i18n/index.js'

// ── Types ─────────────────────────────────────────────────────────────────────

type PipelinePhase = 'K' | 'U' | 'A' | 'T' | 'E'

interface PhaseConfig {
  id: PipelinePhase
  name: string
  role: string
  color: string
  agentId: string
  fallbackAgentIds: string[]
  output: string         // path relatif depuis cwd
  taskBuilder: (project: string, method: string, description: string, lang: string) => string
}

// ── Phase configs ─────────────────────────────────────────────────────────────

const PHASES: PhaseConfig[] = [
  {
    id: 'K',
    name: 'Knower',
    role: 'Decouverte & Specifications',
    color: '#FFB300',
    agentId: 'business-analyst',
    fallbackAgentIds: ['expert-finance-tech', 'expert-communication'],
    output: 'docs/specs.md',
    taskBuilder: (project, method, description, lang) => lang === 'fr'
      ? `Tu travailles sur le projet "${project}" (methodologie ${method}).
${description ? `Description : ${description}` : ''}

Génère le document de spécifications complet (docs/specs.md) contenant :

1. **Objectif du projet** — problème résolu, valeur apportée
2. **Utilisateurs cibles** — personas, segments, besoins
3. **User stories** — format "En tant que [persona], je veux [action] afin de [bénéfice]"
   - Au minimum 8 user stories couvrant les fonctionnalités essentielles
4. **Critères d'acceptation** — pour chaque user story principale
5. **Contraintes techniques** — stack imposée, limites, non-fonctionnelles
6. **Hors scope** — ce qui n'est PAS dans le MVP
7. **Découpage KUATE** — quelles features pour K, U, A, T, E

Format de sortie obligatoire :
\`\`\`markdown
// docs/specs.md
# Spécifications — ${project}
...contenu complet...
\`\`\``
      : `You are working on project "${project}" (${method} methodology).
Generate the complete specification document (docs/specs.md) with user stories, acceptance criteria, constraints, and KUATE phase breakdown.
Output format:
\`\`\`markdown
// docs/specs.md
# Specifications — ${project}
...
\`\`\``,
  },
  {
    id: 'U',
    name: 'Unifier',
    role: 'Backlog & Planification',
    color: '#FF8C00',
    agentId: 'chef-projet',
    fallbackAgentIds: ['coach-agile', 'stratege-okr'],
    output: 'docs/backlog.md',
    taskBuilder: (project, method, _desc, lang) => lang === 'fr'
      ? `Tu travailles sur le projet "${project}" (${method}).
Les spécifications sont dans docs/specs.md.

Génère le backlog priorisé et le plan de développement (docs/backlog.md) :

1. **Backlog produit** — toutes les user stories triées par priorité (MoSCoW)
2. **MVP** — scope minimal viable, avec critère de "done"
3. **Découpage en sprints** (ou phases pour méthodes non-Agile) :
   - Sprint 1 : [features] — objectif : [livrable démontrable]
   - Sprint 2 : etc.
4. **Risques** — top 3 avec mitigation
5. **Dépendances** — ordre de développement contraint

Format obligatoire :
\`\`\`markdown
// docs/backlog.md
# Backlog — ${project}
...
\`\`\``
      : `Generate the prioritized backlog and development plan for "${project}" in docs/backlog.md. Include MoSCoW priorities, MVP scope, sprint breakdown, risks.
\`\`\`markdown
// docs/backlog.md
# Backlog — ${project}
...
\`\`\``,
  },
  {
    id: 'A',
    name: 'Architect',
    role: 'Architecture & Conception',
    color: '#E06000',
    agentId: 'architecte-solution',
    fallbackAgentIds: ['expert-securite', 'tech-lead'],
    output: 'docs/architecture.md',
    taskBuilder: (project, _method, _desc, lang) => lang === 'fr'
      ? `Tu travailles sur le projet "${project}".
Les specs sont dans docs/specs.md. Le backlog dans docs/backlog.md.

Génère le document d'architecture technique (docs/architecture.md) :

1. **Stack technique** — langages, frameworks, bases de données, cloud — avec justification
2. **Architecture système** — composants, services, interactions (décris en ASCII ou texte structuré)
3. **Modèle de données** — entités principales, relations, champs clés
4. **API** — endpoints principaux (REST ou GraphQL), structure des réponses
5. **Sécurité** — authentification, autorisations, points d'attention OWASP
6. **Structure de fichiers** — arborescence du projet cible
7. **Décisions d'architecture** — alternatives écartées et pourquoi

Format obligatoire :
\`\`\`markdown
// docs/architecture.md
# Architecture — ${project}
...
\`\`\``
      : `Generate the technical architecture document for "${project}" in docs/architecture.md. Include stack decisions, data model, API design, security, file structure.
\`\`\`markdown
// docs/architecture.md
# Architecture — ${project}
...
\`\`\``,
  },
  {
    id: 'E',
    name: 'Evaluator',
    role: 'Qualite & Evaluation',
    color: '#8B3500',
    agentId: 'tech-lead',
    fallbackAgentIds: ['expert-securite', 'coach-agile', 'dev-senior'],
    output: 'docs/evaluation.md',
    taskBuilder: (project, _method, _desc, lang) => lang === 'fr'
      ? `Tu travailles sur le projet "${project}".
Les specs sont dans docs/specs.md, le backlog dans docs/backlog.md, l'architecture dans docs/architecture.md.

Génère le rapport d'évaluation qualité (docs/evaluation.md) :

1. **Critères d'acceptation** — vérification de chaque user story (liste : OK / A TESTER / NON COUVERT)
2. **Plan de tests** — tests unitaires, d'intégration, end-to-end à implémenter en priorité
   - Pour chaque test : fichier cible, fonction testée, cas nominal, cas d'erreur
3. **Audit de sécurité** — points OWASP Top 10 applicables, risques identifiés, mitigations
4. **Analyse de performance** — goulots d'étranglement potentiels, recommandations
5. **Dette technique** — éléments à refactoriser, TODO critiques
6. **Retrospective** — points forts du design, points d'amélioration, leçons apprises
7. **Prochaines itérations** — features v2, évolutions recommandées

Format obligatoire :
\`\`\`markdown
// docs/evaluation.md
# Evaluation — ${project}
...
\`\`\``
      : `Generate the quality evaluation report for "${project}" in docs/evaluation.md. Include acceptance criteria check, test plan, security audit, tech debt, retrospective.
\`\`\`markdown
// docs/evaluation.md
# Evaluation — ${project}
...
\`\`\``,
  },
]

// ── Utilitaires ───────────────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, string> = {
  K: '#FFB300', U: '#FF8C00', A: '#E06000', T: '#C04800', E: '#8B3500',
}

function phaseTracker(current: PipelinePhase | 'done', done: Set<string>): string {
  const all: Array<{ id: string; name: string }> = [
    { id: 'K', name: 'Knower' },
    { id: 'U', name: 'Unifier' },
    { id: 'A', name: 'Architect' },
    { id: 'T', name: 'Transformer' },
    { id: 'E', name: 'Evaluator' },
  ]

  return all.map((ph, i) => {
    const color = PHASE_COLORS[ph.id] ?? '#888'
    let badge: string
    if (ph.id === current) {
      badge = chalk.bold.hex(color)(`[ ${ph.id} ]`)
    } else if (done.has(ph.id)) {
      badge = chalk.hex(color)(`  ${ph.id}  `)
    } else {
      badge = chalk.dim(`  ${ph.id}  `)
    }
    return badge + (i < all.length - 1 ? chalk.dim(' ── ') : '')
  }).join('')
}

async function findAgent(
  cwd: string,
  phase: PhaseConfig,
): Promise<string | null> {
  const agentsDir = path.join(cwd, '.kuate', 'agents')
  const candidates = [phase.agentId, ...phase.fallbackAgentIds]
  for (const id of candidates) {
    if (fs.existsSync(path.join(agentsDir, `${id}.md`))) return id
  }
  return null
}

async function saveDoc(cwd: string, relPath: string, content: string): Promise<void> {
  const full = path.join(cwd, relPath)
  await fs.ensureDir(path.dirname(full))
  await fs.writeFile(full, content, 'utf-8')
}

async function loadDoc(cwd: string, relPath: string): Promise<string> {
  const full = path.join(cwd, relPath)
  if (!fs.existsSync(full)) return ''
  return fs.readFile(full, 'utf-8')
}

async function logMemory(cwd: string, phase: string, note: string): Promise<void> {
  const memPath = path.join(cwd, '.kuate', 'context', 'memory.md')
  const date = new Date().toISOString().split('T')[0]
  await fs.appendFile(memPath, `\n## ${date} — Phase ${phase} (kuate projet)\n\n${note}\n`)
}

// ── Export vers outil externe ─────────────────────────────────────────────────

async function exportToExternalTool(
  cwd: string,
  config: Awaited<ReturnType<typeof readConfig>>,
  generatedDocs: string[],
): Promise<void> {
  const toolChoice = await p.select<{ value: string; label: string; hint?: string }[], string>({
    message: 'Exporter vers quel outil ?',
    options: [
      {
        value: 'claude-code',
        label: 'Claude Code',
        hint: 'Genere .claude/AGENTS.md avec tout le contexte — lu automatiquement par claude',
      },
      {
        value: 'cursor',
        label: 'Cursor / Windsurf',
        hint: 'Genere .cursor/rules/kuate.md avec contexte et instructions',
      },
      {
        value: 'codex',
        label: 'Codex CLI (OpenAI)',
        hint: 'Genere KUATE-context.md avec prompt structure pour codex',
      },
      {
        value: 'generic',
        label: 'Autre (fichier universel)',
        hint: 'Genere KUATE-context.md lisible par n\'importe quel LLM',
      },
      {
        value: '__BACK__',
        label: chalk.dim('Retour'),
      },
    ],
  })

  if (p.isCancel(toolChoice) || toolChoice === '__BACK__') return

  // Assembler le contexte de tous les docs generés
  const contextParts: string[] = [
    `# Contexte projet KUATE — ${config.project}`,
    ``,
    `> Genere par \`kuate projet\` le ${new Date().toISOString().split('T')[0]}`,
    `> Methodologie : ${config.method}  |  Langue : ${config.lang}`,
    ``,
  ]

  for (const docPath of generatedDocs) {
    const content = await loadDoc(cwd, docPath)
    if (content.trim()) {
      contextParts.push(`---`)
      contextParts.push(``)
      contextParts.push(`## ${docPath}`)
      contextParts.push(``)
      contextParts.push(content.slice(0, 5000))
      contextParts.push(``)
    }
  }

  // Agents installés
  const agentsDir = path.join(cwd, '.kuate', 'agents')
  const agentFiles = fs.existsSync(agentsDir)
    ? (await fs.readdir(agentsDir)).filter(f => f.endsWith('.md'))
    : []

  if (agentFiles.length > 0) {
    contextParts.push(`---`)
    contextParts.push(``)
    contextParts.push(`## Agents KUATE disponibles`)
    contextParts.push(``)
    contextParts.push(`Les prompts complets sont dans \`.kuate/agents/\`. Agents installés :`)
    contextParts.push(agentFiles.map(f => `- ${f.replace('.md', '')}`).join('\n'))
    contextParts.push(``)
  }

  // Instructions finales
  contextParts.push(`---`)
  contextParts.push(``)
  contextParts.push(`## Instructions de developpement`)
  contextParts.push(``)
  contextParts.push(`Tu dois implémenter le projet "${config.project}" basé sur les spécifications ci-dessus.`)
  contextParts.push(``)
  contextParts.push(`Phase actuelle : **T — Transformer** (génération du code)`)
  contextParts.push(``)
  contextParts.push(`Ordre de développement (basé sur docs/backlog.md) :`)
  contextParts.push(`1. Infrastructure & configuration`)
  contextParts.push(`2. Modèles de données & base de données`)
  contextParts.push(`3. API & logique métier`)
  contextParts.push(`4. Interface utilisateur`)
  contextParts.push(`5. Tests & documentation`)
  contextParts.push(``)
  contextParts.push(`Pour chaque fichier généré, utilise le format :`)
  contextParts.push(`\`\`\`typescript`)
  contextParts.push(`// chemin/du/fichier.ts`)
  contextParts.push(`...code...`)
  contextParts.push(`\`\`\``)

  const contextContent = contextParts.join('\n')

  if (toolChoice === 'claude-code') {
    await fs.ensureDir(path.join(cwd, '.claude'))
    await fs.writeFile(path.join(cwd, '.claude', 'AGENTS.md'), contextContent, 'utf-8')
    await fs.writeFile(path.join(cwd, 'KUATE-context.md'), contextContent, 'utf-8')
    p.log.success(chalk.green('.claude/AGENTS.md genere — lu automatiquement par Claude Code'))
    console.log()
    console.log(chalk.dim('  Ouvrez ce dossier dans Claude Code :'))
    console.log(chalk.cyan('  claude'))

  } else if (toolChoice === 'cursor') {
    await fs.ensureDir(path.join(cwd, '.cursor', 'rules'))
    const cursorContent = `---\ndescription: Contexte KUATE — ${config.project}\nalwaysApply: true\n---\n\n` + contextContent
    await fs.writeFile(path.join(cwd, '.cursor', 'rules', 'kuate.md'), cursorContent, 'utf-8')
    p.log.success(chalk.green('.cursor/rules/kuate.md genere'))
    console.log(chalk.dim('  Ouvrez Cursor dans ce dossier.'))

  } else if (toolChoice === 'codex') {
    await fs.writeFile(path.join(cwd, 'KUATE-context.md'), contextContent, 'utf-8')
    p.log.success(chalk.green('KUATE-context.md genere'))
    console.log(chalk.dim('  Utilisez Codex CLI :'))
    console.log(chalk.cyan('  codex --context KUATE-context.md "Start with task 1: project setup"'))

  } else {
    await fs.writeFile(path.join(cwd, 'KUATE-context.md'), contextContent, 'utf-8')
    p.log.success(chalk.green('KUATE-context.md genere'))
    console.log(chalk.dim('  Ouvrez ce fichier et copiez-le dans votre outil IA.'))
  }

  console.log()
}

// ── Runner de phase (appel agent + save) ─────────────────────────────────────

async function runPhase(
  cwd: string,
  phase: PhaseConfig,
  config: Awaited<ReturnType<typeof readConfig>>,
  aiConfig: NonNullable<Awaited<ReturnType<typeof readGlobalAiConfig>>>,
  donePhaseDocs: string[],
  description: string,
): Promise<boolean> {
  const color = phase.color

  console.log()
  console.log(chalk.bold.hex(color)(`  ══ Phase ${phase.id} — ${phase.name} : ${phase.role} ══`))
  console.log()

  // Trouver l'agent
  const agentId = await findAgent(cwd, phase)
  if (!agentId) {
    p.log.warn(`Aucun agent de phase ${phase.id} installe. Phase ignoree.`)
    return false
  }

  // Vérifier si le doc existe déjà
  const docExists = fs.existsSync(path.join(cwd, phase.output))
  if (docExists) {
    const regen = await p.confirm({
      message: `${phase.output} existe deja. Regenerer ?`,
      initialValue: false,
    })
    if (p.isCancel(regen)) return false
    if (!regen) {
      donePhaseDocs.push(phase.output)
      return true
    }
  }

  const task = phase.taskBuilder(config.project, config.method, description, config.lang)

  console.log(chalk.dim(`  Agent : ${agentId}`))
  console.log(chalk.dim(`  Livrable : ${phase.output}`))
  console.log(chalk.dim('  ' + '─'.repeat(55)))
  console.log()

  let output = ''
  try {
    const result = await runAgent({
      agentId,
      task,
      cwd,
      aiConfig,
      onChunk: (chunk) => {
        process.stdout.write(chunk)
        output += chunk
      },
    })
    output = result.content
  } catch (err) {
    console.error(chalk.red(`\n  Erreur agent : ${(err as Error).message}`))
    return false
  }

  console.log('\n')

  // Sauvegarder le livrable — chercher dans les blocs de code d'abord
  const detectedFiles = detectFilesInOutput(output)
  const targetFile = detectedFiles.find(f =>
    f.filename.includes(path.basename(phase.output, '.md')) || f.filename === phase.output
  )

  if (targetFile) {
    await saveDoc(cwd, targetFile.filename, targetFile.content)
    p.log.success(chalk.green(`${targetFile.filename} sauvegarde`))
    donePhaseDocs.push(targetFile.filename)
  } else {
    // Sauvegarde directe du contenu brut
    await saveDoc(cwd, phase.output, output)
    p.log.success(chalk.green(`${phase.output} sauvegarde`))
    donePhaseDocs.push(phase.output)
  }

  // Sauvegarder aussi les autres fichiers détectés
  for (const f of detectedFiles) {
    if (f.filename !== phase.output && !f.filename.includes(path.basename(phase.output, '.md'))) {
      await saveDoc(cwd, f.filename, f.content)
      console.log(chalk.dim(`  + ${f.filename}`))
    }
  }

  await logMemory(cwd, phase.id, `Phase ${phase.id} (${phase.name}) : ${phase.output} genere par ${agentId}.`)

  return true
}

// ── Phase T — code generation ─────────────────────────────────────────────────

async function runPhaseT(
  cwd: string,
  config: Awaited<ReturnType<typeof readConfig>>,
  aiConfig: NonNullable<Awaited<ReturnType<typeof readGlobalAiConfig>>>,
  donePhaseDocs: string[],
): Promise<void> {
  const color = PHASE_COLORS.T

  console.log()
  console.log(chalk.bold.hex(color)('  ══ Phase T — Transformer : Generation du code ══'))
  console.log()

  const allAgents = [...AGENTS_DEV, ...AGENTS_BUSINESS, ...AGENTS_CONTENT, ...AGENTS_EDUCATION]
  const agentsDir = path.join(cwd, '.kuate', 'agents')

  const tAgents = ['dev-senior', 'expert-devops', 'tech-lead', 'expert-ia-ml', 'tuteur-ia']
  const installedT = allAgents.filter(a =>
    tAgents.includes(a.id) && fs.existsSync(path.join(agentsDir, `${a.id}.md`))
  )

  if (installedT.length === 0) {
    p.log.warn('Aucun agent de phase T installe. Lancez kuate init pour ajouter dev-senior, tech-lead, etc.')
    return
  }

  // Charger tout le contexte generé
  const contextParts: string[] = []
  for (const docPath of donePhaseDocs) {
    const content = await loadDoc(cwd, docPath)
    if (content.trim()) contextParts.push(`### ${docPath}\n${content.slice(0, 3000)}`)
  }
  const fullContext = contextParts.join('\n\n')

  const modeChoice = await p.select<{ value: string; label: string; hint?: string }[], string>({
    message: 'Mode Phase T ?',
    options: [
      {
        value: 'autonomous',
        label: chalk.bold.hex(color)('Autonome — les agents generent tout le code jusqu\'a la fin'),
        hint: 'L\'IA planifie les taches, code, valide et itere',
      },
      {
        value: 'export',
        label: 'Exporter vers Claude Code / Codex / Cursor',
        hint: 'Genere un fichier de contexte complet pour votre outil externe',
      },
      {
        value: '__BACK__',
        label: chalk.dim('Retour'),
      },
    ],
  })

  if (p.isCancel(modeChoice) || modeChoice === '__BACK__') return

  if (modeChoice === 'export') {
    await exportToExternalTool(cwd, config, donePhaseDocs)
    return
  }

  // Mode autonome — plan → generate → review
  const agentInputs = installedT.map(a => ({
    id: a.id,
    name: a.nameFr ?? a.name,
    domain: a.domain,
    phase: a.phase,
    description: a.descriptionFr ?? '',
  }))

  const planSpin = p.spinner()
  planSpin.start('Planification des taches de developpement basees sur les specs et l\'architecture...')

  let tasks
  try {
    tasks = await planProjectTasks(
      `Projet : ${config.project}\nMethodologie : ${config.method}\n\n${fullContext}`,
      agentInputs,
      aiConfig,
      config.lang,
    )
    planSpin.stop(chalk.green(`Plan genere — ${tasks.length} taches`))
  } catch (err) {
    planSpin.stop(chalk.red(`Erreur : ${(err as Error).message}`))
    return
  }

  if (tasks.length === 0) {
    p.log.warn('Aucune tache. Verifiez que docs/specs.md et docs/architecture.md ont ete generes.')
    return
  }

  // Afficher le plan
  console.log()
  console.log(chalk.bold.hex(color)('  Plan de developpement :'))
  console.log()
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    console.log(`  ${chalk.dim(`${i + 1}.`)} ${chalk.bold(t.title.padEnd(35))} ${chalk.cyan(t.agentId)}`)
    console.log(chalk.dim(`     ${t.description.slice(0, 90)}${t.description.length > 90 ? '...' : ''}`))
  }
  console.log()

  const confirmPlan = await p.confirm({
    message: `Lancer la generation avec ces ${tasks.length} taches ?`,
    initialValue: true,
  })
  if (p.isCancel(confirmPlan) || !confirmPlan) return

  const FILE_FORMAT = `\n\nIMPORTANT — Format obligatoire pour chaque fichier :\n\`\`\`typescript\n// chemin/exact/fichier.ts\n...code complet...\n\`\`\`\nUn bloc par fichier. Le chemin TOUJOURS en premiere ligne du bloc.`

  const allGeneratedFiles: string[] = []

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    const width = 30
    const filled = Math.round((i / tasks.length) * width)
    const bar = chalk.hex(color)('='.repeat(filled)) + chalk.dim('-'.repeat(width - filled))

    console.log()
    console.log(`  ${bar}  ${chalk.bold.hex(color)(`${i + 1}/${tasks.length}`)} ${task.title}`)
    console.log(chalk.dim(`  Agent : ${task.agentId}`))
    console.log(chalk.dim('  ' + '-'.repeat(55)))
    console.log()

    let output = ''
    try {
      const result = await runAgent({
        agentId: task.agentId,
        task: task.description + FILE_FORMAT,
        cwd,
        aiConfig,
        onChunk: (chunk) => {
          process.stdout.write(chunk)
          output += chunk
        },
      })
      output = result.content
    } catch (err) {
      console.error(chalk.red(`\n  Erreur : ${(err as Error).message}`))
      continue
    }

    console.log('\n')

    const files = detectFilesInOutput(output)
    for (const f of files) {
      await saveDoc(cwd, f.filename, f.content)
      console.log(chalk.green(`  ${f.filename}`))
      allGeneratedFiles.push(f.filename)
    }

    await logMemory(cwd, 'T', `${task.title} (${task.agentId}) — ${files.length} fichier(s) genere(s)`)
  }

  // Résumé Phase T
  const bar = chalk.hex(color)('='.repeat(30))
  console.log()
  console.log(`  ${bar}`)
  console.log(chalk.bold.hex(color)('  Phase T terminee'))
  console.log(chalk.green(`  ${tasks.length} taches  ${allGeneratedFiles.length} fichier(s) genere(s)`))
  if (allGeneratedFiles.length > 0) {
    for (const f of allGeneratedFiles.slice(0, 8)) console.log(`    ${f}`)
    if (allGeneratedFiles.length > 8) console.log(chalk.dim(`    ... et ${allGeneratedFiles.length - 8} autres`))
  }
  console.log()
  console.log()
}

// ── Entrée principale ─────────────────────────────────────────────────────────

export async function projetCommand(cwd: string, fromPhase?: PipelinePhase): Promise<void> {
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

  // Lire la description du projet depuis KUATE.md ou contexte
  let projectDescription = ''
  const kuateMd = path.join(cwd, 'KUATE.md')
  if (fs.existsSync(kuateMd)) {
    const km = await fs.readFile(kuateMd, 'utf-8')
    const m = km.match(/## Description\n\n([\s\S]+?)\n\n---/)
    if (m) projectDescription = m[1].trim()
  }
  if (!projectDescription) {
    const businessCtx = path.join(cwd, '.kuate', 'context', 'business.md')
    if (fs.existsSync(businessCtx)) {
      projectDescription = (await fs.readFile(businessCtx, 'utf-8')).slice(0, 500)
    }
  }

  console.log()
  console.log(chalk.bold.hex('#FF8C00')(`  Pipeline KUATE — ${config.project}`))
  console.log(chalk.dim(`  ${PROVIDER_LABELS[aiConfig.provider]} / ${aiConfig.model}  ·  ${config.method}`))
  console.log()

  // État des phases
  const done = new Set<string>()
  const phaseDocs: PhaseConfig['output'][] = []
  for (const ph of PHASES) {
    if (fs.existsSync(path.join(cwd, ph.output))) {
      done.add(ph.id)
      phaseDocs.push(ph.output)
    }
  }

  // Déterminer phase de départ
  const startPhase = fromPhase ?? ((): PipelinePhase => {
    if (!done.has('K')) return 'K'
    if (!done.has('U')) return 'U'
    if (!done.has('A')) return 'A'
    if (!done.has('T')) return 'T'
    return 'E'
  })()

  const phaseOrder: PipelinePhase[] = ['K', 'U', 'A', 'T', 'E']
  const startIdx = phaseOrder.indexOf(startPhase)

  const doneDocs: string[] = [...phaseDocs]

  for (let i = startIdx; i < phaseOrder.length; i++) {
    const currentPhase = phaseOrder[i]

    // Afficher le tracker
    console.log()
    console.log('  ' + phaseTracker(currentPhase, done))
    console.log()

    if (currentPhase === 'T') {
      // Phase T = code generation
      await runPhaseT(cwd, config, aiConfig, doneDocs)
      done.add('T')

      // Proposer de continuer vers Phase E
      const continueToE = await p.select<{ value: string; label: string; hint?: string }[], string>({
        message: 'Continuer vers Phase E — Evaluator ?',
        options: [
          {
            value: 'continue',
            label: chalk.green('Oui — generer docs/evaluation.md'),
            hint: 'Rapport qualite, plan de tests, audit securite, retrospective',
          },
          {
            value: 'export',
            label: 'Exporter vers outil externe maintenant',
            hint: 'Claude Code, Codex, Cursor — avec tout le contexte genere',
          },
          {
            value: 'skip',
            label: chalk.dim('Non — terminer ici'),
          },
        ],
      })

      if (p.isCancel(continueToE) || continueToE === 'skip') break
      if (continueToE === 'export') {
        await exportToExternalTool(cwd, config, doneDocs)
        break
      }
      // continueToE === 'continue' → loop continue → Phase E
      continue
    }

    const phaseDef = PHASES.find(ph => ph.id === currentPhase)!

    // Option de continuer ou sauter (sauf phase de départ)
    if (i > startIdx) {
      const continueChoice = await p.select<{ value: string; label: string; hint?: string }[], string>({
        message: `Lancer la Phase ${currentPhase} — ${phaseDef.name} ?`,
        options: [
          {
            value: 'continue',
            label: chalk.green(`Continuer — generer ${phaseDef.output}`),
          },
          {
            value: 'export',
            label: 'Exporter maintenant vers outil externe',
            hint: 'Claude Code, Codex, Cursor — avec le contexte des phases precedentes',
          },
          {
            value: 'skip',
            label: chalk.dim('Arreter ici'),
          },
        ],
      })

      if (p.isCancel(continueChoice) || continueChoice === 'skip') break

      if (continueChoice === 'export') {
        await exportToExternalTool(cwd, config, doneDocs)
        break
      }
    }

    const ok = await runPhase(cwd, phaseDef, config, aiConfig, doneDocs, projectDescription)
    if (ok) {
      done.add(currentPhase)
      console.log()
      console.log(chalk.dim('  ' + '─'.repeat(55)))
    }
  }

  // Résumé final
  console.log()
  console.log('  ' + phaseTracker('done', done))
  console.log()
  console.log(chalk.bold('  Livrables generes :'))
  for (const doc of doneDocs) {
    console.log(chalk.green(`    ${doc}`))
  }
  console.log()

  if (!done.has('T')) {
    console.log(chalk.dim('  Reprendre :') + ' ' + chalk.cyan('kuate projet'))
  } else if (!done.has('E')) {
    console.log(chalk.dim('  Phase E disponible :') + ' ' + chalk.cyan('kuate projet --from E'))
  } else {
    console.log(chalk.bold.hex('#8B3500')('  Pipeline complet K U A T E termine.'))
  }
  console.log()
}
