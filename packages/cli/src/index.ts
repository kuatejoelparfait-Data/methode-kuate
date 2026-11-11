import { Command } from 'commander'
import { initI18n } from './i18n/index.js'
import { detectSystemLang } from './utils/lang.js'
import { initCommand } from './commands/init.js'
import { agentListCommand, agentUseCommand, agentInfoCommand } from './commands/agent.js'
import { configShowCommand, configAiCommand } from './commands/config.js'
import { workflowListCommand, workflowShowCommand } from './commands/workflow.js'
import { memoryShowCommand, memoryAddCommand, memoryInjectCommand, memorySeedCommand } from './commands/memory.js'
import { buildCommand } from './commands/build.js'
import { doctorCommand } from './commands/doctor.js'
import { conseilCommand } from './commands/conseil.js'
import { runCommand } from './commands/run.js'
import { phaseCommand } from './commands/phase.js'
import { nextCommand } from './commands/next.js'
import { cycleCommand } from './commands/cycle.js'
import {
  specAnalyzeCommand,
  specStoriesCommand,
  specExportCommand,
  specRunCommand,
  specClarifyCommand,
  specConstitutionCommand,
} from './commands/spec.js'
import { EXPORT_FILES } from '@methode-kuate/core'
import type { ExportTarget } from '@methode-kuate/core'
import { addAiOptions, aiOptsOf } from './utils/ai-select.js'
import type { AiSelectOptions } from './utils/ai-select.js'
import { projetCommand } from './commands/projet.js'
import { devCommand } from './commands/dev.js'

const VERSION = '1.3.0'
const cwd = process.cwd()

initI18n(detectSystemLang())

const program = new Command()

program
  .name('kuate')
  .description("Méthode KUATE — CLI d'orchestration d'agents IA")
  .version(VERSION)

program
  .command('init')
  .description('Initialise la Méthode KUATE dans le projet courant')
  .action(() => initCommand(cwd))

const agentCmd = program.command('agent').description('Gère les agents spécialisés')

agentCmd
  .command('list')
  .description('Liste tous les agents disponibles')
  .action(() => agentListCommand(cwd))

agentCmd
  .command('use <nom>')
  .description("Copie le prompt de l'agent dans le presse-papier")
  .action((nom: string) => agentUseCommand(cwd, nom))

agentCmd
  .command('info <nom>')
  .description("Affiche la fiche complète d'un agent")
  .action((nom: string) => agentInfoCommand(cwd, nom))

const configCmd = program.command('config').description('Gère la configuration .kuate/')

configCmd
  .command('show')
  .description('Affiche la configuration courante')
  .action(() => configShowCommand(cwd))

configCmd
  .command('ai')
  .description('Configure le provider IA (Claude / OpenAI) pour la génération de contexte')
  .action(() => configAiCommand())

const workflowCmd = program.command('workflow').description('Gère les workflows par phase KUATE')

workflowCmd
  .command('list')
  .description('Liste tous les workflows (filtrés par phase)')
  .option('--phase <phase>', 'Filtrer par phase (K|U|A|T|E)')
  .action((opts: { phase?: string }) => workflowListCommand(cwd, opts.phase))

workflowCmd
  .command('show <nom>')
  .description("Affiche la fiche complète d'un workflow")
  .action((nom: string) => workflowShowCommand(cwd, nom))

const memoryCmd = program.command('memory').description('Gère la mémoire persistante du projet')

memoryCmd
  .command('show')
  .description('Affiche la mémoire du projet')
  .option('--section <nom>', 'Afficher une section spécifique')
  .action((opts: { section?: string }) => memoryShowCommand(cwd, opts.section))

memoryCmd
  .command('add')
  .description('Ajoute une entrée dans une section mémoire')
  .requiredOption('--section <nom>', 'Section cible (memory|architecture|business|constraints|glossary)')
  .action((opts: { section: string }) => memoryAddCommand(cwd, opts.section))

memoryCmd
  .command('inject')
  .description('Génère un bloc contexte prêt à coller dans une session IA')
  .action(() => memoryInjectCommand(cwd))

memoryCmd
  .command('seed')
  .description('Wizard guidé pour remplir la mémoire projet dès le départ')
  .action(() => memorySeedCommand(cwd))

program
  .command('build')
  .description('Exporte les agents pour une plateforme IA')
  .requiredOption('--target <plateforme>', 'claude | chatgpt | gemini | cursor | copilot | pack')
  .action((opts: { target: string }) => buildCommand(cwd, opts.target))

program
  .command('doctor')
  .description('Vérifie l\'installation et la configuration KUATE')
  .action(() => doctorCommand(cwd))

program
  .command('conseil')
  .description('Mode multi-agents : plusieurs experts sur un sujet')
  .requiredOption('--agents <noms>', 'Agents séparés par virgule (ex: architecte-solution,dev-senior)')
  .requiredOption('--topic <texte>', 'Sujet de la session de conseil')
  .option('--save', 'Sauvegarder la session dans .kuate/context/architecture.md', false)
  .action((opts: { agents: string; topic: string; save: boolean }) =>
    conseilCommand(cwd, opts.agents.split(',').map(s => s.trim()), opts.topic, opts.save)
  )

