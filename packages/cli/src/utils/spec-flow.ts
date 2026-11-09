import path from 'node:path'
import fs from 'fs-extra'
import chalk from 'chalk'
import * as p from '@clack/prompts'
import {
  readConfig,
  readSpecFiles,
  analyzeSpecs,
  issuesForPhase,
  parseSpecs,
  runAgent,
  detectFilesInOutput,
  reviewSpecDocument,
  buildAuthorTask,
  buildRevisionTask,
  filterDocFiles,
  isPhaseOutput,
  findMarkers,
  applyClarification,
  appendClarification,
  ensureConstitutionFlags,
  backupFile,
  recordHistory,
  SPEC_PHASE_AGENTS,
  SPEC_PATHS,
  PROVIDER_LABELS,
} from '@methode-kuate/core'
import type { AiConfig, SpecFiles, SpecPhase, SpecReviewIssue } from '@methode-kuate/core'
import { PHASE_COLORS } from './cycle-view.js'

export function isInteractive(): boolean {
  return !!process.stdin.isTTY && !!process.stdout.isTTY
}

/** Écrit un fichier en sauvegardant l'ancienne version dans .kuate/backups/. */
export async function writeWithBackup(cwd: string, rel: string, content: string): Promise<string | null> {
  const backup = await backupFile(cwd, rel)
  const abs = path.join(cwd, rel)
  await fs.ensureDir(path.dirname(abs))
  await fs.writeFile(abs, content, 'utf-8')
  return backup
}

async function loadAgentPrompt(cwd: string, agentId: string): Promise<string | null> {
  const file = path.join(cwd, '.kuate', 'agents', `${agentId}.md`)
  return (await fs.pathExists(file)) ? fs.readFile(file, 'utf-8') : null
}

