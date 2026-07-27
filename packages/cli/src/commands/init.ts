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

const VERSION = '1.1.0'
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
  const W   = 72
  const INN = W - 2
  const LETTERS = ['K', 'U', 'A', 'T', 'E']
  const FILLED  = '██'
  const EMPTY   = '  '
  const SEP     = '   '

  const bdr = (l: string, r: string) =>
    chalk.hex(ORANGE)(l) + grad('═'.repeat(INN)) + chalk.hex(BROWN)(r)
  const empty = chalk.hex(ORANGE)('║') + ' '.repeat(INN) + chalk.hex(BROWN)('║')

  const ll = (raw: string, styled: string) => {
    const rpad = Math.max(0, INN - 2 - [...raw].length)
    return chalk.hex(ORANGE)('║') + '  ' + styled + ' '.repeat(rpad) + chalk.hex(BROWN)('║')
  }
  const cl = (raw: string, styled: string) => {
    const lpad = Math.max(0, Math.floor((INN - [...raw].length) / 2))
    const rpad = Math.max(0, INN - lpad - [...raw].length)
    return chalk.hex(ORANGE)('║') + ' '.repeat(lpad) + styled + ' '.repeat(rpad) + chalk.hex(BROWN)('║')
  }

  // pixel art centering
  const PCONTENT = 5 * 2 * LETTERS.length + SEP.length * (LETTERS.length - 1)
  const PLP = Math.floor((INN - PCONTENT) / 2)
  const PRP = INN - PLP - PCONTENT

  const welcomeRaw = 'Welcome to  KUATE méthode'
  const welcomeStyled = chalk.hex('#FFB300')('Welcome to  ') + grad('KUATE méthode', true)

  const v1raw = "CLI d'orchestration d'agents IA  ·  v" + VERSION
  const a1raw = 'Kuate Joel Parfait  ·  linkedin.com/in/joelparfaitkuate'
  const d1    = "Orchestration d'Agents IA qui dote tout projet d'une"
  const d2    = "méthodologie structurée, d'agents IA spécialisés et"
  const d3    = "d'une mémoire persistante."

  console.log()
  console.log(bdr('╔', '╗'))
  console.log(empty)
  console.log(cl(welcomeRaw, welcomeStyled))
  console.log(empty)

  for (let row = 0; row < 5; row++) {
    let content = ''
    for (let li = 0; li < LETTERS.length; li++) {
      const grid = PIXEL_FONT[LETTERS[li]]
      for (let col = 0; col < 5; col++) {
        content += grid[row][col] ? chalk.hex(PIXEL_ROW_COLORS[row])(FILLED) : EMPTY
      }
      if (li < LETTERS.length - 1) content += SEP
    }
    console.log(chalk.hex(ORANGE)('║') + ' '.repeat(PLP) + content + ' '.repeat(PRP) + chalk.hex(BROWN)('║'))
  }

  console.log(empty)
  console.log(bdr('╠', '╣'))
  console.log(ll(v1raw, grad(v1raw, true)))
  console.log(ll(a1raw, chalk.hex('#FF8C00')(a1raw)))
  console.log(bdr('╚', '╝'))
  console.log()
}

export async function initCommand(cwd: string): Promise<void> {
  const detectedLang = detectSystemLang()
  initI18n(detectedLang)

  pixelBanner()

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
  const line = grad('─'.repeat(52))
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
