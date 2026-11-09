import { parseSpecs, extractSection, storyIntro } from './parse.js'
import { SPEC_PATHS } from './files.js'
import type { SpecFiles } from './types.js'

export const STORY_RULE =
  "N'implémente que cette tâche. Si une information manque ou est ambiguë, ajoute une question dans docs/clarifications.md et arrête-toi."

const EMBED_LIMIT = 4000
const ARCH_EXCERPTS = ['Stack', 'Conventions', "Variables d'environnement"]

/** Un fichier Markdown autoportant par tâche (clé `T-001.md`), assemblé sans IA. */
export function buildStoryFiles(files: SpecFiles): Record<string, string> {
  const model = parseSpecs(files)
  const out: Record<string, string> = {}

  const references: Array<[string, string]> = [
    ...(files.dataModel?.trim() ? [[SPEC_PATHS.dataModel, files.dataModel] as [string, string]] : []),
    ...Object.entries(files.contracts),
  ]
  const total = references.reduce((n, [, text]) => n + text.length, 0)
  const referenceBlock = references.length === 0
    ? ''
    : total <= EMBED_LIMIT
      ? references.map(([p, text]) => `### ${p}\n\n${text.trim()}`).join('\n\n')
      : "Lire en entier avant d'implémenter :\n" + references.map(([p]) => `- ${p}`).join('\n')

  const archBlock = ARCH_EXCERPTS
    .map(name => [name, extractSection(files.architecture, name)] as const)
    .filter(([, text]) => text)
    .map(([name, text]) => `### ${name}\n\n${text}`)
    .join('\n\n')

  for (const task of model.tasks) {
    const storyIds = new Set<string>()
    for (const ref of task.covers) {
      if (ref.startsWith('US-')) storyIds.add(ref)
      const ac = model.criteria.find(c => c.id === ref)
      if (ac) storyIds.add(ac.storyId)
    }

    const stories = model.stories.filter(s => storyIds.has(s.id)).map(s => {
      const intro = storyIntro(files.specs, s.id)
      const acs = model.criteria.filter(c => c.storyId === s.id).map(c => `- ${c.id} : ${c.text}`)
      return [`### ${s.id} — ${s.title}`, intro, ...acs].filter(Boolean).join('\n')
    })
    const requirements = model.requirements
      .filter(r => task.covers.includes(r.id))
      .map(r => `- ${r.id} : ${r.text}`)

    out[`${task.id}.md`] = [
      `# ${task.id} — ${task.title}`,
      '',
      `> ${STORY_RULE}`,
      '',
      '## Tâche',
      '',
      task.block,
      '',
      '## Exigences couvertes',
      '',
      ...(stories.length ? stories : ['(aucune story citée)']),
      ...(requirements.length ? ['', '### Exigences', ...requirements] : []),
      '',
      '## Architecture',
      '',
      archBlock || '(architecture absente)',
      ...(referenceBlock ? ['', '## Modèle de données et contrats', '', referenceBlock] : []),
      '',
    ].join('\n')
  }
  return out
}
