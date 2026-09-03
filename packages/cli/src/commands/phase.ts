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
  PROVIDER_LABELS,
} from '@methode-kuate/core'
import type { Phase } from '@methode-kuate/core'
import { initI18n } from '../i18n/index.js'

const PHASE_INFO: Record<Phase, { name: string; desc: string; color: string }> = {
  K: { name: 'Knower',      desc: 'Découvrir & Contextualiser', color: '#FFB300' },
  U: { name: 'Unifier',     desc: 'Agréger & Synthétiser',      color: '#FF8C00' },
  A: { name: 'Architect',   desc: 'Concevoir & Structurer',     color: '#E06000' },
  T: { name: 'Transformer', desc: 'Exécuter & Restructurer',    color: '#C04800' },
  E: { name: 'Evaluator',   desc: 'Évaluer & Valider',          color: '#8B3500' },
}

// Phase → agents mapping (from agent definitions)
const PHASE_AGENTS: Record<Phase, string[]> = {
  K: ['business-analyst', 'expert-finance-tech', 'expert-communication'],
  U: ['chef-projet', 'coach-agile', 'expert-lean', 'stratege-okr'],
  A: ['architecte-solution', 'expert-securite', 'concepteur-pedagogique', 'createur-formation'],
  T: ['dev-senior', 'expert-devops', 'tech-lead', 'expert-ia-ml', 'tuteur-ia', 'social-media-strategist', 'createur-contenu-educatif'],
  E: ['qa-strategist', 'expert-performance', 'copywriter-technique', 'expert-seo', 'evaluateur-competences'],
}

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
  await fs.appendFile(memoryPath, `\n## ${date} — ${agentId}\n\n${note.trim()}\n`)
}

export async function phaseCommand(cwd: string, phase: Phase): Promise<void> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red("Aucun projet KUATE trouvé. Lancez kuate init d'abord."))
    process.exit(1)
  }

  const config = await readConfig(cwd)
  initI18n(config.lang)

  const aiConfig = await readGlobalAiConfig()
  if (!aiConfig) {
    console.error(chalk.red('IA non configurée. Lancez kuate config ai.'))
    process.exit(1)
  }

  const phaseInfo = PHASE_INFO[phase]
  const installedAgents = getInstalledAgentsForPhase(cwd, phase)

  if (installedAgents.length === 0) {
    console.error(chalk.red(`Aucun agent de phase ${phase} installé. Relancez kuate init avec les bons domaines.`))
    process.exit(1)
  }

  console.log()
  console.log(chalk.bold.hex(phaseInfo.color)(`  [ ${phase} ] ${phaseInfo.name} — ${phaseInfo.desc}`))
  console.log(chalk.dim(`  ${installedAgents.length} agent(s) disponible(s) · ${PROVIDER_LABELS[aiConfig.provider]} / ${aiConfig.model}`))
  console.log(chalk.dim('  Tapez Ctrl+C à tout moment pour quitter la session.'))
  console.log()

  // ── Boucle de session ──────────────────────────────────────────────────────
  let continueSession = true

  while (continueSession) {
    // Choix de l'agent
    const agentOptions = installedAgents.map(id => ({
      value: id,
      label: id,
      hint: `agent ${phase} installé`,
    }))

    const selectedAgent = await p.select<{ value: string; label: string; hint?: string }[], string>({
      message: `Quel agent pour cette tâche ?`,
      options: agentOptions,
    })
    if (p.isCancel(selectedAgent)) { p.cancel('Session terminée'); break }

    // Description de la tâche
    const task = await p.text({
      message: 'Décris la tâche :',
      placeholder: 'ex: créer le système d\'authentification avec Clerk',
      validate: (v) => (v.trim().length < 5 ? 'Tâche trop courte (min 5 caractères)' : undefined),
    })
    if (p.isCancel(task)) { p.cancel('Session terminée'); break }

    const taskStr = String(task).trim()

    console.log()
    console.log(chalk.bold.hex(phaseInfo.color)(`  ◆ ${String(selectedAgent)} en cours...`))
    console.log(chalk.dim('  ─'.repeat(30)))
    console.log()

    // Exécution de l'agent
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
      const retry = await p.confirm({ message: 'Continuer avec une autre tâche ?', initialValue: true })
      if (p.isCancel(retry) || !retry) break
      continue
    }

    console.log()
    console.log()
    console.log(chalk.dim('  ─'.repeat(30)))
    console.log()

    // Détecter et proposer de sauvegarder les fichiers
    const detectedFiles = detectFilesInOutput(result.content)

    if (detectedFiles.length > 0) {
      console.log(chalk.bold(`  ${detectedFiles.length} fichier(s) détecté(s) :`))
      for (const f of detectedFiles) {
        console.log(`    ${chalk.cyan(f.filename)}`)
      }
      console.log()

      const saveFiles = await p.confirm({
        message: `Sauvegarder ${detectedFiles.length > 1 ? 'tous les fichiers' : 'ce fichier'} ?`,
        initialValue: true,
      })

      if (!p.isCancel(saveFiles) && saveFiles) {
        for (const f of detectedFiles) {
          await saveFile(cwd, f.filename, f.content)
          console.log(`    ${chalk.green('✓')} ${f.filename}`)
        }
        console.log()
      }
    }

    // Sauvegarder en mémoire
    const memNote = await p.text({
      message: 'Note mémoire ? (Entrée pour ignorer)',
      placeholder: `${String(selectedAgent)} : ${taskStr.slice(0, 60)}`,
    })
    if (!p.isCancel(memNote) && String(memNote).trim()) {
      await saveMemoryEntry(cwd, String(selectedAgent), String(memNote).trim())
      p.log.success('Mémorisé dans .kuate/context/memory.md')
    }

    console.log()

    // Continuer ?
    const next = await p.confirm({
      message: `Continuer en phase ${phase} avec un autre agent ?`,
      initialValue: true,
    })
    if (p.isCancel(next) || !next) {
      continueSession = false
    }
  }

  console.log()

  // Proposer de passer à la phase suivante
  const phases: Phase[] = ['K', 'U', 'A', 'T', 'E']
  const currentIdx = phases.indexOf(phase)
  if (currentIdx < phases.length - 1) {
    const nextPhase = phases[currentIdx + 1]
    const nextInfo = PHASE_INFO[nextPhase]
    console.log(
      chalk.dim('  Phase suivante : ') +
      chalk.bold.hex(nextInfo.color)(`[ ${nextPhase} ] ${nextInfo.name}`) +
      chalk.dim(` — ${nextInfo.desc}`)
    )
    console.log(chalk.dim(`  Lancez : `) + chalk.cyan(`kuate phase ${nextPhase}`))
  } else {
    p.log.success('Phase E terminée — projet complet ! Lancez kuate build --target claude pour exporter.')
  }
  console.log()
}
