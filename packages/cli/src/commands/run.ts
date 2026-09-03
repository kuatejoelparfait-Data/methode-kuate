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
} from '@methode-kuate/core'
import { initI18n } from '../i18n/index.js'

export async function runCommand(cwd: string, agentId: string, task: string): Promise<void> {
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

  console.log()
  console.log(chalk.bold.hex('#FF8C00')(`  ◆ Agent : ${agentId}`))
  console.log(chalk.dim(`  Tâche  : ${task}`))
  console.log(chalk.dim(`  Modèle : ${aiConfig.provider} / ${aiConfig.model}`))
  console.log()
  console.log(chalk.dim('  ─'.repeat(30)))
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
    console.error(chalk.red(`\n  Erreur : ${(err as Error).message}`))
    process.exit(1)
  }

  console.log()
  console.log()
  console.log(chalk.dim('  ─'.repeat(30)))
  console.log()

  // Détecter les fichiers dans la réponse
  const files = detectFilesInOutput(result.content)

  if (files.length > 0) {
    console.log(chalk.bold.hex('#FF8C00')(`  ${files.length} fichier(s) détecté(s) dans la réponse :`))
    for (const f of files) {
      console.log(`    ${chalk.cyan(f.filename)}  ${chalk.dim(`(${f.language})`)}`)
    }
    console.log()

    const saveAll = await p.confirm({
      message: `Sauvegarder ${files.length > 1 ? 'tous les fichiers' : 'ce fichier'} dans le projet ?`,
      initialValue: true,
    })

    if (!p.isCancel(saveAll) && saveAll) {
      let saved = 0
      for (const f of files) {
        const filePath = path.join(cwd, f.filename)
        const dir = path.dirname(filePath)
        await fs.ensureDir(dir)
        await fs.writeFile(filePath, f.content, 'utf-8')
        console.log(`    ${chalk.green('✓')} ${f.filename}`)
        saved++
      }
      console.log()
      p.log.success(chalk.green(`${saved} fichier(s) sauvegardé(s) dans le projet`))
    }
  }

  // Sauvegarder en mémoire ?
  console.log()
  const saveMemory = await p.confirm({
    message: 'Ajouter une note dans la mémoire projet (memory.md) ?',
    initialValue: false,
  })

  if (!p.isCancel(saveMemory) && saveMemory) {
    const note = await p.text({
      message: 'Note à ajouter :',
      placeholder: `Agent ${agentId} : ${task.slice(0, 60)}`,
    })
    if (!p.isCancel(note) && String(note).trim()) {
      const memoryPath = path.join(cwd, '.kuate', 'context', 'memory.md')
      const date = new Date().toISOString().split('T')[0]
      await fs.appendFile(memoryPath, `\n## ${date} — ${agentId}\n\n${String(note).trim()}\n`)
      p.log.success('Mémorisé dans .kuate/context/memory.md')
    }
  }

  console.log()
}
