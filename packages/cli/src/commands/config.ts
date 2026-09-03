import chalk from 'chalk'
import * as p from '@clack/prompts'
import {
  readConfig,
  isKuateProject,
  readGlobalAiConfig,
  writeGlobalAiConfig,
  detectAvailableProvider,
  DEFAULT_MODELS,
  PROVIDER_LABELS,
} from '@methode-kuate/core'
import type { AiProvider } from '@methode-kuate/core'
import { initI18n, t } from '../i18n/index.js'

export async function configShowCommand(cwd: string): Promise<void> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red(t('error.notKuateProject')))
    process.exit(1)
  }

  const config = await readConfig(cwd)
  initI18n(config.lang)

  const aiConfig = await readGlobalAiConfig()
  const provider = detectAvailableProvider()

  console.log()
  console.log(chalk.bold.hex('#6c63ff')(`  ${t('config.show.header')}`))
  console.log(chalk.dim('  ' + '─'.repeat(40)))
  console.log(`  ${chalk.dim('project')}   ${chalk.bold(config.project)}`)
  console.log(`  ${chalk.dim('lang')}      ${chalk.cyan(config.lang)}`)
  console.log(`  ${chalk.dim('method')}    ${chalk.green(config.method)}`)
  console.log(`  ${chalk.dim('domains')}   ${config.domains.join(', ')}`)
  console.log(`  ${chalk.dim('version')}   ${config.version}`)
  console.log(`  ${chalk.dim('agents')}    ${config.agents.length} installés`)
  console.log()
  console.log(chalk.dim('  ─ IA ─────────────────────────────────────'))
  if (aiConfig) {
    console.log(`  ${chalk.dim('provider')}  ${chalk.hex('#FF8C00')(PROVIDER_LABELS[aiConfig.provider])}`)
    console.log(`  ${chalk.dim('model')}     ${chalk.cyan(aiConfig.model)}`)
    console.log(`  ${chalk.dim('api key')}   ${provider ? chalk.green('✓ détectée') : chalk.red('✗ manquante (env var)')}`)
  } else {
    console.log(`  ${chalk.dim('IA')}        ${chalk.dim('non configurée — lancez kuate config ai')}`)
    if (provider) {
      console.log(`  ${chalk.dim('api key')}   ${chalk.yellow('✓ détectée mais provider non choisi')}`)
    }
  }
  console.log()
}

export async function configAiCommand(): Promise<void> {
  console.log()
  console.log(chalk.bold.hex('#FF8C00')('  KUATE CONFIG AI'))
  console.log(chalk.dim('  Configure le provider IA pour la génération de contexte.'))
  console.log(chalk.dim('  La clé API est lue depuis les variables d\'environnement.'))
  console.log()

  const detectedProvider = detectAvailableProvider()
  const currentConfig = await readGlobalAiConfig()

  if (detectedProvider) {
    console.log(`  ${chalk.green('✓')} Clé détectée : ${chalk.bold(detectedProvider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY')}`)
  } else {
    console.log(`  ${chalk.yellow('!')} Aucune clé API détectée.`)
    console.log(chalk.dim('  Définissez ANTHROPIC_API_KEY ou OPENAI_API_KEY dans votre environnement.'))
  }
  console.log()

  const providerOptions: { value: string; label: string; hint?: string }[] = [
    { value: 'anthropic', label: 'Claude (Anthropic)', hint: 'ANTHROPIC_API_KEY' },
    { value: 'openai',    label: 'GPT (OpenAI)',        hint: 'OPENAI_API_KEY' },
  ]

  const provider = await p.select<{ value: string; label: string; hint?: string }[], string>({
    message: 'Provider IA ?',
    initialValue: currentConfig?.provider ?? detectedProvider ?? 'anthropic',
    options: providerOptions,
  })
  if (p.isCancel(provider)) { p.cancel('Annulé'); process.exit(0) }

  const models = DEFAULT_MODELS[provider as AiProvider]
  const modelOptions = models.map(m => ({ value: m, label: m }))

  const model = await p.select<{ value: string; label: string }[], string>({
    message: 'Modèle ?',
    initialValue: currentConfig?.provider === provider ? (currentConfig.model ?? models[0]) : models[0],
    options: modelOptions,
  })
  if (p.isCancel(model)) { p.cancel('Annulé'); process.exit(0) }

  await writeGlobalAiConfig({ provider: provider as AiProvider, model: String(model) })

  p.log.success(chalk.green(`Configuration sauvegardée : ${PROVIDER_LABELS[provider as AiProvider]} / ${String(model)}`))
  console.log()

  const keyName = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'
  const hasKey = provider === 'anthropic'
    ? !!process.env.ANTHROPIC_API_KEY
    : !!process.env.OPENAI_API_KEY

  if (!hasKey) {
    console.log(`  ${chalk.yellow('!')} Définissez ${chalk.bold(keyName)} avant de lancer kuate init`)
    console.log(chalk.dim(`  Exemple: set ${keyName}=sk-...  (Windows)`))
    console.log(chalk.dim(`           export ${keyName}=sk-...  (Mac/Linux)`))
  } else {
    console.log(`  ${chalk.green('✓')} Clé ${keyName} détectée — prêt pour kuate init`)
  }
  console.log()
}
