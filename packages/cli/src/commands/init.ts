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

export async function initCommand(cwd: string): Promise<void> {
  const detectedLang = detectSystemLang()
  initI18n(detectedLang)

  p.intro(chalk.bold.hex('#6c63ff')(t('welcome')))

  if (isKuateProject(cwd)) {
    p.log.warn('Un projet KUATE existe déjà dans ce dossier. Tapez kuate config pour modifier la configuration.')
    p.outro('')
    return
  }

  const projectName = await p.text({
    message: t('init.projectName'),
    validate: (v) => (v.trim().length === 0 ? 'Le nom ne peut pas être vide' : undefined),
  })
  if (p.isCancel(projectName)) { p.cancel('Annulé'); process.exit(0) }

  const lang = await p.select<{ value: Lang; label: string }[], Lang>({
    message: t('init.lang'),
    options: [
      { value: 'fr', label: 'Français' },
      { value: 'en', label: 'English' },
    ],
  })
  if (p.isCancel(lang)) { p.cancel('Annulé'); process.exit(0) }

  initI18n(lang as Lang)

  const method = await p.select<{ value: MethodologyId; label: string }[], MethodologyId>({
    message: t('init.method'),
    options: [
      { value: 'agile', label: 'Agile / Scrum' },
      { value: 'lean', label: 'Lean' },
      { value: 'pmbok', label: 'PMBOK (Gestion de Projet)' },
      { value: 'design-thinking', label: 'Design Thinking' },
      { value: 'okr', label: 'OKR' },
      { value: 'custom', label: 'Custom' },
    ],
  })
  if (p.isCancel(method)) { p.cancel('Annulé'); process.exit(0) }

  const domains = await p.multiselect<{ value: DomainId; label: string }[], DomainId>({
    message: t('init.domains'),
    options: [
      { value: 'dev', label: 'Dev Software', hint: '8 agents' },
      { value: 'business', label: 'Business & Stratégie', hint: '6 agents' },
      { value: 'content', label: 'Création de Contenu', hint: '5 agents' },
      { value: 'education', label: 'Formation & Pédagogie', hint: '4 agents' },
    ],
    initialValues: ['dev'],
  })
  if (p.isCancel(domains)) { p.cancel('Annulé'); process.exit(0) }

  const spin = p.spinner()
  spin.start(t('init.generating'))

  let methodology
  try {
    methodology = await loadMethodology(method as MethodologyId, TEMPLATES_DIR)
  } catch {
    methodology = await loadMethodology('agile', TEMPLATES_DIR)
  }

  const allAgents = [...AGENTS_DEV, ...AGENTS_BUSINESS, ...AGENTS_CONTENT, ...AGENTS_EDUCATION]
  const selectedAgents = filterAgentsForMethodology(allAgents, methodology, domains as DomainId[])

  const config: KuateConfig = {
    project: String(projectName),
    lang: lang as Lang,
    method: method as MethodologyId,
    domains: domains as DomainId[],
    version: VERSION,
    agents: selectedAgents.map((a) => a.id),
  }

  await initKuateStructure(cwd, config)

  const outputDir = path.join(cwd, '.kuate', 'agents')
  for (const agent of selectedAgents) {
    const templatesDir = DOMAIN_TEMPLATES[agent.domain as DomainId] ?? DOMAIN_TEMPLATES.dev
    await generateAndSaveAgent({
      agent,
      config,
      methodology,
      templatesDir,
      outputDir,
    })
  }

  spin.stop(
    chalk.green(
      t('init.generated', { count: selectedAgents.length, method: methodology.nameFr, lang: lang as string })
    )
  )

  p.note(
    `.kuate/ créé avec :\n` +
    `  ${chalk.cyan(String(selectedAgents.length))} agents · ${chalk.cyan(String(methodology.workflowIds.length))} workflows\n` +
    `  Langue : ${chalk.cyan(String(lang))}  Méthode : ${chalk.cyan(methodology.nameFr)}`,
    t('init.success')
  )

  p.outro(chalk.dim(t('init.hint')))
}