async function loadDescription(cwd: string): Promise<string> {
  const kuateMd = path.join(cwd, 'KUATE.md')
  if (await fs.pathExists(kuateMd)) {
    const m = (await fs.readFile(kuateMd, 'utf-8')).match(/## Description\n\n([\s\S]+?)\n\n---/)
    if (m) return m[1].trim()
  }
  const business = path.join(cwd, '.kuate', 'context', 'business.md')
  return (await fs.pathExists(business)) ? (await fs.readFile(business, 'utf-8')).slice(0, 500) : ''
}

function priorDocs(files: SpecFiles, phase: SpecPhase): string {
  const parts: string[] = []
  const add = (rel: string, text: string | undefined): void => {
    if (text && text.trim()) parts.push(`### ${rel}\n\n${text.trim().slice(0, 12000)}`)
  }
  add(SPEC_PATHS.constitution, files.constitution)
  if (phase !== 'K') add(SPEC_PATHS.specs, files.specs)
  if (phase === 'A') add(SPEC_PATHS.backlog, files.backlog)
  return parts.join('\n\n')
}

/** Enregistre les fichiers de la sortie d'un agent : seulement les sorties attendues de la phase, sous docs/. */
async function savePhaseOutputs(cwd: string, phase: SpecPhase, content: string): Promise<string[]> {
  const files = filterDocFiles(detectFilesInOutput(content)).filter(f => isPhaseOutput(phase, f.filename))
  const saved: string[] = []
  for (const f of files) {
    const backup = await writeWithBackup(cwd, f.filename, f.content)
    saved.push(f.filename)
    console.log(`    ${chalk.green('✓')} ${f.filename}${backup ? chalk.dim(`  (ancienne version : ${backup})`) : ''}`)
  }
  return saved
}

async function readDocs(cwd: string, rels: string[]): Promise<string> {
  const parts: string[] = []
  for (const rel of rels) parts.push(`### ${rel}\n\n${await fs.readFile(path.join(cwd, rel), 'utf-8')}`)
  return parts.join('\n\n')
}

function printIssues(issues: SpecReviewIssue[]): void {
  for (const i of issues) {
    const tag = i.severity === 'blocking' ? chalk.red('bloquant') : i.severity === 'major' ? chalk.yellow('important') : chalk.dim('mineur')
    console.log(`      [${tag}] ${i.problem}`)
    if (i.suggestion) console.log(chalk.dim(`          → ${i.suggestion}`))
  }
}

function stepTitle(label: string, detail: string): void {
  console.log()
  console.log(chalk.bold(`  ${label}`) + chalk.dim(`  ${detail}`))
}

/** Pose chaque question ouverte ([NEEDS CLARIFICATION]) à l'humain et enregistre les réponses. */
export async function clarifyAll(cwd: string): Promise<{ resolved: number; remaining: number }> {
  const files = await readSpecFiles(cwd)
  const entries: Array<[string, string]> = [
    [SPEC_PATHS.constitution, files.constitution],
    [SPEC_PATHS.specs, files.specs],
    [SPEC_PATHS.backlog, files.backlog],
    [SPEC_PATHS.architecture, files.architecture],
    [SPEC_PATHS.dataModel, files.dataModel],
    ...Object.entries(files.contracts),
  ].filter((e): e is [string, string] => typeof e[1] === 'string')

  const interactive = isInteractive()
  const date = new Date().toISOString().slice(0, 10)
  let journal = files.clarifications
  let resolved = 0
  let remaining = 0
  let cancelled = false

  for (const [rel, original] of entries) {
    let text = original
    for (const m of findMarkers(original)) {
      if (cancelled || !interactive) {
        remaining++
        if (!interactive) console.log(`  ${rel} : ${m.question}`)
        continue
      }
      const answer = await p.text({
        message: `${rel} — ${m.question}`,
        validate: v => (v.trim() ? undefined : 'Réponse requise (Ctrl+C pour arrêter)'),
      })
      if (p.isCancel(answer)) { cancelled = true; remaining++; continue }
      const value = String(answer).trim()
      text = applyClarification(text, m.raw, value)
      journal = appendClarification(journal, { date, file: rel, question: m.question, answer: value })
      resolved++
    }
    if (text !== original) await writeWithBackup(cwd, rel, text)
  }
  if (journal !== files.clarifications && journal !== undefined) await writeWithBackup(cwd, SPEC_PATHS.clarifications, journal)
  return { resolved, remaining }
}

/** Boucle d'une phase : rédiger, relire, réviser, clarifier, porte. */
export async function runSpecPhase(cwd: string, phase: SpecPhase, aiConfig: AiConfig): Promise<{ gatePassed: boolean }> {
  const config = await readConfig(cwd)
  const { lead, reviewers } = SPEC_PHASE_AGENTS[phase]
  const leadPrompt = await loadAgentPrompt(cwd, lead)
  if (!leadPrompt) {
    console.error(chalk.red(`  Agent ${lead} introuvable dans .kuate/agents/. Lancez kuate init.`))
    process.exitCode = 1
    return { gatePassed: false }
  }

  const files = await readSpecFiles(cwd)
  const flags = parseSpecs(files).flags
  let description = await loadDescription(cwd)
  if (phase === 'A') {
    description += `\nDonnées persistantes : ${flags.hasData ? 'oui' : 'non'} ; API exposée : ${flags.hasApi ? 'oui' : 'non'} (ne produis data-model.md et les contrats que si oui).`
  }

  console.log()
  console.log(chalk.bold.hex(PHASE_COLORS[phase] ?? '#FF8C00')(`  Phase ${phase} — spécification`))
  console.log(chalk.dim(`  ${PROVIDER_LABELS[aiConfig.provider]} / ${aiConfig.model}`))

  stepTitle('1/5 Rédaction', lead)
  console.log()
  const authored = await runAgent({
    agentId: lead,
    task: buildAuthorTask(phase, { project: config.project, method: config.method, description, priorDocs: priorDocs(files, phase) }),
    cwd,
    aiConfig,
    onChunk: c => process.stdout.write(c),
  })
  console.log()
  let saved = await savePhaseOutputs(cwd, phase, authored.content)
  if (saved.length === 0) {
    console.error(chalk.red(`  Aucun fichier attendu détecté dans la réponse de ${lead} (sorties : docs/…). Relancez kuate spec.`))
    process.exitCode = 1
    return { gatePassed: false }
  }

  stepTitle('2/5 Relecture', reviewers.join(', '))
  const issues: SpecReviewIssue[] = []
  for (const reviewer of reviewers) {
    const reviewerPrompt = await loadAgentPrompt(cwd, reviewer)
    if (!reviewerPrompt) {
      p.log.warn(`Relecteur ${reviewer} absent du projet : sauté.`)
      continue
    }
    const spin = p.spinner()
    spin.start(`Relecture par ${reviewer}…`)
    try {
      const found = await reviewSpecDocument({ phase, reviewerPrompt, doc: await readDocs(cwd, saved) }, aiConfig)
      issues.push(...found)
      spin.stop(`${reviewer} : ${found.length} remarque(s)`)
    } catch (err) {
      spin.stop(chalk.yellow(`${reviewer} : relecture impossible (${(err as Error).message})`))
    }
  }

  if (issues.length > 0) {
    printIssues(issues)
    stepTitle('3/5 Révision', lead)
    console.log()
    const revised = await runAgent({
      agentId: lead,
      task: buildRevisionTask(phase, await readDocs(cwd, saved), issues),
      cwd,
      aiConfig,
      onChunk: c => process.stdout.write(c),
    })
    console.log()
    const again = await savePhaseOutputs(cwd, phase, revised.content)
    saved = [...new Set([...saved, ...again])]
  } else {
    stepTitle('3/5 Révision', 'aucune remarque : ignorée')
  }

  stepTitle('4/5 Clarification', 'questions ouvertes')
  const { resolved, remaining } = await clarifyAll(cwd)
  console.log(chalk.dim(`  ${resolved} résolue(s), ${remaining} restante(s)`))

  stepTitle('5/5 Porte de complétude', `phase ${phase}`)
  const phaseIssues = issuesForPhase(analyzeSpecs(await readSpecFiles(cwd)), phase)
  const errors = phaseIssues.filter(i => i.severity === 'error')
  for (const i of phaseIssues) {
    const tag = i.severity === 'error' ? chalk.red(`[${i.rule}]`) : chalk.yellow(`[${i.rule}]`)
    console.log(`      ${tag} ${i.id ? `${i.id} — ` : ''}${i.message}`)
  }
  console.log(errors.length === 0
    ? chalk.green(`  Phase ${phase} complète.`)
    : chalk.yellow(`  ${errors.length} erreur(s) : corrigez puis relancez kuate spec (ou kuate spec clarify).`))

  await recordHistory(cwd, { agentId: lead, task: `Spécification phase ${phase}`, phase })
  return { gatePassed: errors.length === 0 }
}

/** Rédige docs/constitution.md et fixe les deux drapeaux données/API aux réponses de l'utilisateur. */
export async function createConstitution(
  cwd: string,
  aiConfig: AiConfig,
  flags: { hasData: boolean; hasApi: boolean },
): Promise<boolean> {
  const config = await readConfig(cwd)
  const agentId = SPEC_PHASE_AGENTS.K.lead
  if (!(await loadAgentPrompt(cwd, agentId))) {
    console.error(chalk.red(`  Agent ${agentId} introuvable dans .kuate/agents/. Lancez kuate init.`))
    process.exitCode = 1
    return false
  }
  const description = await loadDescription(cwd)
  const task = `Tu travailles sur le projet "${config.project}" (méthodologie ${config.method}).
${description ? `Description : ${description}\n` : ''}
Rédige docs/constitution.md : les principes non négociables du projet, la stack imposée (si elle ressort de la description, sinon une question [NEEDS CLARIFICATION: …]), les règles de qualité et les conventions de code.
Inclus exactement ces deux lignes :
- Données persistantes : ${flags.hasData ? 'oui' : 'non'}
- API exposée : ${flags.hasApi ? 'oui' : 'non'}
Concret et propre à ce projet, sans TBD, TODO ni « à définir ».
Sortie : un bloc de code dont la première ligne est // docs/constitution.md`

  console.log()
  console.log(chalk.bold.hex(PHASE_COLORS.K ?? '#FFB300')('  Constitution du projet'))
  console.log()
  const res = await runAgent({ agentId, task, cwd, aiConfig, onChunk: c => process.stdout.write(c) })
  console.log()
  const found = filterDocFiles(detectFilesInOutput(res.content)).find(f => f.filename === SPEC_PATHS.constitution)
  if (!found) {
    console.error(chalk.red(`  Aucune ${SPEC_PATHS.constitution} détectée dans la réponse. Relancez kuate spec constitution.`))
    process.exitCode = 1
    return false
  }
  const backup = await writeWithBackup(cwd, SPEC_PATHS.constitution, ensureConstitutionFlags(found.content, flags))
  console.log(`    ${chalk.green('✓')} ${SPEC_PATHS.constitution}${backup ? chalk.dim(`  (ancienne version : ${backup})`) : ''}`)
  return true
}

/** Relecture IA optionnelle du paquet entier : un développeur extérieur pourrait-il coder sans question ? */
export async function reviewWholePack(cwd: string, aiConfig: AiConfig): Promise<void> {
  const files = await readSpecFiles(cwd)
  const docs: Array<[string, string | undefined]> = [
    [SPEC_PATHS.constitution, files.constitution],
    [SPEC_PATHS.specs, files.specs],
    [SPEC_PATHS.backlog, files.backlog],
    [SPEC_PATHS.architecture, files.architecture],
    [SPEC_PATHS.dataModel, files.dataModel],
    ...Object.entries(files.contracts),
  ]
  const doc = docs.filter(([, t]) => t && t.trim()).map(([rel, t]) => `### ${rel}\n\n${t}`).join('\n\n')
  if (!doc) {
    p.log.warn('Aucun document à relire.')
    return
  }
  const spin = p.spinner()
  spin.start('Relecture IA du paquet complet…')
  try {
    const issues = await reviewSpecDocument(
      { phase: 'pack', reviewerPrompt: 'Tu es un développeur senior extérieur au projet, chargé de décider si les specs suffisent pour tout coder.', doc },
      aiConfig,
    )
    spin.stop(`${issues.length} remarque(s)`)
    printIssues(issues)
  } catch (err) {
    spin.stop(chalk.red(`Relecture impossible : ${(err as Error).message}`))
  }
}
