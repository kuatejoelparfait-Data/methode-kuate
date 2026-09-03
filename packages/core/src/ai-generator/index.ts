import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'

export type AiProvider = 'anthropic' | 'openai'

export interface AiConfig {
  provider: AiProvider
  model: string
  anthropicKey?: string
  openaiKey?: string
}

export interface ProjectContext {
  project: string
  method: string
  domains: string[]
  lang: string
}

export interface GeneratedContext {
  memory: string
  architecture: string
  business: string
  constraints: string
  glossary: string
}

const GLOBAL_CONFIG_PATH = path.join(os.homedir(), '.kuate', 'global.json')

export function detectAvailableProvider(): AiProvider | null {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.OPENAI_API_KEY) return 'openai'
  return null
}

export async function readGlobalAiConfig(): Promise<AiConfig | null> {
  if (!fs.existsSync(GLOBAL_CONFIG_PATH)) return null
  try {
    const raw = await fs.readFile(GLOBAL_CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AiConfig>
    if (!parsed.provider || !parsed.model) return null
    // Inject stored key into env if not already set
    if (parsed.anthropicKey && !process.env.ANTHROPIC_API_KEY) {
      process.env.ANTHROPIC_API_KEY = parsed.anthropicKey
    }
    if (parsed.openaiKey && !process.env.OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = parsed.openaiKey
    }
    return parsed as AiConfig
  } catch {
    return null
  }
}

export function getEffectiveApiKey(provider: AiProvider): string | null {
  if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY ?? null
  if (provider === 'openai') return process.env.OPENAI_API_KEY ?? null
  return null
}

export async function writeGlobalAiConfig(config: AiConfig): Promise<void> {
  await fs.ensureDir(path.dirname(GLOBAL_CONFIG_PATH))
  await fs.writeFile(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export const DEFAULT_MODELS: Record<AiProvider, string[]> = {
  anthropic: ['claude-haiku-4-5-20251001', 'claude-sonnet-5', 'claude-opus-5'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
}

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: 'Claude (Anthropic)',
  openai: 'GPT (OpenAI)',
}

function buildPrompt(ctx: ProjectContext): string {
  const langInstruction = ctx.lang === 'fr'
    ? 'Réponds en français.'
    : 'Reply in English.'

  return `You are an expert in project management and software architecture.
Generate initial context for a project named "${ctx.project}" using the ${ctx.method} methodology, in the domains: ${ctx.domains.join(', ')}.
${langInstruction}

Generate structured markdown content for each of these 5 sections:

1. ARCHITECTURE - Likely tech stack, rationale, technical constraints
2. BUSINESS - Likely objective, typical client context, stakeholders
3. CONSTRAINTS - Typical regulatory constraints, indicative budget/timeline, classic out-of-scope items
4. GLOSSARY - 3-5 typical business terms for this type of project with definitions
5. MEMORY - First decision: choice of ${ctx.method} methodology and its justification

CRITICAL: Reply ONLY with valid JSON (no markdown code fence, no extra text):
{
  "architecture": "markdown content here",
  "business": "markdown content here",
  "constraints": "markdown content here",
  "glossary": "markdown content here",
  "memory": "markdown content here"
}`
}

async function callAnthropic(prompt: string, model: string): Promise<GeneratedContext> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non définie')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API ${response.status}: ${err.slice(0, 200)}`)
  }

  const data = await response.json() as { content: Array<{ text: string }> }
  const text = (data.content[0]?.text ?? '').trim()

  try {
    return JSON.parse(text) as GeneratedContext
  } catch {
    // Try to extract JSON from response if model added extra text
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as GeneratedContext
    throw new Error('Réponse IA non parseable en JSON')
  }
}

async function callOpenAI(prompt: string, model: string): Promise<GeneratedContext> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY non définie')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI API ${response.status}: ${err.slice(0, 200)}`)
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> }
  const text = (data.choices[0]?.message?.content ?? '').trim()

  try {
    return JSON.parse(text) as GeneratedContext
  } catch {
    throw new Error('Réponse IA non parseable en JSON')
  }
}

