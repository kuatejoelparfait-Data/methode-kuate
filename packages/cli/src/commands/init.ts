import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as p from '@clack/prompts'
import chalk from 'chalk'
import {
  initKuateStructure,
  isKuateProject,
  loadMethodology,
  filterAgentsForMethodology,
  generateAndSaveAgent,
} from '@methode-kuate/core'
import { AGENTS_DEV } from '@methode-kuate/agents-dev'
import { AGENTS_BUSINESS } from '@methode-kuate/agents-business'
import { AGENTS_CONTENT } from '@methode-kuate/agents-content'
import { AGENTS_EDUCATION } from '@methode-kuate/agents-education'
import type { KuateConfig, Lang, MethodologyId, DomainId } from '@methode-kuate/core'
import { initI18n, t } from '../i18n/index.js'
import { detectSystemLang } from '../utils/lang.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEMPLATES_DIR = path.resolve(__dirname, '..', 'templates')
const AGENTS_TEMPLATES_BASE = path.resolve(__dirname, '..', 'templates', 'agents')

const DOMAIN_TEMPLATES: Record<DomainId, string> = {
  dev: path.join(AGENTS_TEMPLATES_BASE, 'dev'),
  business: path.join(AGENTS_TEMPLATES_BASE, 'business'),
  content: path.join(AGENTS_TEMPLATES_BASE, 'content'),
  education: path.join(AGENTS_TEMPLATES_BASE, 'education'),
}

const VERSION = '1.0.0'
const BACK = '__BACK__'

const METHODOLOGY_LABELS: Record<string, string> = {
  agile: 'Agile / Scrum',
  lean: 'Lean',
  pmbok: 'PMBOK (Gestion de Projet)',
  'design-thinking': 'Design Thinking',
  okr: 'OKR',
  safe: 'SAFe',
  custom: 'Custom',
}

const DOMAIN_LABELS: Record<string, string> = {
  dev: 'Dev Software (8 agents)',
  business: 'Business & Stratégie (6 agents)',
  content: 'Création de Contenu (5 agents)',
  education: 'Formation & Pédagogie (4 agents)',
}

function banner(): void {
  const line = chalk.hex('#6c63ff')('─'.repeat(52))
  console.log('\n' + line)
  console.log(
    chalk.bold.hex('#6c63ff')('  MÉTHODE KUATE') +
    chalk.dim.white('  v' + VERSION) +
    chalk.dim('  ·  CLI d\'orchestration d\'agents IA')
  )
  console.log(
    chalk.dim('  K·onnaître  U·nifier  A·rchitecturer  T·ransformer  E·valuer')
  )
  console.log(line + '\n')
}

function stepLabel(current: number, total: number): string {
  return chalk.dim(`[${current}/${total}]`)
}

