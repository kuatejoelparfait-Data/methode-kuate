import { Command } from 'commander'
import { initI18n } from './i18n/index.js'
import { detectSystemLang } from './utils/lang.js'
import { initCommand } from './commands/init.js'
import { agentListCommand, agentUseCommand, agentInfoCommand } from './commands/agent.js'
import { configShowCommand } from './commands/config.js'
import { workflowListCommand, workflowShowCommand } from './commands/workflow.js'
import { memoryShowCommand, memoryAddCommand, memoryInjectCommand } from './commands/memory.js'
import { buildCommand } from './commands/build.js'
import { doctorCommand } from './commands/doctor.js'
import { conseilCommand } from './commands/conseil.js'

const VERSION = '1.1.0'
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

program.parse(process.argv)