export async function generateContextWithAI(
  ctx: ProjectContext,
  aiConfig: AiConfig,
): Promise<GeneratedContext> {
  const prompt = buildPrompt(ctx)
  if (aiConfig.provider === 'anthropic') {
    return callAnthropic(prompt, aiConfig.model)
  }
  return callOpenAI(prompt, aiConfig.model)
}

// ── Agent selection from project description / CDC ───────────────────────────

export interface AgentSelectionInput {
  id: string
  name: string
  domain: string
  phase: string
  description: string
}

export interface AgentSelectionResult {
  agentIds: string[]
  reasoning: string
}

function buildAgentSelectionPrompt(
  projectDescription: string,
  agents: AgentSelectionInput[],
  lang: string,
): string {
  const langInstruction = lang === 'fr' ? 'Réponds en français.' : 'Reply in English.'
  const agentList = agents.map(a =>
    `- ${a.id} [phase:${a.phase}, domaine:${a.domain}]: ${a.description}`
  ).join('\n')

  return `Tu es un expert en gestion de projet et orchestration d'équipes IA.
${langInstruction}

Analyse la description ou le cahier des charges ci-dessous et sélectionne les agents les plus pertinents parmi la liste disponible.

## Description / Cahier des charges

${projectDescription}

## Agents disponibles

${agentList}

## Instructions

- Sélectionne entre 5 et 15 agents maximum selon la complexité réelle du projet.
- Priorise les agents directement utiles aux phases que ce projet va traverser.
- Inclus au minimum 1 agent par phase KUATE impliquée (K, U, A, T, E).
- Explique brièvement pourquoi ces agents (2-3 phrases max).

Réponds UNIQUEMENT avec ce JSON valide (sans markdown fence) :
{
  "agentIds": ["id1", "id2", ...],
  "reasoning": "explication courte du choix"
}`
}

async function callJsonAnthropic(prompt: string, model: string, apiKey: string): Promise<unknown> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API ${response.status}: ${err.slice(0, 200)}`)
  }
  const data = await response.json() as { content: Array<{ text: string }> }
  const text = (data.content[0]?.text ?? '').trim()
  const match = text.match(/\{[\s\S]*\}/)
  return JSON.parse(match ? match[0] : text)
}

async function callJsonOpenAI(prompt: string, model: string, apiKey: string): Promise<unknown> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI API ${response.status}: ${err.slice(0, 200)}`)
  }
  const data = await response.json() as { choices: Array<{ message: { content: string } }> }
  return JSON.parse(data.choices[0]?.message?.content ?? '{}')
}

export async function analyzeAndSelectAgents(
  projectDescription: string,
  agents: AgentSelectionInput[],
  aiConfig: AiConfig,
  lang = 'fr',
): Promise<AgentSelectionResult> {
  const apiKey = aiConfig.provider === 'anthropic'
    ? (aiConfig.anthropicKey ?? process.env.ANTHROPIC_API_KEY ?? '')
    : (aiConfig.openaiKey ?? process.env.OPENAI_API_KEY ?? '')

  if (!apiKey) throw new Error(`Clé API manquante pour ${aiConfig.provider}`)

  const prompt = buildAgentSelectionPrompt(projectDescription, agents, lang)

  const raw = aiConfig.provider === 'anthropic'
    ? await callJsonAnthropic(prompt, aiConfig.model, apiKey)
    : await callJsonOpenAI(prompt, aiConfig.model, apiKey)

  const result = raw as { agentIds?: string[]; reasoning?: string }

  // Validate — keep only valid agent IDs
  const validIds = new Set(agents.map(a => a.id))
  const agentIds = (result.agentIds ?? []).filter(id => validIds.has(id))
  const reasoning = result.reasoning ?? ''

  if (agentIds.length === 0) throw new Error('Aucun agent valide retourné par l\'IA')

  return { agentIds, reasoning }
}