export async function initCommand(cwd: string): Promise<void> {
  const detectedLang = detectSystemLang()
  initI18n(detectedLang)

  banner()

  if (isKuateProject(cwd)) {
    p.log.warn('Un projet KUATE existe déjà dans ce dossier.')
    p.log.info('Tapez ' + chalk.cyan('kuate config show') + ' pour voir la configuration actuelle.')
    console.log()
    return
  }

  const TOTAL_STEPS = 4

  // État du wizard — on garde les valeurs pour permettre le retour
  let projectName = ''
  let lang: Lang = detectedLang
  let method: MethodologyId = 'agile'
  let domains: DomainId[] = ['dev']

  let step = 1

  // ─── Boucle principale du wizard ─────────────────────────────────────────
  while (step <= TOTAL_STEPS) {

    // ── Étape 1 : Nom du projet ───────────────────────────────────────────
    if (step === 1) {
      const res = await p.text({
        message: `${stepLabel(1, TOTAL_STEPS)} Nom du projet ?`,
        placeholder: projectName || 'MonProjet',
        initialValue: projectName,
        validate: (v) => (v.trim().length === 0 ? 'Le nom ne peut pas être vide' : undefined),
      })
      if (p.isCancel(res)) { p.cancel('Annulé'); process.exit(0) }
      projectName = String(res).trim()
      step = 2
      continue
    }

    // ── Étape 2 : Langue ──────────────────────────────────────────────────
    if (step === 2) {
      const res = await p.select<{ value: string; label: string }[], string>({
        message: `${stepLabel(2, TOTAL_STEPS)} Langue de travail ?`,
        initialValue: lang,
        options: [
          { value: 'fr', label: 'Français' },
          { value: 'en', label: 'English' },
          { value: BACK, label: chalk.dim('← Retour') },
        ],
      })
      if (p.isCancel(res)) { p.cancel('Annulé'); process.exit(0) }
      if (res === BACK) { step = 1; continue }
      lang = res as Lang
      initI18n(lang)
      step = 3
      continue
    }

    // ── Étape 3 : Méthodologie ────────────────────────────────────────────
    if (step === 3) {
      const res = await p.select<{ value: string; label: string }[], string>({
        message: `${stepLabel(3, TOTAL_STEPS)} Méthodologie ?`,
        initialValue: method,
        options: [
          { value: 'agile',          label: 'Agile / Scrum',            hint: 'sprints, backlog, vélocité' },
          { value: 'lean',           label: 'Lean',                     hint: 'flux, gaspillage, VSM' },
          { value: 'pmbok',          label: 'PMBOK (Gestion de Projet)', hint: 'charte, WBS, RACI' },
          { value: 'design-thinking',label: 'Design Thinking',          hint: 'empathie, idéation, prototype' },
          { value: 'okr',            label: 'OKR',                      hint: 'objectifs, résultats clés' },
          { value: 'safe',           label: 'SAFe',                     hint: 'PI planning, ART, trains' },
          { value: 'custom',         label: 'Custom',                   hint: 'défini par vous' },
          { value: BACK,             label: chalk.dim('← Retour') },
        ],
      })
      if (p.isCancel(res)) { p.cancel('Annulé'); process.exit(0) }
      if (res === BACK) { step = 2; continue }
      method = res as MethodologyId
      step = 4
      continue
    }

    // ── Étape 4 : Domaines d'agents ───────────────────────────────────────
    if (step === 4) {
      const res = await p.select<{ value: string; label: string }[], string>({
        message: `${stepLabel(4, TOTAL_STEPS)} Domaines d'agents à installer ?`,
        initialValue: domains.join('+'),
        options: [
          { value: 'dev',                  label: 'Dev Software uniquement',               hint: '8 agents' },
          { value: 'dev+business',         label: 'Dev + Business & Stratégie',            hint: '14 agents' },
          { value: 'dev+business+content', label: 'Dev + Business + Contenu',              hint: '19 agents' },
          { value: 'all',                  label: 'Tous les domaines',                     hint: '23 agents' },
          { value: 'business',             label: 'Business & Stratégie uniquement',       hint: '6 agents' },
          { value: 'content',              label: 'Création de Contenu uniquement',        hint: '5 agents' },
          { value: 'education',            label: 'Formation & Pédagogie uniquement',      hint: '4 agents' },
          { value: BACK,                   label: chalk.dim('← Retour') },
        ],
      })
      if (p.isCancel(res)) { p.cancel('Annulé'); process.exit(0) }
      if (res === BACK) { step = 3; continue }
      if (res === 'all') {
        domains = ['dev', 'business', 'content', 'education']
      } else {
        domains = (res as string).split('+') as DomainId[]
      }
      step = 5
      continue
    }
  }

  // ─── Étape Confirmation ───────────────────────────────────────────────────
  const domainsDisplay = domains.map((d) => DOMAIN_LABELS[d] ?? d).join('\n    ')
  p.log.message(
    chalk.bold('\n  Récapitulatif avant génération\n') +
    `    Projet      ${chalk.cyan(projectName)}\n` +
    `    Langue      ${chalk.cyan(lang === 'fr' ? 'Français' : 'English')}\n` +
    `    Méthode     ${chalk.cyan(METHODOLOGY_LABELS[method] ?? method)}\n` +
    `    Domaines    ${chalk.cyan(domainsDisplay)}\n`
  )

  const confirm = await p.select<{ value: string; label: string }[], string>({
    message: 'Confirmer et générer ?',
    options: [
      { value: 'yes',  label: chalk.green('Oui — générer les agents') },
      { value: 'back', label: chalk.dim('← Modifier les domaines') },
      { value: 'edit', label: chalk.dim('← Recommencer depuis le début') },
      { value: 'quit', label: chalk.dim('Annuler') },
    ],
  })
  if (p.isCancel(confirm) || confirm === 'quit') { p.cancel('Annulé'); process.exit(0) }
  if (confirm === 'back') {
    // Relancer depuis l'étape 4
    step = 4
    return initCommand(cwd)
  }
  if (confirm === 'edit') {
    // Relancer depuis le début (sans bannière dupliquée)
    step = 1
    return initCommand(cwd)
  }

  // ─── Génération ──────────────────────────────────────────────────────────
  const spin = p.spinner()
  spin.start('Génération en cours...')

  let methodology
  try {
    methodology = await loadMethodology(method, TEMPLATES_DIR)
  } catch {
    methodology = await loadMethodology('agile', TEMPLATES_DIR)
  }

  const allAgents = [...AGENTS_DEV, ...AGENTS_BUSINESS, ...AGENTS_CONTENT, ...AGENTS_EDUCATION]
  const selectedAgents = filterAgentsForMethodology(allAgents, methodology, domains)

  const config: KuateConfig = {
    project: projectName,
    lang,
    method,
    domains,
    version: VERSION,
    agents: selectedAgents.map((a) => a.id),
  }

  await initKuateStructure(cwd, config)

  const outputDir = path.join(cwd, '.kuate', 'agents')
  for (const agent of selectedAgents) {
    const templatesDir = DOMAIN_TEMPLATES[agent.domain as DomainId] ?? DOMAIN_TEMPLATES.dev
    await generateAndSaveAgent({ agent, config, methodology, templatesDir, outputDir })
  }

  spin.stop(chalk.green(`${selectedAgents.length} agents générés`))

  // ─── Résumé final ─────────────────────────────────────────────────────────
  const line = chalk.hex('#6c63ff')('─'.repeat(52))
  console.log('\n' + line)
  console.log(chalk.bold.green('  Méthode KUATE initialisée avec succès'))
  console.log(line)
  console.log(`\n  ${chalk.dim('Projet')}      ${chalk.white(projectName)}`)
  console.log(`  ${chalk.dim('Méthode')}     ${chalk.white(METHODOLOGY_LABELS[method] ?? method)}`)
  console.log(`  ${chalk.dim('Agents')}      ${chalk.cyan(String(selectedAgents.length))} générés dans ${chalk.dim('.kuate/agents/')}`)
  console.log(`  ${chalk.dim('Workflows')}   ${chalk.cyan(String(methodology.workflowIds.length))} disponibles`)
  console.log(`  ${chalk.dim('Mémoire')}     ${chalk.dim('.kuate/context/')} — 5 sections prêtes\n`)
  console.log(`  ${chalk.dim('Commandes utiles :')}`)
  console.log(`    ${chalk.cyan('kuate agent list')}     liste tes agents`)
  console.log(`    ${chalk.cyan('kuate workflow list')}  explore les workflows`)
  console.log(`    ${chalk.cyan('kuate memory inject')} génère le contexte IA`)
  console.log(`    ${chalk.cyan('kuate build --target claude')}  exporte pour Claude\n`)
  console.log(line + '\n')
}
