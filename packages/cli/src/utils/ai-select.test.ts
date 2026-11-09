import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'

describe('resolveAiConfig (non interactif)', () => {
  let home: string

  beforeEach(async () => {
    home = await fs.mkdtemp(path.join(os.tmpdir(), 'kuate-cli-'))
    vi.resetModules()
    vi.spyOn(os, 'homedir').mockReturnValue(home)
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`)
    }) as never)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY
  })
  afterEach(() => vi.restoreAllMocks())

  const seed = (data: object) =>
    fs.outputJson(path.join(home, '.kuate', 'global.json'), data)
  const load = () => import('./ai-select.js')

  it('utilise la config globale sans flags', async () => {
    await seed({ provider: 'anthropic', model: 'claude-sonnet-5', anthropicKey: 'sk-ant-AAAAAAAAAAAA' })
    const { resolveAiConfig } = await load()
    const cfg = await resolveAiConfig({})
    expect(cfg.provider).toBe('anthropic')
    expect(cfg.model).toBe('claude-sonnet-5')
  })

  it('--provider/--model priment et ne modifient pas le fichier global', async () => {
    const data = {
      provider: 'anthropic', model: 'claude-sonnet-5',
      anthropicKey: 'sk-ant-AAAAAAAAAAAA', openaiKey: 'sk-OOOOOOOOOOOO',
    }
    await seed(data)
    const { resolveAiConfig } = await load()
    const cfg = await resolveAiConfig({ provider: 'openai', model: 'gpt-4o' })
    expect(cfg.provider).toBe('openai')
    expect(cfg.model).toBe('gpt-4o')
    expect(await fs.readJson(path.join(home, '.kuate', 'global.json'))).toEqual(data)
  })

  it('--provider sans --model prend le modèle par défaut du provider', async () => {
    await seed({ provider: 'anthropic', model: 'claude-sonnet-5', anthropicKey: 'sk-ant-AAAAAAAAAAAA', openaiKey: 'sk-OOOOOOOOOOOO' })
    const { resolveAiConfig } = await load()
    const cfg = await resolveAiConfig({ provider: 'openai' })
    expect(cfg.model).toBe('gpt-4o-mini')
  })

  it('provider inconnu : sortie en erreur', async () => {
    await seed({ provider: 'anthropic', model: 'm', anthropicKey: 'sk-ant-AAAAAAAAAAAA' })
    const { resolveAiConfig } = await load()
    await expect(resolveAiConfig({ provider: 'mistral' })).rejects.toThrow('exit:1')
  })

  it('clé manquante pour le provider demandé : sortie en erreur', async () => {
    await seed({ provider: 'anthropic', model: 'm', anthropicKey: 'sk-ant-AAAAAAAAAAAA' })
    const { resolveAiConfig } = await load()
    await expect(resolveAiConfig({ provider: 'openai' })).rejects.toThrow('exit:1')
  })

  it('aucune config et aucun flag : sortie en erreur', async () => {
    const { resolveAiConfig } = await load()
    await expect(resolveAiConfig({})).rejects.toThrow('exit:1')
  })
})
