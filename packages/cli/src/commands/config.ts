import chalk from 'chalk'
import * as p from '@clack/prompts'
import {
  readConfig,
  isKuateProject,
  readGlobalAiConfig,
  getEffectiveApiKey,
  getKeySource,
  getEnvKeyName,
  setProviderKey,
  removeProviderKey,
  setActiveProvider,
  maskKey,
  validateKeyFormat,
  testApiKey,
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
    console.log(`  ${chalk.dim('actif')}     ${chalk.hex('#FF8C00')(PROVIDER_LABELS[aiConfig.provider])} / ${chalk.cyan(aiConfig.model)}`)
  } else {
    console.log(`  ${chalk.dim('IA')}        ${chalk.dim('non configurée — lancez kuate config ai')}`)
  }
  for (const prov of PROVIDERS) {
    console.log(`  ${chalk.dim(prov.padEnd(9))} ${await describeKey(prov)}`)
  }
  console.log()
}

const PROVIDERS: AiProvider[] = ['anthropic', 'openai']

async function describeKey(prov: AiProvider): Promise<string> {
  const key = getEffectiveApiKey(prov)
  if (!key) return chalk.red('✗ aucune clé')
  const source = await getKeySource(prov)
  const where = source === 'file' ? '~/.kuate/global.json' : `variable ${getEnvKeyName(prov)}`
  return `${chalk.green('✓')} ${maskKey(key)} ${chalk.dim(`(${where})`)}`
}

export async function configAiCommand(): Promise<void> {
  console.log()
  console.log(chalk.bold.hex('#FF8C00')('  KUATE CONFIG AI'))
  console.log(chalk.dim('  Provider actif, modèle et clés API (modifiables à tout moment).'))
  console.log(chalk.dim("  Une clé enregistrée ici est prioritaire sur la variable d'environnement."))
  console.log()

  while (true) {
    const current = await readGlobalAiConfig()
    console.log(chalk.dim('  ─ État ─────────────────────────────────'))
    console.log(`  ${chalk.dim('actif')}     ${current ? `${PROVIDER_LABELS[current.provider]} / ${current.model}` : chalk.dim('aucun')}`)
    for (const prov of PROVIDERS) {
      console.log(`  ${chalk.dim(prov.padEnd(9))} ${await describeKey(prov)}`)
    }
    console.log()

    const action = await p.select<{ value: string; label: string }[], string>({
      message: 'Que faire ?',
      options: [
        { value: 'switch', label: 'Changer le provider / modèle actif' },
        { value: 'key',    label: 'Ajouter ou modifier une clé API' },
        { value: 'test',   label: 'Tester une clé' },
        { value: 'remove', label: 'Supprimer une clé enregistrée' },
        { value: 'quit',   label: 'Quitter' },
      ],
    })
    if (p.isCancel(action) || action === 'quit') { p.outro('Terminé'); return }

    if (action === 'switch') await switchProvider()
    else if (action === 'key') await editKey()
    else if (action === 'test') await testKey()
    else if (action === 'remove') await deleteKey()
  }
}

async function pickProvider(message: string, initial?: AiProvider): Promise<AiProvider | null> {
  const options = []
  for (const prov of PROVIDERS) {
    const has = !!getEffectiveApiKey(prov)
    options.push({
      value: prov,
      label: PROVIDER_LABELS[prov],
      hint: has ? 'clé présente' : 'aucune clé',
    })
  }
  const res = await p.select<{ value: string; label: string; hint?: string }[], string>({
    message,
    initialValue: initial ?? 'anthropic',
    options,
  })
  if (p.isCancel(res)) return null
  return res as AiProvider
}

async function switchProvider(): Promise<void> {
  const current = await readGlobalAiConfig()
  const prov = await pickProvider('Provider IA ?', current?.provider)
  if (!prov) return

  if (!getEffectiveApiKey(prov)) {
    p.log.warn(`Aucune clé pour ${PROVIDER_LABELS[prov]}. Ajoutez-en une d'abord (« Ajouter ou modifier une clé »).`)
    return
  }

  const models = DEFAULT_MODELS[prov]
  const model = await p.select<{ value: string; label: string }[], string>({
    message: 'Modèle ?',
    initialValue: current?.provider === prov ? current.model : models[0],
    options: models.map(m => ({ value: m, label: m })),
  })
  if (p.isCancel(model)) return

  await setActiveProvider(prov, String(model))
  p.log.success(chalk.green(`Actif : ${PROVIDER_LABELS[prov]} / ${String(model)} (clés conservées)`))
}

async function editKey(): Promise<void> {
  const prov = await pickProvider('Pour quel provider ?')
  if (!prov) return

  const existing = getEffectiveApiKey(prov)
  if (existing) p.log.info(`Clé actuelle : ${maskKey(existing)}`)

  const keyRes = await p.password({
    message: `Nouvelle clé ${getEnvKeyName(prov)} ?`,
    validate: (v) => validateKeyFormat(prov, v),
  })
  if (p.isCancel(keyRes)) return
  const key = String(keyRes).trim()

  const spinner = p.spinner()
  spinner.start('Vérification de la clé…')
  const err = await testApiKey(prov, key)
  spinner.stop(err ? chalk.yellow(`Non vérifiée : ${err}`) : chalk.green('Clé valide ✓'))

  if (err) {
    const keep = await p.confirm({ message: 'Enregistrer quand même ?', initialValue: false })
    if (p.isCancel(keep) || !keep) { p.log.info('Clé non enregistrée.'); return }
  }

  await setProviderKey(prov, key)
  p.log.success(chalk.green(`Clé ${PROVIDER_LABELS[prov]} enregistrée : ${maskKey(key)}`))
}

async function testKey(): Promise<void> {
  const prov = await pickProvider('Quelle clé tester ?')
  if (!prov) return
  const key = getEffectiveApiKey(prov)
  if (!key) { p.log.warn('Aucune clé à tester.'); return }
  const spinner = p.spinner()
  spinner.start('Test en cours…')
  const err = await testApiKey(prov, key)
  spinner.stop(err ? chalk.red(`✗ ${err}`) : chalk.green(`✓ ${PROVIDER_LABELS[prov]} : clé valide`))
}

async function deleteKey(): Promise<void> {
  const prov = await pickProvider('Supprimer la clé de quel provider ?')
  if (!prov) return
  if ((await getKeySource(prov)) !== 'file') {
    p.log.warn(`Aucune clé enregistrée dans le fichier (une variable d'environnement ne peut pas être supprimée d'ici).`)
    return
  }
  const ok = await p.confirm({ message: `Supprimer la clé ${PROVIDER_LABELS[prov]} de ~/.kuate/global.json ?`, initialValue: false })
  if (p.isCancel(ok) || !ok) return
  await removeProviderKey(prov)
  p.log.success('Clé supprimée.')
}
