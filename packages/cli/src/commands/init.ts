import path from 'node:path'
import fs from 'fs-extra'
import { fileURLToPath } from 'node:url'
import * as p from '@clack/prompts'
import chalk from 'chalk'
import {
  initKuateStructure,
  isKuateProject,
  readConfig,
  loadMethodology,
  filterAgentsForMethodology,
  generateNextSuggestions,
  runAgent,
  detectFilesInOutput,
  generateAndSaveAgent,
  readGlobalAiConfig,
  writeGlobalAiConfig,
  detectAvailableProvider,
  generateContextWithAI,
  analyzeAndSelectAgents,
  getEffectiveApiKey,
  PROVIDER_LABELS,
  DEFAULT_MODELS,
} from '@methode-kuate/core'
import type { AiProvider, AiConfig } from '@methode-kuate/core'
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

const VERSION = '1.3.0'
const BACK = '__BACK__'
const ORANGE = '#F97316'
const BROWN  = '#7C2D12'

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

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function grad(text: string, bold = false): string {
  const a = hexToRgb(ORANGE)
  const b = hexToRgb(BROWN)
  const chars = [...text]
  const len = chars.length
  return chars.map((ch, i) => {
    const t = len <= 1 ? 0 : i / (len - 1)
    const r = Math.round(a[0] + (b[0] - a[0]) * t)
    const g = Math.round(a[1] + (b[1] - a[1]) * t)
    const bl = Math.round(a[2] + (b[2] - a[2]) * t)
    return bold ? chalk.bold.rgb(r, g, bl)(ch) : chalk.rgb(r, g, bl)(ch)
  }).join('')
}

function boxLine(text: string, inner: number, bold = false): string {
  const len = [...text].length
  const lpad = Math.max(0, Math.floor((inner - len) / 2))
  const rpad = Math.max(0, inner - lpad - len)
  return chalk.hex(ORANGE)('║') + ' '.repeat(lpad) + grad(text, bold) + ' '.repeat(rpad) + chalk.hex(BROWN)('║')
}

function banner(): void {
  const width = Math.min(process.stdout.columns ?? 68, 68)
  const inner = width - 2
  const top    = chalk.hex(ORANGE)('╔') + grad('═'.repeat(inner)) + chalk.hex(BROWN)('╗')
  const sep    = chalk.hex(ORANGE)('╠') + grad('═'.repeat(inner)) + chalk.hex(BROWN)('╣')
  const bottom = chalk.hex(ORANGE)('╚') + grad('═'.repeat(inner)) + chalk.hex(BROWN)('╝')
  const empty  = chalk.hex(ORANGE)('║') + ' '.repeat(inner) + chalk.hex(BROWN)('║')

  console.log('\n' + top)
  console.log(empty)
  console.log(boxLine('KUATE méthode', inner, true))
  console.log(boxLine("CLI d'orchestration d'agents IA  ·  v" + VERSION, inner))
  console.log(empty)
  console.log(sep)
  console.log(empty)
  console.log(boxLine('K·nower  U·nifier  A·rchitect  T·ransformer  E·valuator', inner))
  console.log(empty)
  console.log(bottom + '\n')
}

function stepLabel(current: number, total: number): string {
  const dots = Array.from({ length: total }, (_, i) => {
    if (i < current - 1) return chalk.hex(BROWN)('●')
    if (i === current - 1) return grad('◆', true)
    return chalk.dim('○')
  }).join(chalk.dim('─'))
  return dots + '  ' + chalk.dim(`${current}/${total}`)
}

