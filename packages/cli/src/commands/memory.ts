import path from 'node:path'
import chalk from 'chalk'
import fs from 'fs-extra'
import * as p from '@clack/prompts'
import { readConfig, isKuateProject } from '@methode-kuate/core'
import { initI18n } from '../i18n/index.js'

const MEMORY_SECTIONS = ['memory', 'architecture', 'business', 'constraints', 'glossary'] as const
type MemorySection = typeof MEMORY_SECTIONS[number]

function getContextDir(cwd: string): string {
  return path.join(cwd, '.kuate', 'context')
}

function getSectionPath(cwd: string, section: MemorySection): string {
  return path.join(getContextDir(cwd), `${section}.md`)
}

export async function memoryShowCommand(cwd: string, section?: string): Promise<void> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red("Aucun projet KUATE trouvé. Lancez kuate init d'abord."))
    process.exit(1)
  }

  const config = await readConfig(cwd)
  initI18n(config.lang)

  const contextDir = getContextDir(cwd)

  if (section) {
    if (!MEMORY_SECTIONS.includes(section as MemorySection)) {
      console.error(chalk.red(`Section "${section}" inconnue. Sections valides : ${MEMORY_SECTIONS.join(', ')}`))
      process.exit(1)
    }
    const filePath = getSectionPath(cwd, section as MemorySection)
    if (!fs.existsSync(filePath)) {
      console.log(chalk.dim(`  La section "${section}" est vide.`))
      return
    }
    const content = await fs.readFile(filePath, 'utf-8')
    console.log()
    console.log(chalk.bold.hex('#6c63ff')(`  MÉMOIRE — ${section.toUpperCase()}`))
    console.log(chalk.dim('  ' + '─'.repeat(50)))
    console.log(content)
    return
  }

  console.log()
  console.log(chalk.bold.hex('#6c63ff')(`  MÉMOIRE KUATE — ${config.project}`))
  console.log()

  for (const sec of MEMORY_SECTIONS) {
    const filePath = path.join(contextDir, `${sec}.md`)
    if (!fs.existsSync(filePath)) continue
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.trim().split('\n').length
    const preview = content.trim().split('\n').slice(0, 2).join(' ').substring(0, 80)
    console.log(`  ${chalk.green('●')} ${chalk.bold(sec.padEnd(16))} ${chalk.dim(`${lines} lignes`)}  ${chalk.dim(preview + '…')}`)
  }
  console.log()
  console.log(chalk.dim('  Tapez kuate memory show --section <nom> pour voir le détail'))
  console.log()
}

export async function memoryAddCommand(cwd: string, section: string): Promise<void> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red("Aucun projet KUATE trouvé. Lancez kuate init d'abord."))
    process.exit(1)
  }

  if (!MEMORY_SECTIONS.includes(section as MemorySection)) {
    console.error(chalk.red(`Section "${section}" inconnue. Sections valides : ${MEMORY_SECTIONS.join(', ')}`))
    process.exit(1)
  }

  const content = await p.text({
    message: `Contenu à ajouter dans "${section}" :`,
    validate: (v) => (v.trim().length === 0 ? 'Le contenu ne peut pas être vide' : undefined),
  })
  if (p.isCancel(content)) { p.cancel('Annulé'); process.exit(0) }

  const filePath = getSectionPath(cwd, section as MemorySection)
  const timestamp = new Date().toISOString().split('T')[0]
  const entry = `\n## ${timestamp}\n\n${String(content)}\n`

  await fs.appendFile(filePath, entry)
  p.log.success(chalk.green(`Entrée ajoutée dans .kuate/context/${section}.md`))
}

