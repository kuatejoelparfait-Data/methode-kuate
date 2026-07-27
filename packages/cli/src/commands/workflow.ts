import chalk from 'chalk'
import { readConfig, isKuateProject, loadMethodology } from '@methode-kuate/core'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initI18n, t } from '../i18n/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEMPLATES_DIR = path.resolve(__dirname, '..', 'templates')

const PHASE_COLORS: Record<string, (s: string) => string> = {
  K: chalk.hex('#3b5bdb'),
  U: chalk.hex('#2f9e44'),
  A: chalk.hex('#e67700'),
  T: chalk.hex('#ae3ec9'),
  E: chalk.hex('#0ca678'),
}

const PHASE_NAMES_FR: Record<string, string> = {
  K: 'Knower — Découvrir & Contextualiser',
  U: 'Unifier — Agréger & Synthétiser',
  A: 'Architect — Concevoir & Structurer',
  T: 'Transformer — Exécuter & Restructurer',
  E: 'Evaluator — Évaluer & Valider',
}

const PHASE_NAMES_EN: Record<string, string> = {
  K: 'Knower — Discover & Contextualize',
  U: 'Unifier — Aggregate & Synthesize',
  A: 'Architect — Design & Structure',
  T: 'Transformer — Execute & Restructure',
  E: 'Evaluator — Evaluate & Validate',
}

// Workflow catalog — phase-aware, no YAML file required per workflow for MVP
const WORKFLOW_CATALOG: Record<string, { phase: string; descFr: string; descEn: string }> = {
  'discovery-interview': { phase: 'K', descFr: 'Entretien de découverte utilisateur', descEn: 'User discovery interview' },
  'market-analysis': { phase: 'K', descFr: 'Analyse de marché et concurrents', descEn: 'Market and competitor analysis' },
  'problem-definition': { phase: 'K', descFr: 'Définition du problème à résoudre', descEn: 'Problem definition' },
  'user-research': { phase: 'K', descFr: 'Recherche utilisateur qualitative', descEn: 'Qualitative user research' },
  'stakeholder-mapping': { phase: 'K', descFr: 'Cartographie des parties prenantes', descEn: 'Stakeholder mapping' },
  'business-case': { phase: 'K', descFr: 'Construction du business case', descEn: 'Business case construction' },
  'requirements-gathering': { phase: 'U', descFr: 'Collecte et structuration des exigences', descEn: 'Requirements gathering' },
  'sprint-planning': { phase: 'U', descFr: 'Planification du sprint', descEn: 'Sprint planning' },
  'backlog-grooming': { phase: 'U', descFr: 'Affinage du backlog', descEn: 'Backlog grooming' },
  'roadmap-creation': { phase: 'U', descFr: 'Création de la roadmap produit', descEn: 'Product roadmap creation' },
  'okr-definition': { phase: 'U', descFr: 'Définition des OKR trimestriels', descEn: 'Quarterly OKR definition' },
  'pi-planning': { phase: 'U', descFr: 'PI Planning SAFe', descEn: 'SAFe PI Planning' },
  'system-design': { phase: 'A', descFr: 'Conception architecture système', descEn: 'System architecture design' },
  'api-design': { phase: 'A', descFr: 'Conception API REST/GraphQL', descEn: 'REST/GraphQL API design' },
  'security-review': { phase: 'A', descFr: 'Revue sécurité OWASP', descEn: 'OWASP security review' },
  'db-schema-design': { phase: 'A', descFr: 'Conception schéma de base de données', descEn: 'Database schema design' },
  'feature-implementation': { phase: 'T', descFr: 'Implémentation de fonctionnalité (TDD)', descEn: 'Feature implementation (TDD)' },
  'code-review': { phase: 'T', descFr: 'Revue de code structurée', descEn: 'Structured code review' },
  'cicd-setup': { phase: 'T', descFr: 'Mise en place pipeline CI/CD', descEn: 'CI/CD pipeline setup' },
  'refactoring-guide': { phase: 'T', descFr: 'Guide de refactoring ciblé', descEn: 'Targeted refactoring guide' },
  'test-strategy': { phase: 'E', descFr: 'Stratégie de tests basée sur le risque', descEn: 'Risk-based test strategy' },
  'performance-audit': { phase: 'E', descFr: 'Audit de performance complet', descEn: 'Full performance audit' },
  'retrospective': { phase: 'E', descFr: 'Rétrospective de sprint', descEn: 'Sprint retrospective' },
  'sprint-review': { phase: 'E', descFr: 'Revue de sprint avec démo', descEn: 'Sprint review with demo' },
  'deployment-checklist': { phase: 'E', descFr: 'Checklist de déploiement en production', descEn: 'Production deployment checklist' },
  'post-mortem': { phase: 'E', descFr: "Post-mortem d'incident", descEn: 'Incident post-mortem' },
  'quarterly-review': { phase: 'E', descFr: 'Revue trimestrielle OKR', descEn: 'OKR quarterly review' },
}

export async function workflowListCommand(cwd: string, phase?: string): Promise<void> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red(t('error.notKuateProject')))
    process.exit(1)
  }

  const config = await readConfig(cwd)
  initI18n(config.lang)

  let methodology
  try {
    methodology = await loadMethodology(config.method, TEMPLATES_DIR)
  } catch {
    methodology = null
  }

  const activeWorkflowIds = new Set(methodology?.workflowIds ?? [])
  const phases = phase ? [phase.toUpperCase()] : ['K', 'U', 'A', 'T', 'E']

  console.log()
  console.log(chalk.bold.hex('#6c63ff')('  WORKFLOWS — Méthode KUATE'))
  console.log()

  for (const p of phases) {
    const phaseColor = PHASE_COLORS[p] ?? chalk.white
    const phaseName = config.lang === 'fr' ? PHASE_NAMES_FR[p] : PHASE_NAMES_EN[p]
    const phaseWorkflows = Object.entries(WORKFLOW_CATALOG).filter(([, v]) => v.phase === p)

    if (!phaseWorkflows.length) continue

    console.log(phaseColor(`  ── Phase ${p} — ${phaseName} ──`))

    for (const [id, wf] of phaseWorkflows) {
      const isActive = activeWorkflowIds.has(id)
      const marker = isActive ? chalk.green('✓') : chalk.dim('○')
      const desc = config.lang === 'fr' ? wf.descFr : wf.descEn
      console.log(`  ${marker} ${chalk.bold(id.padEnd(30))} ${chalk.dim(desc)}`)
    }
    console.log()
  }

  console.log(chalk.dim('  ✓ = actif pour votre méthodologie  ○ = disponible'))
  console.log()
}

export async function workflowShowCommand(cwd: string, workflowId: string): Promise<void> {
  const wf = WORKFLOW_CATALOG[workflowId]
  if (!wf) {
    console.error(chalk.red(`Workflow "${workflowId}" introuvable. Tapez kuate workflow list.`))
    process.exit(1)
  }

  const phaseColor = PHASE_COLORS[wf.phase] ?? chalk.white
  const phaseName = PHASE_NAMES_FR[wf.phase]

  console.log()
  console.log(chalk.bold(`  ${wf.descFr} / ${wf.descEn}`))
  console.log(`  ID      : ${chalk.cyan(workflowId)}`)
  console.log(`  Phase   : ${phaseColor(`${wf.phase} — ${phaseName}`)}`)
  console.log()
}