const PIXEL_FONT: Record<string, number[][]> = {
  K: [[1,0,0,0,1],[1,0,0,1,0],[1,1,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  U: [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  A: [[0,1,1,1,0],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  T: [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  E: [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,1,1,1,1]],
}

const PIXEL_ROW_COLORS = ['#FFB300', '#FF8C00', '#E06000', '#C04800', '#8B3500']

function pixelBanner(): void {
  const LETTERS = ['K', 'U', 'A', 'T', 'E']
  const FILLED = '██'
  const EMPTY  = '  '
  const SEP    = '   '

  console.log()
  for (let row = 0; row < 5; row++) {
    let line = '  '
    for (let li = 0; li < LETTERS.length; li++) {
      const grid = PIXEL_FONT[LETTERS[li]]
      for (let col = 0; col < 5; col++) {
        line += grid[row][col] ? chalk.hex(PIXEL_ROW_COLORS[row])(FILLED) : EMPTY
      }
      if (li < LETTERS.length - 1) line += SEP
    }
    console.log(line)
  }
  const PHASE_DATA = [
    { letter: 'K', role: 'Knower',       desc: 'Découvrir & Contextualiser', color: PIXEL_ROW_COLORS[0] },
    { letter: 'U', role: 'Unifier',      desc: 'Agréger & Synthétiser',      color: PIXEL_ROW_COLORS[1] },
    { letter: 'A', role: 'Architect',    desc: 'Concevoir & Structurer',     color: PIXEL_ROW_COLORS[2] },
    { letter: 'T', role: 'Transformer',  desc: 'Exécuter & Restructurer',    color: PIXEL_ROW_COLORS[3] },
    { letter: 'E', role: 'Evaluator',    desc: 'Évaluer & Valider',          color: PIXEL_ROW_COLORS[4] },
  ]
  const pixelSep = '  ' + grad('░░▒▒' + '▄'.repeat(54) + '▒▒░░')

  console.log()
  console.log()
  console.log(pixelSep)
  console.log()
  for (const { letter, role, desc, color } of PHASE_DATA) {
    console.log(
      '  ' +
      chalk.bold.hex(color)(`[ ${letter} ]`) +
      '  ' +
      chalk.hex(color)(role.padEnd(12)) +
      chalk.dim(' ·  ') +
      chalk.white(desc)
    )
  }
  console.log()
  console.log(pixelSep)
  console.log()
  console.log('  ' + chalk.bold.white("CLI d'orchestration d'agents IA  ·  v" + VERSION))
  console.log('  ' + chalk.hex('#FF8C00')('Kuate Joel Parfait') + chalk.dim('  ·  linkedin.com/in/joelparfaitkuate'))
  console.log()
}

export async function initCommand(cwd: string): Promise<void> {
  const detectedLang = detectSystemLang()
  initI18n(detectedLang)

  pixelBanner()

  if (isKuateProject(cwd)) {
    // ── Projet existant — menu de reprise (boucle avec retour) ───────────────
    const existingConfig = await readConfig(cwd)
    initI18n(existingConfig.lang)

    const aiConfig = await readGlobalAiConfig()

    console.log(
      chalk.bold.hex('#FF8C00')(`  Projet : ${existingConfig.project}`) +
      chalk.dim(`  ·  ${existingConfig.method}  ·  ${existingConfig.agents?.length ?? '?'} agents`)
    )
    if (aiConfig) {
      console.log(chalk.dim(`  IA     : ${PROVIDER_LABELS[aiConfig.provider]} / ${aiConfig.model}`))
    } else {
      console.log(chalk.yellow('  IA     : non configuree — kuate config ai'))
    }
    console.log()

    const RESUME_NEXT    = 'next'
    const RESUME_SPECS   = 'specs'
    const RESUME_MEMORY  = 'memory'
    const RESUME_PHASE   = 'phase'
    const RESUME_CONFIG  = 'config'
    const RESUME_REINIT  = 'reinit'
    const RESUME_QUIT    = 'quit'

    let resumeLoop = true
    while (resumeLoop) {
      const resumeChoice = await p.select<{ value: string; label: string; hint?: string }[], string>({
        message: 'Ce projet est deja initialise. Que voulez-vous faire ?',
        options: [
          {
            value: RESUME_NEXT,
            label: chalk.bold('Continuer avec l\'assistant IA'),
            hint: 'Suggestions de prochaines taches basees sur l\'etat du projet',
          },
          {
            value: RESUME_SPECS,
            label: 'Generer / mettre a jour les specs',
            hint: 'business-analyst redige ou complete les specifications',
          },
          {
            value: RESUME_MEMORY,
            label: 'Mettre a jour la memoire du projet',
            hint: 'kuate memory seed — enrichit le contexte pour de meilleures suggestions',
          },
          {
            value: RESUME_PHASE,
            label: 'Lancer une session par phase',
            hint: 'kuate phase K | U | A | T | E',
          },
          {
            value: RESUME_CONFIG,
            label: chalk.dim('Voir la configuration'),
            hint: 'kuate config show',
          },
          {
            value: RESUME_REINIT,
            label: chalk.dim('Reinitialiser ce projet'),
            hint: 'Relance le wizard complet — remplace la config existante',
          },
          {
            value: RESUME_QUIT,
            label: chalk.dim('Quitter'),
          },
        ],
      })

      if (p.isCancel(resumeChoice) || resumeChoice === RESUME_QUIT) { p.cancel('Annule'); return }

      if (resumeChoice === RESUME_NEXT) {
        const { nextCommand } = await import('./next.js')
        await nextCommand(cwd)
        return
      }

      if (resumeChoice === RESUME_MEMORY) {
        const { memorySeedCommand } = await import('./memory.js')
        await memorySeedCommand(cwd)
        return
      }

      if (resumeChoice === RESUME_CONFIG) {
        const { configShowCommand } = await import('./config.js')
        await configShowCommand(cwd)
        // retour au menu apres affichage config
        continue
      }

      if (resumeChoice === RESUME_PHASE) {
        const phases = ['K', 'U', 'A', 'T', 'E'] as const
        const phaseColors: Record<string, string> = {
          K: '#FFB300', U: '#FF8C00', A: '#E06000', T: '#C04800', E: '#8B3500',
        }
        const phaseDescs: Record<string, string> = {
          K: 'Decouvrir & Contextualiser',
          U: 'Agreger & Synthetiser',
          A: 'Concevoir & Structurer',
          T: 'Executer & Restructurer',
          E: 'Evaluer & Valider',
        }
        const phaseChoice = await p.select<{ value: string; label: string; hint?: string }[], string>({
          message: 'Quelle phase ?',
          options: [
            ...phases.map(ph => {
              const names: Record<string, string> = { K: 'Knower', U: 'Unifier', A: 'Architect', T: 'Transformer', E: 'Evaluator' }
              return {
                value: ph,
                label: chalk.bold.hex(phaseColors[ph])(`[ ${ph} ]`) + '  ' + names[ph],
                hint: phaseDescs[ph],
              }
            }),
            { value: BACK, label: chalk.dim('Retour') },
          ],
        })
        if (p.isCancel(phaseChoice) || phaseChoice === BACK) continue  // retour menu resume
        const { phaseCommand } = await import('./phase.js')
        await phaseCommand(cwd, String(phaseChoice) as 'K' | 'U' | 'A' | 'T' | 'E')
        // apres phase terminee, retour au menu
        continue
      }

      if (resumeChoice === RESUME_SPECS) {
        if (!aiConfig) {
          p.log.warn('IA non configuree. Lancez : kuate config ai')
          continue
        }
        const allInstalled = [...AGENTS_DEV, ...AGENTS_BUSINESS, ...AGENTS_CONTENT, ...AGENTS_EDUCATION]
        const agentsDir = path.join(cwd, '.kuate', 'agents')
        const hasAnalyst = allInstalled.some(
          a => a.id === 'business-analyst' && fs.existsSync(path.join(agentsDir, 'business-analyst.md'))
        )
        const agentId = hasAnalyst ? 'business-analyst' : (existingConfig.agents?.[0] ?? 'dev-senior')

        const taskSpec = existingConfig.lang === 'fr'
          ? `Redige un document de specifications complet pour le projet "${existingConfig.project}" (methode ${existingConfig.method}). \
Inclus : objectif, utilisateurs cibles, user stories, criteres d'acceptation, contraintes, \
et le decoupage recommande en phases KUATE (K/U/A/T/E). Sois concret et actionnable.`
          : `Write a complete specification document for project "${existingConfig.project}" (${existingConfig.method} method). \
Include: objective, target users, user stories, acceptance criteria, constraints, \
and recommended KUATE phase breakdown (K/U/A/T/E). Be concrete and actionable.`

        console.log()
        console.log(chalk.bold.hex('#FFB300')(`  ${agentId} — Specifications`))
        console.log(chalk.dim('  ' + '─'.repeat(55)))
        console.log()

        try {
          const res = await runAgent({
            agentId,
            task: taskSpec,
            cwd,
            aiConfig,
            onChunk: (chunk) => process.stdout.write(chunk),
          })
          console.log('\n')

          const filesFound = detectFilesInOutput(res.content)
          if (filesFound.length > 0) {
            for (const f of filesFound) {
              await fs.ensureDir(path.dirname(path.join(cwd, f.filename)))
              await fs.writeFile(path.join(cwd, f.filename), f.content, 'utf-8')
              console.log(`    ${chalk.green(f.filename)}`)
            }
          } else {
            const sv = await p.confirm({ message: 'Sauvegarder dans docs/specs.md ?', initialValue: true })
            if (!p.isCancel(sv) && sv) {
              await fs.ensureDir(path.join(cwd, 'docs'))
              await fs.writeFile(path.join(cwd, 'docs', 'specs.md'), res.content, 'utf-8')
              p.log.success(chalk.green('docs/specs.md cree'))
            }
          }
        } catch (err) {
          console.error(chalk.red(`\n  Erreur IA : ${(err as Error).message}`))
        }
        console.log()
        p.log.success('Pour continuer : ' + chalk.cyan('kuate next'))
        continue
      }

      if (resumeChoice === RESUME_REINIT) {
        const confirm = await p.confirm({
          message: chalk.yellow('Reinitialiser ecrasera les agents et la config. Continuer ?'),
          initialValue: false,
        })
        if (p.isCancel(confirm) || !confirm) { continue }  // retour au menu
        await fs.remove(path.join(cwd, '.kuate', 'config.yaml'))
        p.log.success('Config supprimee — relancement du wizard...')
        console.log()
        return initCommand(cwd)
      }
    }

    return
  }

  const TOTAL_STEPS = 6

  // État du wizard — on garde les valeurs pour permettre le retour
  let projectName = ''
  let lang: Lang = detectedLang
  let method: MethodologyId = 'agile'
  let projectDescription = ''
  let domains: DomainId[] = ['dev']
  let pendingAiConfig: AiConfig | null = null

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

    // ── Étape 4 : Description du projet ──────────────────────────────────────
    if (step === 4) {
      console.log()
      p.log.message(
        chalk.bold.hex('#FF8C00')('  📋 Description du projet\n') +
        chalk.dim('  Cette description servira à sélectionner automatiquement les agents\n') +
        chalk.dim('  les plus pertinents et à générer le fichier KUATE.md du projet.')
      )
      console.log()

      const desc = await p.text({
        message: `${stepLabel(4, TOTAL_STEPS)} Décris le projet en quelques phrases :`,
        placeholder: 'ex: Plateforme SaaS B2B de gestion de contrats juridiques pour PME. Stack Next.js + PostgreSQL.',
        initialValue: projectDescription,
        validate: (v) => {
          if (v.trim() === '' || v.trim() === BACK) return undefined
          if (v.trim().length < 10) return 'Description trop courte (min 10 caractères)'
          return undefined
        },
      })
      if (p.isCancel(desc)) { p.cancel('Annulé'); process.exit(0) }
      const descStr = String(desc).trim()
      if (descStr === BACK || descStr === '') {
        step = 3
        continue
      }
      projectDescription = descStr
      step = 5
      continue
    }

    // ── Étape 5 : Configuration IA ───────────────────────────────────────────
    if (step === 5) {
      const existingAi = await readGlobalAiConfig()
      const existingProvider = detectAvailableProvider()

      console.log()
      p.log.message(
        chalk.bold.hex('#FF8C00')('  💡 Provider IA\n') +
        chalk.dim('  Permet la sélection intelligente d\'agents, la génération du contexte\n') +
        chalk.dim('  et l\'exécution IA (kuate phase / kuate run) sans quitter le terminal.\n') +
        chalk.dim('  Clé stockée dans ') + chalk.cyan('~/.kuate/global.json') + chalk.dim(' — non versionnée.')
      )
      console.log()

      const configureAi = await p.select<{ value: string; label: string }[], string>({
        message: `${stepLabel(5, TOTAL_STEPS)} Configurer un provider IA ?`,
        initialValue: (existingAi && existingProvider) ? 'yes' : 'skip',
        options: [
          { value: 'yes',  label: 'Oui — configurer maintenant' },
          { value: 'skip', label: 'Non — passer cette etape' },
          { value: BACK,   label: chalk.dim('Retour') },
        ],
      })
      if (p.isCancel(configureAi)) { p.cancel('Annule'); process.exit(0) }
      if (configureAi === BACK) { step = 4; continue }

      if (configureAi === 'skip') {
        pendingAiConfig = existingAi
        step = 6
        continue
      }

      const provider = await p.select<{ value: string; label: string; hint?: string }[], string>({
        message: 'Provider IA ?',
        initialValue: existingAi?.provider ?? existingProvider ?? 'anthropic',
        options: [
          { value: 'anthropic', label: 'Claude (Anthropic)', hint: 'Recommandé — Haiku rapide & économique' },
          { value: 'openai',    label: 'GPT (OpenAI)',        hint: 'gpt-4o-mini recommandé' },
          { value: BACK,        label: chalk.dim('← Retour') },
        ],
      })
      if (p.isCancel(provider)) { p.cancel('Annulé'); process.exit(0) }
      if (provider === BACK) { step = 4; continue }

      const keyName = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'
      const existingKey = getEffectiveApiKey(provider as AiProvider)
      let apiKey = existingKey ?? ''

      if (!existingKey) {
        const keyRes = await p.password({
          message: `Clé API ${keyName} ?`,
          validate: (v) => {
            if (!v.trim()) return 'La clé ne peut pas être vide'
            if (provider === 'anthropic' && !v.startsWith('sk-ant-')) return 'Clé Anthropic invalide (doit commencer par sk-ant-)'
            if (provider === 'openai' && !v.startsWith('sk-')) return 'Clé OpenAI invalide (doit commencer par sk-)'
            return undefined
          },
        })
        if (p.isCancel(keyRes)) { p.cancel('Annulé'); process.exit(0) }
        apiKey = String(keyRes).trim()
      } else {
        p.log.success(`Clé ${keyName} déjà détectée ✓`)
      }

      const models = DEFAULT_MODELS[provider as AiProvider]
      const model = await p.select<{ value: string; label: string; hint?: string }[], string>({
        message: 'Modèle ?',
        initialValue: existingAi?.provider === provider ? existingAi.model : models[0],
        options: provider === 'anthropic' ? [
          { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', hint: 'Rapide & économique — recommandé' },
          { value: 'claude-sonnet-5',           label: 'Claude Sonnet 5',  hint: 'Meilleur qualité' },
          { value: 'claude-opus-5',             label: 'Claude Opus 5',    hint: 'Maximum' },
        ] : [
          { value: 'gpt-4o-mini', label: 'GPT-4o mini', hint: 'Rapide & économique — recommandé' },
          { value: 'gpt-4o',      label: 'GPT-4o',      hint: 'Meilleur qualité' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', hint: 'Maximum' },
        ],
      })
      if (p.isCancel(model)) { p.cancel('Annulé'); process.exit(0) }

      const aiCfg: AiConfig = {
        provider: provider as AiProvider,
        model: String(model),
        ...(provider === 'anthropic' ? { anthropicKey: apiKey } : { openaiKey: apiKey }),
      }
      await writeGlobalAiConfig(aiCfg)
      if (provider === 'anthropic') process.env.ANTHROPIC_API_KEY = apiKey
      else process.env.OPENAI_API_KEY = apiKey

      pendingAiConfig = aiCfg
      p.log.success(chalk.green(`IA configurée : ${PROVIDER_LABELS[provider as AiProvider]} / ${String(model)}`))
      step = 6
      continue
    }

    // ── Étape 6 : Sélection des agents (intelligente ou manuelle) ─────────
    if (step === 6) {
      const allAgents = [...AGENTS_DEV, ...AGENTS_BUSINESS, ...AGENTS_CONTENT, ...AGENTS_EDUCATION]

      // Si IA disponible → proposer sélection intelligente
      const aiReady = !!pendingAiConfig
      const modeOptions: { value: string; label: string; hint?: string }[] = []

      if (aiReady) {
        modeOptions.push(
          { value: 'describe', label: 'Decrire le projet (IA)', hint: 'L\'IA selectionne les agents pertinents' },
          { value: 'file',     label: 'Charger un cahier des charges', hint: 'README, specs, CDC en .md/.txt' },
        )
      }
      modeOptions.push(
        { value: 'manual', label: 'Sélection manuelle par domaine', hint: '23 agents disponibles' },
        { value: BACK,     label: chalk.dim('← Retour') },
      )

      const selectionMode = await p.select<{ value: string; label: string; hint?: string }[], string>({
        message: `${stepLabel(6, TOTAL_STEPS)} Comment sélectionner les agents ?`,
        options: modeOptions,
      })
      if (p.isCancel(selectionMode)) { p.cancel('Annulé'); process.exit(0) }
      if (selectionMode === BACK) { step = 5; continue }

      if (selectionMode === 'describe' || selectionMode === 'file') {
        let descToUse = projectDescription  // pré-rempli depuis l'étape 4

        if (selectionMode === 'describe') {
          const desc = await p.text({
            message: 'Description du projet (pré-remplie depuis l\'étape 4 — modifier si besoin) :',
            placeholder: 'ex: Plateforme SaaS B2B de gestion de contrats juridiques pour PME.',
            initialValue: projectDescription,
            validate: (v) => (v.trim().length < 10 ? 'Description trop courte (min 10 caractères)' : undefined),
          })
          if (p.isCancel(desc)) { p.cancel('Annulé'); process.exit(0) }
          descToUse = String(desc).trim()
          projectDescription = descToUse
        } else {
          // Scanner les fichiers lisibles dans le dossier
          const docExtensions = ['.md', '.txt', '.yaml', '.yml', '.json']
          const docPatterns = ['readme', 'cahier', 'specs', 'requirements', 'brief', 'cdc', 'specification']
          let candidates: string[] = []

          try {
            const files = await fs.readdir(cwd)
            candidates = files.filter(f => {
              const lower = f.toLowerCase()
              const ext = path.extname(lower)
              return docExtensions.includes(ext) || docPatterns.some(p => lower.includes(p))
            })
          } catch { /* ignore */ }

          if (candidates.length === 0) {
            p.log.warn('Aucun fichier document trouvé dans ce dossier (.md, .txt, README, CDC...)')
            p.log.info('Utilisation de la description saisie à l\'étape 4.')
            if (!projectDescription) {
              const desc = await p.text({
                message: 'Décris le projet :',
                placeholder: 'ex: Application mobile React Native pour gestion de stock',
                validate: (v) => (v.trim().length < 10 ? 'Trop court (min 10 caractères)' : undefined),
              })
              if (p.isCancel(desc)) { p.cancel('Annulé'); process.exit(0) }
              projectDescription = String(desc).trim()
            }
            descToUse = projectDescription
          } else {
            const fileChoice = await p.select<{ value: string; label: string }[], string>({
              message: 'Quel fichier analyser ?',
              options: candidates.map(f => ({ value: f, label: f })),
            })
            if (p.isCancel(fileChoice)) { p.cancel('Annulé'); process.exit(0) }
            const filePath = path.join(cwd, String(fileChoice))
            const raw = await fs.readFile(filePath, 'utf-8')
            descToUse = raw.slice(0, 8000)
            p.log.success(`Fichier chargé : ${String(fileChoice)} (${raw.length} chars)`)
          }
        }

        // Appel IA pour sélection des agents
        const spin = p.spinner()
        spin.start('Analyse IA du projet et sélection des agents...')

        try {
          const agentInputs = allAgents.map(a => ({
            id: a.id,
            name: a.nameFr ?? a.name,
            domain: a.domain,
            phase: a.phase,
            description: a.descriptionFr ?? a.description,
          }))

          const result = await analyzeAndSelectAgents(
            descToUse,
            agentInputs,
            pendingAiConfig!,
            lang,
          )

          spin.stop(chalk.green(`${result.agentIds.length} agents sélectionnés par l'IA`))

          console.log()
          console.log(chalk.dim('  Raisonnement IA : ') + chalk.white(result.reasoning))
          console.log()
          console.log(chalk.bold('  Agents sélectionnés :'))
          for (const id of result.agentIds) {
            const agent = allAgents.find(a => a.id === id)
            if (agent) {
              console.log(
                `    ${chalk.hex('#FF8C00')('◆')} ${chalk.bold(id.padEnd(28))} ` +
                chalk.dim(`[${agent.phase}] ${agent.domain}`)
              )
            }
          }
          console.log()

          const confirmAi = await p.select<{ value: string; label: string }[], string>({
            message: 'Valider cette selection ?',
            options: [
              { value: 'yes',    label: chalk.green('Oui — utiliser ces agents') },
              { value: 'retry',  label: chalk.dim('Relancer avec une autre description') },
              { value: 'manual', label: chalk.dim('Choisir manuellement a la place') },
              { value: BACK,     label: chalk.dim('Retour') },
            ],
          })
          if (p.isCancel(confirmAi)) { p.cancel('Annulé'); process.exit(0) }

          if (confirmAi === 'yes') {
            const selectedDomains = new Set<DomainId>()
            for (const id of result.agentIds) {
              const agent = allAgents.find(a => a.id === id)
              if (agent) selectedDomains.add(agent.domain as DomainId)
            }
            domains = [...selectedDomains]
            ;(pendingAiConfig as AiConfig & { _selectedAgentIds?: string[] })._selectedAgentIds = result.agentIds
            step = 7  // exit loop
            continue
          } else if (confirmAi === 'retry') {
            continue
          } else if (confirmAi === BACK) {
            step = 5; continue
          }
          // 'manual' → tombe en mode manuel ci-dessous
        } catch (err) {
          spin.stop(chalk.yellow(`Analyse IA échouée : ${(err as Error).message}`))
          p.log.warn('Basculement en sélection manuelle.')
        }
      }

      // Mode manuel — sélection par domaine
      const domainRes = await p.select<{ value: string; label: string; hint?: string }[], string>({
        message: 'Domaines d\'agents à installer ?',
        initialValue: domains.join('+'),
        options: [
          { value: 'dev',                  label: 'Dev Software uniquement',          hint: '8 agents' },
          { value: 'dev+business',         label: 'Dev + Business & Stratégie',       hint: '14 agents' },
          { value: 'dev+business+content', label: 'Dev + Business + Contenu',         hint: '19 agents' },
          { value: 'all',                  label: 'Tous les domaines',                hint: '23 agents' },
          { value: 'business',             label: 'Business & Stratégie uniquement',  hint: '6 agents' },
          { value: 'content',              label: 'Création de Contenu uniquement',   hint: '5 agents' },
          { value: 'education',            label: 'Formation & Pédagogie uniquement', hint: '4 agents' },
          { value: BACK,                   label: chalk.dim('← Retour') },
        ],
      })
      if (p.isCancel(domainRes)) { p.cancel('Annulé'); process.exit(0) }
      if (domainRes === BACK) { step = 5; continue }
      if (domainRes === 'all') {
        domains = ['dev', 'business', 'content', 'education']
      } else {
        domains = (domainRes as string).split('+') as DomainId[]
      }
      step = 7  // exit loop
      continue
    }
  }

  // ─── Étape Confirmation ───────────────────────────────────────────────────
  const domainsDisplay = domains.map((d) => DOMAIN_LABELS[d] ?? d).join('\n    ')
  const shortDesc = projectDescription.length > 60 ? projectDescription.slice(0, 60) + '…' : projectDescription
  p.log.message(
    chalk.bold('\n  Récapitulatif avant génération\n') +
    `    Projet      ${chalk.cyan(projectName)}\n` +
    `    Langue      ${chalk.cyan(lang === 'fr' ? 'Français' : 'English')}\n` +
    `    Méthode     ${chalk.cyan(METHODOLOGY_LABELS[method] ?? method)}\n` +
    (shortDesc ? `    Description ${chalk.dim(shortDesc)}\n` : '') +
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
    // Relancer depuis l'étape 6 (sélection agents)
    step = 6
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

  // ─── Génération IA du contexte ────────────────────────────────────────────
  if (pendingAiConfig) {
    const aiSpin = p.spinner()
    aiSpin.start(`Génération IA du contexte avec ${pendingAiConfig.model}...`)
    try {
      const generated = await generateContextWithAI(
        { project: projectName, method, domains, lang },
        pendingAiConfig,
      )
      const contextDir = path.join(cwd, '.kuate', 'context')
      const date = new Date().toISOString().split('T')[0]
      const sections = ['memory', 'architecture', 'business', 'constraints', 'glossary'] as const
      for (const section of sections) {
        const content = generated[section]
        if (content?.trim()) {
          const header = `# ${section.charAt(0).toUpperCase() + section.slice(1)} — ${projectName}\n\n> Généré par IA (${pendingAiConfig.provider} / ${pendingAiConfig.model}) — ${date}\n\n`
          await fs.writeFile(path.join(contextDir, `${section}.md`), header + content.trim() + '\n', 'utf-8')
        }
      }
      aiSpin.stop(chalk.green('Contexte IA généré — 5 fichiers enrichis ✓'))
    } catch (err) {
      aiSpin.stop(chalk.yellow(`Génération IA échouée : ${(err as Error).message}`))
      p.log.warn('Contexte statique conservé à la place.')
    }
  }

  // ─── Génération KUATE.md — fichier de contexte maître ────────────────────
  try {
    const kuateMdPath = path.join(cwd, 'KUATE.md')
    const date = new Date().toISOString().split('T')[0]

    const phaseOrder: string[] = ['K', 'U', 'A', 'T', 'E']
    const phaseNames: Record<string, { name: string; desc: string }> = {
      K: { name: 'Knower',      desc: 'Découvrir & Contextualiser' },
      U: { name: 'Unifier',     desc: 'Agréger & Synthétiser' },
      A: { name: 'Architect',   desc: 'Concevoir & Structurer' },
      T: { name: 'Transformer', desc: 'Exécuter & Restructurer' },
      E: { name: 'Evaluator',   desc: 'Évaluer & Valider' },
    }

    const agentsByPhase: Record<string, typeof selectedAgents> = {}
    for (const phase of phaseOrder) {
      agentsByPhase[phase] = selectedAgents.filter(a => a.phase === phase)
    }

    let md = `# ${projectName} — Contexte KUATE\n\n`
    md += `> Généré par **kuate init** le ${date}\n\n`
    md += `---\n\n`
    md += `## Projet\n\n`
    md += `| Champ | Valeur |\n`
    md += `|-------|--------|\n`
    md += `| Nom | ${projectName} |\n`
    md += `| Langue | ${lang === 'fr' ? 'Français' : 'English'} |\n`
    md += `| Méthodologie | ${METHODOLOGY_LABELS[method] ?? method} |\n`
    md += `| Domaines | ${domains.map(d => DOMAIN_LABELS[d]?.split(' (')[0] ?? d).join(', ')} |\n`
    md += `| Agents installés | ${selectedAgents.length} |\n\n`

    if (projectDescription) {
      md += `## Description\n\n${projectDescription}\n\n`
    }

    md += `---\n\n`
    md += `## Agents par Phase KUATE\n\n`
    md += `> Chaque agent a un rôle précis dans la méthode. Utilisez \`kuate phase <K|U|A|T|E>\` pour interagir avec eux.\n\n`

    for (const phase of phaseOrder) {
      const agents = agentsByPhase[phase] ?? []
      if (agents.length === 0) continue
      const info = phaseNames[phase]
      md += `### Phase ${phase} — ${info.name} · *${info.desc}*\n\n`
      md += `| Agent ID | Nom | Domaine | Rôle |\n`
      md += `|----------|-----|---------|------|\n`
      for (const agent of agents) {
        const name = (agent as Record<string, unknown>).nameFr as string ?? agent.name ?? agent.id
        const description = (agent as Record<string, unknown>).descriptionFr as string ?? (agent as Record<string, unknown>).description as string ?? ''
        const shortDesc = description.length > 80 ? description.slice(0, 80) + '…' : description
        md += `| \`${agent.id}\` | ${name} | ${agent.domain} | ${shortDesc} |\n`
      }
      md += '\n'
    }

    md += `---\n\n`
    md += `## Workflow recommandé\n\n`
    md += `\`\`\`bash\n`
    md += `# 1. Configurez le contexte du projet\n`
    md += `kuate memory seed\n\n`
    md += `# 2. Travaillez phase par phase\n`
    for (const phase of phaseOrder) {
      if ((agentsByPhase[phase] ?? []).length > 0) {
        md += `kuate phase ${phase}    # ${phaseNames[phase].name} — ${phaseNames[phase].desc}\n`
      }
    }
    md += `\n# 3. Exécution directe d'un agent\n`
    if (selectedAgents.length > 0) {
      md += `kuate run --agent ${selectedAgents[0].id} --task "Votre tâche ici"\n`
    }
    md += `\n# 4. Exportez pour Claude\n`
    md += `kuate build --target claude\n`
    md += `\`\`\`\n\n`

    md += `---\n\n`
    md += `## Instructions pour Claude\n\n`
    md += `Ce fichier est le contexte maître du projet **${projectName}**.\n\n`
    md += `Quand vous travaillez avec Claude sur ce projet :\n`
    md += `1. Partagez ce fichier \`KUATE.md\` en premier message\n`
    md += `2. Claude comprendra la structure des agents et leurs rôles\n`
    md += `3. Référencez les agents par leur ID (ex: \`business-analyst\`, \`dev-senior\`)\n`
    md += `4. Indiquez la phase KUATE dans laquelle vous travaillez\n\n`
    md += `> 💡 **Conseil** : Mettez à jour ce fichier avec \`kuate memory seed\` après chaque session de travail.\n`

    await fs.writeFile(kuateMdPath, md, 'utf-8')
    p.log.success(chalk.green('KUATE.md généré — contexte maître du projet ✓'))
  } catch (err) {
    p.log.warn(`KUATE.md non généré : ${(err as Error).message}`)
  }

  // ─── Résumé final ─────────────────────────────────────────────────────────
  const line = grad('─'.repeat(52))
  console.log('\n' + line)
  console.log(chalk.bold.green('  Méthode KUATE initialisée avec succès'))
  console.log(line)
  console.log(`\n  ${chalk.dim('Projet')}      ${chalk.white(projectName)}`)
  console.log(`  ${chalk.dim('Méthode')}     ${chalk.white(METHODOLOGY_LABELS[method] ?? method)}`)
  console.log(`  ${chalk.dim('Agents')}      ${chalk.cyan(String(selectedAgents.length))} générés dans ${chalk.dim('.kuate/agents/')}`)
  console.log(`  ${chalk.dim('Workflows')}   ${chalk.cyan(String(methodology.workflowIds.length))} disponibles`)
  console.log(`  ${chalk.dim('Contexte')}    ${chalk.dim('.kuate/context/')} — 5 sections prêtes`)
  console.log(`  ${chalk.dim('KUATE.md')}    ${chalk.green('✓')} contexte maître — partagez avec Claude`)
  console.log(line + '\n')

  // ─── Launcher post-init ────────────────────────────────────────────────────
  console.log(
    chalk.bold.hex('#FF8C00')('  Que voulez-vous faire maintenant ?\n') +
    chalk.dim('  Vous avez ') + chalk.cyan(String(selectedAgents.length)) +
    chalk.dim(' agents prêts. Commençons à les utiliser.')
  )
  console.log()

  const LAUNCH_NEXT    = 'next'
  const LAUNCH_MEMORY  = 'memory'
  const LAUNCH_SPECS   = 'specs'
  const LAUNCH_SKIP    = 'skip'

  let launchLoop = true
  let launch = ''

  while (launchLoop) {
    const launchChoice = await p.select<{ value: string; label: string; hint?: string }[], string>({
      message: 'Que voulez-vous faire maintenant ?',
      options: [
        {
          value: 'projet',
          label: chalk.bold('Lancer le pipeline complet K → U → A → T') + chalk.dim(' — recommande'),
          hint: 'Specs → Backlog → Architecture → Code — les agents generent tout avec suivi de phase',
        },
        {
          value: LAUNCH_NEXT,
          label: 'Laisser l\'IA me guider (action suivante)',
          hint: 'Suggestion de la prochaine tache selon l\'etat du projet',
        },
        {
          value: LAUNCH_MEMORY,
          label: 'Remplir le contexte projet d\'abord',
          hint: 'kuate memory seed — enrichit les suggestions',
        },
        {
          value: LAUNCH_SKIP,
          label: chalk.dim('Continuer plus tard'),
          hint: 'kuate projet | kuate next quand vous etes pret',
        },
      ],
    })

    if (p.isCancel(launchChoice) || launchChoice === LAUNCH_SKIP) {
      console.log()
      console.log(chalk.dim('  Quand vous etes pret : ') + chalk.cyan('kuate next'))
      console.log()
      return
    }

    launch = launchChoice
    launchLoop = false
  }

  if (launch === LAUNCH_SKIP || !launch) {
    return
  }

  if (launch === 'projet') {
    const { projetCommand } = await import('./projet.js')
    await projetCommand(cwd)
    return
  }

  if (launch === LAUNCH_MEMORY) {
    console.log()
    const { memorySeedCommand } = await import('./memory.js')
    await memorySeedCommand(cwd)
    return
  }

  if (launch === LAUNCH_SPECS) {
    // Lancer business-analyst directement pour rédiger les specs
    const agentId = 'business-analyst'
    const agentFile = path.join(cwd, '.kuate', 'agents', `${agentId}.md`)

    if (!pendingAiConfig) {
      console.log()
      p.log.warn('IA non configurée. Configurez-la avec : kuate config ai')
      return
    }

    if (!fs.existsSync(agentFile)) {
      p.log.warn(`L'agent ${agentId} n'est pas installé dans ce projet. Lancez kuate next pour d'autres options.`)
      return
    }

    const taskSpec = lang === 'fr'
      ? `Tu es l'agent business-analyst du projet "${projectName}". \
Rédige un document de spécifications complet (specs) pour ce projet. \
Inclus : objectif, utilisateurs cibles, user stories (format "En tant que... je veux... afin de..."), \
critères d'acceptation, contraintes techniques, et le découpage en phases KUATE (K/U/A/T/E). \
Base-toi sur les informations disponibles dans le contexte projet.`
      : `You are the business-analyst agent of project "${projectName}". \
Write a complete specification document (specs) for this project. \
Include: objective, target users, user stories ("As a... I want... So that..."), \
acceptance criteria, technical constraints, and KUATE phase breakdown (K/U/A/T/E). \
Use the project context available.`

    console.log()
    console.log(chalk.bold.hex('#FFB300')(`  ◆ business-analyst — Rédaction des specs`))
    console.log(chalk.dim('  ' + '─'.repeat(55)))
    console.log()

    let result
    try {
      result = await runAgent({
        agentId,
        task: taskSpec,
        cwd,
        aiConfig: pendingAiConfig,
        onChunk: (chunk) => process.stdout.write(chunk),
      })
    } catch (err) {
      console.error(chalk.red(`\n  Erreur IA : ${(err as Error).message}`))
      return
    }

    console.log('\n')
    console.log(chalk.dim('  ' + '─'.repeat(55)))
    console.log()

    // Proposer de sauvegarder les specs
    const files = detectFilesInOutput(result.content)
    if (files.length > 0) {
      const saveFiles = await p.confirm({
        message: `Sauvegarder ${files.length} fichier(s) de specs dans le projet ?`,
        initialValue: true,
      })
      if (!p.isCancel(saveFiles) && saveFiles) {
        for (const f of files) {
          await fs.ensureDir(path.dirname(path.join(cwd, f.filename)))
          await fs.writeFile(path.join(cwd, f.filename), f.content, 'utf-8')
          console.log(`    ${chalk.green('✓')} ${f.filename}`)
        }
      }
    } else {
      // Sauvegarder les specs comme docs/specs.md
      const saveSpec = await p.confirm({
        message: 'Sauvegarder les specs dans docs/specs.md ?',
        initialValue: true,
      })
      if (!p.isCancel(saveSpec) && saveSpec) {
        await fs.ensureDir(path.join(cwd, 'docs'))
        await fs.writeFile(path.join(cwd, 'docs', 'specs.md'), result.content, 'utf-8')
        p.log.success(chalk.green('Specs sauvegardées dans docs/specs.md'))
      }
    }

    // Mémoriser
    const date = new Date().toISOString().split('T')[0]
    await fs.appendFile(
      path.join(cwd, '.kuate', 'context', 'memory.md'),
      `\n## ${date} — business-analyst\n\nSpécifications initiales du projet rédigées.\n`
    )

    console.log()
    p.log.success('Specs générées. Prochaine étape : ' + chalk.cyan('kuate next'))
    console.log()
    return
  }

  // LAUNCH_NEXT — assistant IA guidé
  if (launch === LAUNCH_NEXT) {
    if (!pendingAiConfig) {
      console.log()
      p.log.warn('IA non configurée. Configurez-la avec : ' + chalk.cyan('kuate config ai'))
      console.log(chalk.dim('  Puis lancez : ') + chalk.cyan('kuate next'))
      return
    }

    console.log()
    const agentInputs = selectedAgents.map(a => ({
      id: a.id,
      name: (a as Record<string, unknown>).nameFr as string ?? a.name,
      domain: a.domain,
      phase: a.phase,
      description: (a as Record<string, unknown>).descriptionFr as string ?? '',
    }))

    const spin2 = p.spinner()
    spin2.start('L\'IA analyse le projet et génère les premières suggestions...')

    let suggestions
    try {
      suggestions = await generateNextSuggestions(
        `Projet : ${projectName}\nMéthodologie : ${method}\nDomaines : ${domains.join(', ')}\n${projectDescription ? `Description : ${projectDescription}` : ''}`,
        agentInputs,
        '',
        pendingAiConfig,
        lang,
      )
      spin2.stop(chalk.green(`${suggestions.length} suggestions prêtes`))
    } catch (err) {
      spin2.stop(chalk.yellow(`Erreur IA : ${(err as Error).message}`))
      console.log(chalk.dim('  Lancez : ') + chalk.cyan('kuate next') + chalk.dim(' quand prêt.'))
      return
    }

    const PHASE_COLORS: Record<string, string> = {
      K: '#FFB300', U: '#FF8C00', A: '#E06000', T: '#C04800', E: '#8B3500',
    }

    console.log()
    const actionChoice = await p.select<{ value: string; label: string; hint?: string }[], string>({
      message: 'Premiere action recommandee — choisissez :',
      options: [
        ...suggestions.slice(0, 6).map((s, i) => ({
          value: String(i),
          label: chalk.bold.hex(PHASE_COLORS[s.phase] ?? '#FF8C00')(`[${s.phase}]`) +
            '  ' + chalk.cyan(s.agentId.padEnd(26)) +
            chalk.white(s.task.length > 50 ? s.task.slice(0, 50) + '...' : s.task),
          hint: s.reason,
        })),
        { value: 'skip',   label: chalk.dim('Continuer plus tard — kuate next') },
        { value: BACK,     label: chalk.dim('Retour') },
      ],
    })

    if (p.isCancel(actionChoice) || actionChoice === BACK) {
      // Retour : proposer le pipeline complet ou kuate next
      console.log()
      console.log(chalk.dim('  Lancez le pipeline complet : ') + chalk.cyan('kuate projet'))
      console.log(chalk.dim('  Ou l\'assistant IA :         ') + chalk.cyan('kuate next'))
      console.log()
      return
    }

    if (actionChoice === 'skip') {
      console.log()
      console.log(chalk.dim('  Pret quand vous etes : ') + chalk.cyan('kuate next'))
      console.log()
      return
    }

    const selected = suggestions[parseInt(actionChoice, 10)]
    console.log()
    console.log(chalk.bold.hex(PHASE_COLORS[selected.phase] ?? '#FF8C00')(`  ◆ ${selected.agentId}`))
    console.log(chalk.dim(`  ${selected.task}`))
    console.log(chalk.dim('  ' + '─'.repeat(55)))
    console.log()

    try {
      const res = await runAgent({
        agentId: selected.agentId,
        task: selected.task,
        cwd,
        aiConfig: pendingAiConfig,
        onChunk: (chunk) => process.stdout.write(chunk),
      })

      console.log('\n')

      const files = detectFilesInOutput(res.content)
      if (files.length > 0) {
        const sv = await p.confirm({
          message: `Sauvegarder ${files.length} fichier(s) dans le projet ?`,
          initialValue: true,
        })
        if (!p.isCancel(sv) && sv) {
          for (const f of files) {
            await fs.ensureDir(path.dirname(path.join(cwd, f.filename)))
            await fs.writeFile(path.join(cwd, f.filename), f.content, 'utf-8')
            console.log(`    ${chalk.green('✓')} ${f.filename}`)
          }
        }
      } else {
        // Sauvegarder la réponse si c'est des specs/analyse
        const saveDoc = await p.confirm({
          message: 'Sauvegarder cette réponse dans docs/ ?',
          initialValue: true,
        })
        if (!p.isCancel(saveDoc) && saveDoc) {
          await fs.ensureDir(path.join(cwd, 'docs'))
          const filename = `${selected.agentId}-${new Date().toISOString().split('T')[0]}.md`
          await fs.writeFile(path.join(cwd, 'docs', filename), res.content, 'utf-8')
          p.log.success(chalk.green(`Sauvegardé dans docs/${filename}`))
        }
      }
    } catch (err) {
      console.error(chalk.red(`\n  Erreur IA : ${(err as Error).message}`))
    }

    console.log()
    p.log.success('Pour continuer : ' + chalk.cyan('kuate next'))
    console.log()
  }
}