export async function memorySeedCommand(cwd: string): Promise<void> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red("Aucun projet KUATE trouvé. Lancez kuate init d'abord."))
    process.exit(1)
  }

  const config = await readConfig(cwd)
  initI18n(config.lang)

  console.log()
  console.log(chalk.bold.hex('#FF8C00')('  KUATE MEMORY SEED'))
  console.log(chalk.dim('  Répondez aux questions pour remplir votre mémoire projet.'))
  console.log(chalk.dim('  Laissez vide et appuyez Entrée pour ignorer une section.'))
  console.log()

  const timestamp = new Date().toISOString().split('T')[0]

  // ── Architecture ──────────────────────────────────────────────────────────
  const stack = await p.text({ message: 'Stack technique principale ?', placeholder: 'Next.js 14, PostgreSQL 15, Docker' })
  if (p.isCancel(stack)) { p.cancel('Annulé'); process.exit(0) }

  const stackWhy = await p.text({ message: 'Pourquoi ces choix technologiques ?', placeholder: 'SSR natif, contrainte client, performance' })
  if (p.isCancel(stackWhy)) { p.cancel('Annulé'); process.exit(0) }

  const techConstraints = await p.text({ message: 'Contraintes techniques non négociables ?', placeholder: 'Pas de cloud US, Node.js 20+ obligatoire' })
  if (p.isCancel(techConstraints)) { p.cancel('Annulé'); process.exit(0) }

  // ── Business ──────────────────────────────────────────────────────────────
  const objective = await p.text({ message: 'Objectif principal du projet ?', placeholder: 'Réduire le temps de traitement des dossiers de 40%' })
  if (p.isCancel(objective)) { p.cancel('Annulé'); process.exit(0) }

  const client = await p.text({ message: 'Client / organisation concernée ?', placeholder: 'Startup B2B SaaS, 12 personnes' })
  if (p.isCancel(client)) { p.cancel('Annulé'); process.exit(0) }

  const stakeholders = await p.text({ message: 'Parties prenantes clés ?', placeholder: 'CTO (décideur), 2 devs seniors, 1 PO' })
  if (p.isCancel(stakeholders)) { p.cancel('Annulé'); process.exit(0) }

  // ── Constraints ───────────────────────────────────────────────────────────
  const regulatory = await p.text({ message: 'Contraintes réglementaires ou de conformité ?', placeholder: 'RGPD, données hébergées EU, ISO 27001' })
  if (p.isCancel(regulatory)) { p.cancel('Annulé'); process.exit(0) }

  const budget = await p.text({ message: 'Contraintes budget / timeline / ressources ?', placeholder: 'MVP en 3 mois, budget infra < 500€/mois' })
  if (p.isCancel(budget)) { p.cancel('Annulé'); process.exit(0) }

  const outOfScope = await p.text({ message: 'Ce qui est hors scope ou absolument interdit ?', placeholder: 'Pas de microservices pour la V1, pas de mobile natif' })
  if (p.isCancel(outOfScope)) { p.cancel('Annulé'); process.exit(0) }

  // ── Glossary ──────────────────────────────────────────────────────────────
  const glossary = await p.text({ message: 'Termes métier spécifiques ? (terme:définition, un par ligne)', placeholder: 'Dossier: unité de travail principale\nClient: utilisateur final payant' })
  if (p.isCancel(glossary)) { p.cancel('Annulé'); process.exit(0) }

  // ── Memory ────────────────────────────────────────────────────────────────
  const decisions = await p.text({ message: 'Décisions importantes déjà prises ?', placeholder: 'Architecture monolithe choisie après évaluation microservices' })
  if (p.isCancel(decisions)) { p.cancel('Annulé'); process.exit(0) }

  // ── Écriture ──────────────────────────────────────────────────────────────
  const spin = p.spinner()
  spin.start('Écriture dans .kuate/context/...')

  let written = 0

  if (String(stack).trim() || String(stackWhy).trim() || String(techConstraints).trim()) {
    const lines = [`## Seed — ${timestamp}\n`]
    if (String(stack).trim())         lines.push(`**Stack :** ${String(stack).trim()}`)
    if (String(stackWhy).trim())      lines.push(`**Rationale :** ${String(stackWhy).trim()}`)
    if (String(techConstraints).trim()) lines.push(`**Contraintes techniques :** ${String(techConstraints).trim()}`)
    await fs.appendFile(getSectionPath(cwd, 'architecture'), '\n' + lines.join('\n') + '\n')
    written++
  }

  if (String(objective).trim() || String(client).trim() || String(stakeholders).trim()) {
    const lines = [`## Seed — ${timestamp}\n`]
    if (String(objective).trim())    lines.push(`**Objectif :** ${String(objective).trim()}`)
    if (String(client).trim())       lines.push(`**Client :** ${String(client).trim()}`)
    if (String(stakeholders).trim()) lines.push(`**Parties prenantes :** ${String(stakeholders).trim()}`)
    await fs.appendFile(getSectionPath(cwd, 'business'), '\n' + lines.join('\n') + '\n')
    written++
  }

  if (String(regulatory).trim() || String(budget).trim() || String(outOfScope).trim()) {
    const lines = [`## Seed — ${timestamp}\n`]
    if (String(regulatory).trim())  lines.push(`**Réglementaire :** ${String(regulatory).trim()}`)
    if (String(budget).trim())      lines.push(`**Budget / Timeline :** ${String(budget).trim()}`)
    if (String(outOfScope).trim())  lines.push(`**Hors scope :** ${String(outOfScope).trim()}`)
    await fs.appendFile(getSectionPath(cwd, 'constraints'), '\n' + lines.join('\n') + '\n')
    written++
  }

  if (String(glossary).trim()) {
    const entry = `\n## Seed — ${timestamp}\n\n${String(glossary).trim()}\n`
    await fs.appendFile(getSectionPath(cwd, 'glossary'), entry)
    written++
  }

  if (String(decisions).trim()) {
    const entry = `\n## Seed — ${timestamp}\n\n${String(decisions).trim()}\n`
    await fs.appendFile(getSectionPath(cwd, 'memory'), entry)
    written++
  }

  spin.stop(chalk.green(`${written} section(s) remplies dans .kuate/context/`))

  console.log()
  console.log(chalk.dim('  Lancez ') + chalk.cyan('kuate memory inject') + chalk.dim(' pour générer votre bloc contexte IA'))
  console.log()
}

export async function memoryInjectCommand(cwd: string): Promise<void> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red("Aucun projet KUATE trouvé. Lancez kuate init d'abord."))
    process.exit(1)
  }

  const config = await readConfig(cwd)
  initI18n(config.lang)

  const contextDir = getContextDir(cwd)
  const sections: string[] = []

  for (const sec of MEMORY_SECTIONS) {
    const filePath = path.join(contextDir, `${sec}.md`)
    if (!fs.existsSync(filePath)) continue
    const content = (await fs.readFile(filePath, 'utf-8')).trim()
    if (!content) continue
    const lines = content.split('\n').slice(0, 5).join(' ').replace(/#+\s*/g, '').substring(0, 120)
    sections.push(`${sec.toUpperCase()}: ${lines}`)
  }

  const block = [
    `[CONTEXTE KUATE — ${config.project}]`,
    `Méthode: ${config.method} | Langue: ${config.lang.toUpperCase()} | Agents: ${config.agents.length}`,
    '',
    ...sections,
    '',
    '[FIN CONTEXTE]',
  ].join('\n')

  console.log()
  console.log(chalk.bold.hex('#6c63ff')('  BLOC CONTEXTE — Copier/Coller dans votre session IA'))
  console.log(chalk.dim('  ' + '─'.repeat(60)))
  console.log()
  console.log(chalk.cyan(block))
  console.log()
  console.log(chalk.dim('  Conseil : collez ce bloc au début de votre conversation IA'))
  console.log()
}
