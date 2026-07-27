import type { Lang } from '@methode-kuate/core'

const FR: Record<string, string> = {
  'welcome': 'MÉTHODE KUATE — Bienvenue',
  'init.projectName': 'Nom du projet ?',
  'init.lang': 'Langue de travail ?',
  'init.method': 'Méthodologie ?',
  'init.domains': "Domaines d'agents à installer ?",
  'init.success': 'Méthode KUATE initialisée avec succès ✓',
  'init.hint': 'Tapez kuate help pour commencer',
  'init.generating': 'Génération des agents...',
  'init.generated': '{{count}} agents générés ({{method}}, {{lang}})',
  'agent.list.header': 'AGENTS DISPONIBLES',
  'agent.list.domain.dev': 'DOMAINE DEV SOFTWARE',
  'agent.list.domain.business': 'DOMAINE BUSINESS',
  'agent.list.domain.content': 'DOMAINE CONTENU',
  'agent.list.domain.education': 'DOMAINE FORMATION',
  'agent.use.copied': 'Prompt {{name}} copié dans le presse-papier',
  'agent.use.hint': 'Collez ce prompt dans Claude, ChatGPT, Gemini ou Cursor',
  'agent.notFound': 'Agent "{{name}}" introuvable. Tapez kuate agent list pour voir les agents disponibles.',
  'config.show.header': 'CONFIGURATION KUATE',
  'error.notKuateProject': 'Aucun projet KUATE trouvé. Lancez kuate init d\'abord.',
  'phase.K': 'Knower — Découvrir & Contextualiser',
  'phase.U': 'Unifier — Agréger & Synthétiser',
  'phase.A': 'Architect — Concevoir & Structurer',
  'phase.T': 'Transformer — Exécuter & Restructurer',
  'phase.E': 'Evaluator — Évaluer & Valider',
}

const EN: Record<string, string> = {
  'welcome': 'MÉTHODE KUATE — Welcome',
  'init.projectName': 'Project name?',
  'init.lang': 'Working language?',
  'init.method': 'Methodology?',
  'init.domains': 'Agent domains to install?',
  'init.success': 'Méthode KUATE initialized successfully ✓',
  'init.hint': 'Type kuate help to get started',
  'init.generating': 'Generating agents...',
  'init.generated': '{{count}} agents generated ({{method}}, {{lang}})',
  'agent.list.header': 'AVAILABLE AGENTS',
  'agent.list.domain.dev': 'DEV SOFTWARE DOMAIN',
  'agent.list.domain.business': 'BUSINESS DOMAIN',
  'agent.list.domain.content': 'CONTENT DOMAIN',
  'agent.list.domain.education': 'EDUCATION DOMAIN',
  'agent.use.copied': 'Prompt {{name}} copied to clipboard',
  'agent.use.hint': 'Paste this prompt into Claude, ChatGPT, Gemini or Cursor',
  'agent.notFound': 'Agent "{{name}}" not found. Run kuate agent list to see available agents.',
  'config.show.header': 'KUATE CONFIGURATION',
  'error.notKuateProject': 'No KUATE project found. Run kuate init first.',
  'phase.K': 'Knower — Discover & Contextualize',
  'phase.U': 'Unifier — Aggregate & Synthesize',
  'phase.A': 'Architect — Design & Structure',
  'phase.T': 'Transformer — Execute & Restructure',
  'phase.E': 'Evaluator — Evaluate & Validate',
}

let currentLang: Lang = 'fr'
let strings: Record<string, string> = FR

export function initI18n(lang: Lang): void {
  currentLang = lang
  strings = lang === 'fr' ? FR : EN
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let str = strings[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
    }
  }
  return str
}

export function getLang(): Lang {
  return currentLang
}
