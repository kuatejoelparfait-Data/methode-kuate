import chalk from 'chalk'
import * as p from '@clack/prompts'
import type { Command } from 'commander'
import {
  readGlobalAiConfig,
  getEffectiveApiKey,
  getEnvKeyName,
  setProviderKey,
  setActiveProvider,
  maskKey,
  validateKeyFormat,
  testApiKey,
  DEFAULT_MODELS,
  PROVIDER_LABELS,
} from '@methode-kuate/core'
import type { AiConfig, AiProvider } from '@methode-kuate/core'

export interface AiSelectOptions {
  chooseAi?: boolean
  provider?: string
  model?: string
}

export const AI_PROVIDERS: AiProvider[] = ['anthropic', 'openai']

/** Ajoute --choose-ai / --provider / --model à une commande qui appelle l'IA. */
export function addAiOptions(cmd: Command): Command {
  return cmd
    .option('--choose-ai', 'Choisir le provider et le modèle IA avant de lancer')
    .option('--provider <nom>', 'Provider IA pour cette exécution (anthropic | openai)')
    .option('--model <nom>', 'Modèle IA pour cette exécution')
}

export function aiOptsOf(opts: AiSelectOptions): AiSelectOptions {
  return { chooseAi: opts.chooseAi, provider: opts.provider, model: opts.model }
}

function isInteractive(): boolean {
  return !!process.stdin.isTTY && !!process.stdout.isTTY
}

function fail(message: string): never {
  console.error(chalk.red(`  ${message}`))
  process.exit(1)
}

/** Demande une clé, la vérifie par un appel réel, l'enregistre. Retourne false si annulé. */
export async function promptAndSaveKey(prov: AiProvider): Promise<boolean> {
  const existing = getEffectiveApiKey(prov)
  if (existing) p.log.info(`Clé actuelle : ${maskKey(existing)}`)

  const keyRes = await p.password({
    message: `Clé ${getEnvKeyName(prov)} ?`,
    validate: (v) => validateKeyFormat(prov, v),
  })
  if (p.isCancel(keyRes)) return false
  const key = String(keyRes).trim()

  const spinner = p.spinner()
  spinner.start('Vérification de la clé…')
  const err = await testApiKey(prov, key)
  spinner.stop(err ? chalk.yellow(`Non vérifiée : ${err}`) : chalk.green('Clé valide ✓'))

  if (err) {
    const keep = await p.confirm({ message: 'Enregistrer quand même ?', initialValue: false })
    if (p.isCancel(keep) || !keep) { p.log.info('Clé non enregistrée.'); return false }
  }

  await setProviderKey(prov, key)
  p.log.success(chalk.green(`Clé ${PROVIDER_LABELS[prov]} enregistrée : ${maskKey(key)}`))
  return true
}

export function parseProvider(value: string): AiProvider {
  const v = value.trim().toLowerCase()
  if (!AI_PROVIDERS.includes(v as AiProvider)) {
    fail(`Provider inconnu "${value}". Valeurs possibles : ${AI_PROVIDERS.join(', ')}.`)
  }
  return v as AiProvider
}

function defaultModel(prov: AiProvider, base: AiConfig | null): string {
  return base?.provider === prov ? base.model : DEFAULT_MODELS[prov][0]
}

/**
 * Détermine provider + modèle pour cette exécution.
 * Priorité : flags > sélection interactive (--choose-ai) > config globale.
 * Les choix n'altèrent pas la config globale, sauf si l'utilisateur le demande explicitement.
 */
export async function resolveAiConfig(opts: AiSelectOptions = {}): Promise<AiConfig> {
  const base = await readGlobalAiConfig()
  const interactive = isInteractive()

  let provider: AiProvider | undefined = opts.provider ? parseProvider(opts.provider) : undefined
  let model: string | undefined = opts.model?.trim() || undefined

  if (opts.chooseAi) {
    if (!interactive) {
      console.warn(chalk.yellow('  --choose-ai ignoré : terminal non interactif.'))
    } else {
      if (!provider) {
        const res = await p.select<{ value: string; label: string; hint?: string }[], string>({
          message: 'Provider IA pour cette exécution ?',
          initialValue: base?.provider ?? 'anthropic',
          options: AI_PROVIDERS.map(prov => ({
            value: prov,
            label: PROVIDER_LABELS[prov],
            hint: getEffectiveApiKey(prov) ? 'clé présente' : 'aucune clé',
          })),
        })
        if (p.isCancel(res)) { p.cancel('Annulé'); process.exit(0) }
        provider = res as AiProvider
      }
      if (!model) {
        const models = DEFAULT_MODELS[provider]
        const res = await p.select<{ value: string; label: string }[], string>({
          message: 'Modèle ?',
          initialValue: defaultModel(provider, base),
          options: models.map(m => ({ value: m, label: m })),
        })
        if (p.isCancel(res)) { p.cancel('Annulé'); process.exit(0) }
        model = String(res)
      }
    }
  }

  provider ??= base?.provider
  if (!provider) {
    fail('IA non configurée. Lancez kuate config ai, ou utilisez --choose-ai.')
  }
  model ??= defaultModel(provider, base)

  if (!getEffectiveApiKey(provider)) {
    if (!interactive) {
      fail(`Clé manquante pour ${PROVIDER_LABELS[provider]}. Lancez kuate config ai ou définissez ${getEnvKeyName(provider)}.`)
    }
    p.log.warn(`Aucune clé pour ${PROVIDER_LABELS[provider]}.`)
    if (!(await promptAndSaveKey(provider))) fail('Clé requise pour continuer.')
  }

  if (opts.chooseAi && interactive && (base?.provider !== provider || base?.model !== model)) {
    const persist = await p.confirm({ message: 'Définir comme choix par défaut ?', initialValue: false })
    if (!p.isCancel(persist) && persist) {
      await setActiveProvider(provider, model)
      p.log.success('Choix par défaut mis à jour.')
    }
  }

  // Relecture : intègre une clé qui vient d'être saisie ; provider/modèle choisis priment.
  const fresh = await readGlobalAiConfig()
  return { ...(fresh ?? {}), provider, model }
}
