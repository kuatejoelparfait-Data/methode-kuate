import { parseSpecs } from './parse.js'
import { orderTasks } from './order.js'
import { STORY_RULE } from './stories.js'
import { SPEC_PATHS } from './files.js'
import type { SpecFiles } from './types.js'

export type ExportTarget = 'claude' | 'copilot' | 'cursor' | 'agents'

export const EXPORT_FILES: Record<ExportTarget, string> = {
  claude: 'CLAUDE.md',
  copilot: '.github/copilot-instructions.md',
  cursor: '.cursor/rules/kuate.mdc',
  agents: 'AGENTS.md',
}

/** Ordre d'exécution des tâches : groupes topologiques, tâches `[P]` marquées parallélisables. */
export function buildImplementGuide(files: SpecFiles, project: string): string {
  const model = parseSpecs(files)
  const byId = new Map(model.tasks.map(t => [t.id, t]))
  const { levels, cycle } = orderTasks(model.tasks)
  const item = (id: string): string => {
    const t = byId.get(id)
    const par = t?.parallel ? ' (parallélisable)' : ''
    return `- ${id} — ${t?.title ?? ''}${par} → ${SPEC_PATHS.storiesDir}/${id}.md`
  }
  return [
    `# IMPLEMENT — ${project}`,
    '',
    'Exécute les tâches dans l\'ordre des groupes. Les tâches d\'un même groupe sont indépendantes ; celles marquées « parallélisable » peuvent être faites en parallèle.',
    `Pour chaque tâche, lis son fichier ${SPEC_PATHS.storiesDir}/T-xxx.md : il contient tout le contexte nécessaire.`,
    '',
    ...levels.flatMap((level, i) => [`## Groupe ${i + 1}`, '', ...level.map(item), '']),
    ...(cycle ? ['## Non ordonnables (cycle de dépendances)', '', ...cycle.map(item), ''] : []),
  ].join('\n')
}

/** Fichier d'instructions pour l'outil de code cible. */
export function buildToolInstructions(target: ExportTarget, files: SpecFiles, project: string): string {
  const body = [
    `# Instructions — ${project}`,
    '',
    'Ce projet est spécifié avec la méthode KUATE. Le code doit suivre les specs sans dévier.',
    '',
    '## Constitution',
    '',
    files.constitution?.trim() || '(aucune constitution)',
    '',
    '## Règles de travail',
    '',
    '- Suis les specs de `docs/` ; ne change pas l\'architecture ni les contrats sans le signaler.',
    `- ${STORY_RULE}`,
    '- Une tâche est terminée quand son « Done when » est vérifié par un test qui passe.',
    '',
    '## Marche à suivre',
    '',
    `1. Lis \`${SPEC_PATHS.implement}\` pour l'ordre d'exécution des tâches.`,
    `2. Pour chaque tâche, ouvre \`${SPEC_PATHS.storiesDir}/T-xxx.md\` et implémente uniquement cette tâche.`,
    '3. Lance les tests, puis passe à la tâche suivante.',
    '',
  ].join('\n')

  if (target === 'cursor') {
    return `---\ndescription: Règles KUATE — ${project}\nalwaysApply: true\n---\n\n${body}`
  }
  return body
}
