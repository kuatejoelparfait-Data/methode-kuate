import { describe, it, expect, beforeEach, vi } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'

describe('gestion des clés IA', () => {
  let home: string

  beforeEach(async () => {
    home = await fs.mkdtemp(path.join(os.tmpdir(), 'kuate-home-'))
    vi.resetModules()
    vi.spyOn(os, 'homedir').mockReturnValue(home)
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY
  })

  const load = () => import('./index.js')
  const file = () => path.join(home, '.kuate', 'global.json')

  it('writeGlobalAiConfig conserve la clé de l\'autre provider', async () => {
    const m = await load()
    await m.setProviderKey('anthropic', 'sk-ant-AAAAAAAAAAAA')
    await m.writeGlobalAiConfig({ provider: 'openai', model: 'gpt-4o', openaiKey: 'sk-OOOOOOOOOOOO' })
    const raw = await fs.readJson(file())
    expect(raw.anthropicKey).toBe('sk-ant-AAAAAAAAAAAA')
    expect(raw.openaiKey).toBe('sk-OOOOOOOOOOOO')
  })

  it('setActiveProvider ne touche pas aux clés', async () => {
    const m = await load()
    await m.setProviderKey('anthropic', 'sk-ant-AAAAAAAAAAAA')
    await m.setActiveProvider('openai', 'gpt-4o')
    const raw = await fs.readJson(file())
    expect(raw.provider).toBe('openai')
    expect(raw.anthropicKey).toBe('sk-ant-AAAAAAAAAAAA')
  })

  it('la clé du fichier est prioritaire sur la variable d\'environnement', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-OLDOLDOLD00'
    const m = await load()
    await m.setProviderKey('anthropic', 'sk-ant-NEWNEWNEW00')
    await m.readGlobalAiConfig()
    expect(m.getEffectiveApiKey('anthropic')).toBe('sk-ant-NEWNEWNEW00')
    expect(await m.getKeySource('anthropic')).toBe('file')
  })

  it('modifier une clé existante la remplace', async () => {
    const m = await load()
    await m.setProviderKey('openai', 'sk-first0000000')
    await m.setProviderKey('openai', 'sk-second000000')
    expect((await fs.readJson(file())).openaiKey).toBe('sk-second000000')
  })

  it('removeProviderKey supprime du fichier et restaure l\'env réelle', async () => {
    process.env.OPENAI_API_KEY = 'sk-realenv000000'
    const m = await load()
    await m.setProviderKey('openai', 'sk-file00000000')
    await m.removeProviderKey('openai')
    expect((await fs.readJson(file())).openaiKey).toBeUndefined()
    expect(m.getEffectiveApiKey('openai')).toBe('sk-realenv000000')
    expect(await m.getKeySource('openai')).toBe('env')
  })

  it('maskKey et validateKeyFormat', async () => {
    const m = await load()
    expect(m.maskKey('sk-ant-api03-abcdefghijklmnop')).toBe('sk-ant-…mnop')
    expect(m.validateKeyFormat('anthropic', 'sk-xxx')).toMatch(/sk-ant-/)
    expect(m.validateKeyFormat('openai', 'sk-abc')).toBeUndefined()
    expect(m.validateKeyFormat('openai', '  ')).toMatch(/vide/)
  })
})