addAiOptions(program
  .command('run')
  .description("Exécute un agent IA sur une tâche et écrit le résultat dans le projet")
  .requiredOption('--agent <nom>', 'Nom de l\'agent (ex: dev-senior, architecte-solution)')
  .requiredOption('--task <texte>', 'Description de la tâche à réaliser'))
  .action((opts: { agent: string; task: string } & AiSelectOptions) =>
    runCommand(cwd, opts.agent, opts.task, aiOptsOf(opts))
  )

addAiOptions(program
  .command('phase <phase>')
  .description('Lance une session guidée pour une phase KUATE (K|U|A|T|E)'))
  .action((phase: string, opts: AiSelectOptions) => {
    const validPhases = ['K', 'U', 'A', 'T', 'E']
    const p = phase.toUpperCase()
    if (!validPhases.includes(p)) {
      console.error(`Phase invalide "${phase}". Utilisez K, U, A, T ou E.`)
      process.exit(1)
    }
    phaseCommand(cwd, p as 'K' | 'U' | 'A' | 'T' | 'E', aiOptsOf(opts))
  })

addAiOptions(program
  .command('next')
  .description("Suggestions IA de la prochaine action à faire dans le projet"))
  .action((opts: AiSelectOptions) => nextCommand(cwd, aiOptsOf(opts)))

addAiOptions(program
  .command('cycle')
  .description("Analyse le cycle K·U·A·T·E (phases périmées, incohérences) et permet des ajustements")
  .option('--analyse', 'Analyse de cohérence par IA des documents du cycle')
  .option('--json', 'Affiche le statut du cycle en JSON (sans IA)'))
  .action((opts: AiSelectOptions & { analyse?: boolean; json?: boolean }) =>
    cycleCommand(cwd, { ...aiOptsOf(opts), analyse: opts.analyse, json: opts.json })
  )

addAiOptions(program
  .command('dev')
  .description('Lance le projet en local : install, tests, serveur, terminal agents'))
  .action((opts: AiSelectOptions) => devCommand(cwd, aiOptsOf(opts)))

addAiOptions(program
  .command('projet')
  .description('Pipeline complet K → U → A → T → E — specs, backlog, architecture, code, evaluation')
  .option('--from <phase>', 'Démarrer à une phase précise (K|U|A|T|E)', undefined))
  .action((opts: { from?: string } & AiSelectOptions) => {
    const validStarts = ['K', 'U', 'A', 'T', 'E']
    const from = opts.from?.toUpperCase() as 'K' | 'U' | 'A' | 'T' | 'E' | undefined
    if (from && !validStarts.includes(from)) {
      console.error(`Phase invalide "${opts.from}". Utilisez K, U, A ou T.`)
      process.exit(1)
    }
    projetCommand(cwd, from as 'K' | 'U' | 'A' | 'T' | 'E' | undefined, aiOptsOf(opts))
  })

const specCmd = program
  .command('spec')
  .description('Spécification en phases : paquet de specs, porte de complétude, passation à un LLM de code')

addAiOptions(specCmd
  .command('run', { isDefault: true })
  .description('Exécute la boucle (rédiger, relire, réviser, clarifier, porte) pour la prochaine phase K/U/A incomplète')
  .option('--phase <phase>', 'Forcer une phase (K | U | A)'))
  .action((opts: AiSelectOptions & { phase?: string }) =>
    specRunCommand(cwd, { ...aiOptsOf(opts), phase: opts.phase })
  )

addAiOptions(specCmd
  .command('constitution')
  .description('Crée ou met à jour docs/constitution.md (principes, stack, conventions)'))
  .action((opts: AiSelectOptions) => specConstitutionCommand(cwd, aiOptsOf(opts)))

specCmd
  .command('clarify')
  .description('Pose les questions ouvertes ([NEEDS CLARIFICATION]) et enregistre les réponses')
  .action(() => specClarifyCommand(cwd))

addAiOptions(specCmd
  .command('analyze')
  .description('Porte de complétude : vérifie les specs (ambiguïtés, couverture, cohérence) et écrit docs/analysis.md')
  .option('--ai', 'Ajoute une relecture IA du paquet complet'))
  .action((opts: AiSelectOptions & { ai?: boolean }) =>
    specAnalyzeCommand(cwd, { ...aiOptsOf(opts), ai: opts.ai })
  )

specCmd
  .command('stories')
  .description('Génère un fichier de tâche autoportant par tâche du backlog (docs/stories/)')
  .action(() => specStoriesCommand(cwd))

specCmd
  .command('export')
  .description("Passation : écrit docs/IMPLEMENT.md et le fichier d'instructions de l'outil de code")
  .requiredOption('--target <cible>', Object.keys(EXPORT_FILES).join(' | '))
  .option('--force', "Exporter même si la porte de complétude n'est pas passée")
  .action((opts: { target: string; force?: boolean }) => {
    if (!Object.keys(EXPORT_FILES).includes(opts.target)) {
      console.error(`Cible inconnue "${opts.target}". Valeurs possibles : ${Object.keys(EXPORT_FILES).join(', ')}.`)
      process.exit(1)
    }
    return specExportCommand(cwd, { target: opts.target as ExportTarget, force: opts.force })
  })

program.parse(process.argv)
