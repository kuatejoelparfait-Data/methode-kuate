import type { SpecPhase } from './types.js'

export interface SpecReviewIssue {
  severity: 'blocking' | 'major' | 'minor'
  problem: string
  suggestion: string
}

/** Agent principal et relecteurs de chaque phase (un agent absent du projet est sauté). */
export const SPEC_PHASE_AGENTS: Record<SpecPhase, { lead: string; reviewers: string[] }> = {
  K: { lead: 'business-analyst', reviewers: ['qa-strategist', 'expert-securite'] },
  U: { lead: 'chef-projet', reviewers: ['tech-lead'] },
  A: { lead: 'architecte-solution', reviewers: ['expert-securite', 'expert-devops', 'tech-lead'] },
}

export const SPEC_PHASE_OUTPUTS: Record<SpecPhase, string[]> = {
  K: ['docs/specs.md'],
  U: ['docs/backlog.md'],
  A: ['docs/architecture.md', 'docs/data-model.md', 'docs/contracts/*.md'],
}

const CONTRACTS: Record<SpecPhase, string> = {
  K: `FORMAT OBLIGATOIRE de docs/specs.md (analysé par un programme : respecte-le à la lettre) :

### US-001 — Titre de la story
En tant que <persona>, je veux <action> afin de <bénéfice>.
- AC-001 (US-001) : Étant donné <contexte>, quand <action>, alors <résultat vérifiable>
- AC-002 (US-001) : ...

- FR-001 : exigence fonctionnelle
- NFR-001 : exigence non fonctionnelle mesurable (chiffrée)

Règles : identifiants à 3 chiffres, numérotation continue ; chaque story a au moins un critère AC testable ; chaque critère cite sa story entre parenthèses ; section « Hors périmètre » obligatoire.`,

  U: `FORMAT OBLIGATOIRE de docs/backlog.md (analysé par un programme : respecte-le à la lettre) :

### T-001 [P] — Titre de la tâche
Covers: US-001, AC-001, AC-002
Depends: T-000
Files: src/chemin/fichier.ts, src/chemin/fichier.test.ts
Done when: critère vérifiable par un test

Règles : [P] seulement si la tâche est parallélisable ; Depends est omis sans dépendance ; chaque story et chaque critère AC de docs/specs.md est cité par au moins une ligne Covers ; chaque tâche liste les fichiers exacts à créer ; une tâche = un résultat testable.`,

  A: `FORMAT OBLIGATOIRE des documents d'architecture :

docs/architecture.md avec exactement ces sections de niveau 2 :
## Stack
## Structure des dossiers
## Conventions
## Variables d'environnement
## Décisions

La section « Structure des dossiers » liste chaque dossier utilisé par les fichiers du backlog.
docs/data-model.md : entités, champs, types, relations, contraintes (si le projet a des données persistantes).
docs/contracts/<domaine>.md : un fichier par domaine d'API avec endpoints, entrées, sorties, codes d'erreur (si le projet expose une API).`,
}

export function phaseFormatContract(phase: SpecPhase): string {
  return CONTRACTS[phase]
}

const QUALITY_RULES = `Règles de qualité :
- Concret et propre à CE projet : aucun exemple générique, aucune section vide.
- Interdit : TBD, TODO, « à définir », ???.
- Toute information manquante ou ambiguë : écris [NEEDS CLARIFICATION: question précise] au lieu d'inventer.`

const FENCE5 = '`'.repeat(5)
const OUTPUT_RULE = `Sortie : un bloc par fichier, entouré d'une clôture de CINQ backticks (${FENCE5}) pour que les blocs de code internes (arborescences, JSON, SQL, écrits avec trois backticks) ne la ferment pas. La première ligne du bloc est le chemin du fichier en commentaire (ex. // docs/specs.md), suivie du contenu COMPLET du fichier.`

export function buildAuthorTask(
  phase: SpecPhase,
  ctx: { project: string; method: string; description: string; priorDocs: string },
): string {
  return `Tu travailles sur le projet "${ctx.project}" (méthodologie ${ctx.method}).
${ctx.description ? `Description : ${ctx.description}\n` : ''}
${ctx.priorDocs ? `Documents des phases précédentes :\n\n${ctx.priorDocs}\n\n` : ''}Produis : ${SPEC_PHASE_OUTPUTS[phase].join(', ')}.

${phaseFormatContract(phase)}

${QUALITY_RULES}

${OUTPUT_RULE}`
}

export function buildRevisionTask(
  phase: SpecPhase,
  currentDoc: string,
  issues: SpecReviewIssue[],
  clarifications?: string,
): string {
  const list = issues.map((i, n) => `${n + 1}. [${i.severity}] ${i.problem}\n   Suggestion : ${i.suggestion}`).join('\n')
  const decided = clarifications && clarifications.trim()
    ? `\n## Décisions déjà prises (clarifications) — à respecter et à conserver\n\n${clarifications.trim()}\n`
    : ''
  return `Révise le document ci-dessous en intégrant les problèmes relevés.
Conserve le format, les identifiants existants et tout ce qui est correct : ne réécris pas ce qui n'est pas concerné.
${QUALITY_RULES}

${phaseFormatContract(phase)}
${decided}
## Problèmes à traiter

${list || '(aucun)'}

## Document actuel

${currentDoc}

${OUTPUT_RULE}`
}

export function buildSpecReviewPrompt(phase: SpecPhase | 'pack', reviewerPrompt: string, doc: string): string {
  const scope = phase === 'pack'
    ? "du paquet de specs complet (constitution, specs, backlog, architecture, modèle de données, contrats). Un développeur extérieur doit pouvoir coder tout le projet à partir de ce paquet sans poser de question."
    : `de la phase ${phase} d'un paquet de specs. Un développeur extérieur doit pouvoir coder à partir de ce document sans poser de question.`
  return `${reviewerPrompt}

Tu relis un document ${scope}
Relève les trous, ambiguïtés, contradictions et éléments non testables. Ne réécris rien.

## Document

${doc}

Réponds UNIQUEMENT avec ce JSON valide (sans markdown fence) :
{
  "issues": [
    { "severity": "blocking|major|minor", "problem": "problème précis", "suggestion": "correction concrète" }
  ]
}`
}

const SEVERITIES = new Set(['blocking', 'major', 'minor'])

/** Valide la réponse JSON d'un relecteur ; tout ce qui n'a pas la forme attendue est écarté. */
export function parseReviewIssues(raw: unknown): SpecReviewIssue[] {
  const list = (raw as { issues?: unknown } | null)?.issues
  if (!Array.isArray(list)) return []
  const out: SpecReviewIssue[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const { severity, problem, suggestion } = item as Record<string, unknown>
    if (typeof problem !== 'string' || !problem.trim()) continue
    out.push({
      severity: typeof severity === 'string' && SEVERITIES.has(severity) ? (severity as SpecReviewIssue['severity']) : 'minor',
      problem: problem.trim(),
      suggestion: typeof suggestion === 'string' ? suggestion.trim() : '',
    })
  }
  return out
}
