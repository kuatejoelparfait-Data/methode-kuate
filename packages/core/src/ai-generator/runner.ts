import path from 'node:path'
import fs from 'fs-extra'
import type { AiConfig } from './index.js'

export interface RunAgentOptions {
  agentId: string
  task: string
  cwd: string
  aiConfig: AiConfig
  onChunk?: (chunk: string) => void
}

export interface RunAgentResult {
  content: string
  agentId: string
  task: string
}

export interface DetectedFile {
  filename: string
  content: string
  language: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(agentPrompt: string, memoryContext: string): string {
  return `${agentPrompt}

---

## Contexte projet actuel (Méthode KUATE)

${memoryContext}

---

## Instructions de réponse

- Réponds directement en expert, sans préambule.
- Pour tout code généré, utilise des blocs markdown avec le chemin du fichier en commentaire :
  \`\`\`typescript
  // src/auth/middleware.ts
  ...le code...
  \`\`\`
- Si tu génères plusieurs fichiers, utilise un bloc séparé pour chacun.
- Après le code, donne un résumé des étapes à faire pour intégrer.`
}

async function loadAgentPrompt(cwd: string, agentId: string): Promise<string> {
  const agentPath = path.join(cwd, '.kuate', 'agents', `${agentId}.md`)
  if (!fs.existsSync(agentPath)) {
    throw new Error(`Agent "${agentId}" introuvable dans .kuate/agents/. Lancez kuate init d'abord.`)
  }
  return fs.readFile(agentPath, 'utf-8')
}

async function loadMemoryContext(cwd: string): Promise<string> {
  const contextDir = path.join(cwd, '.kuate', 'context')
  const sections = ['memory', 'architecture', 'business', 'constraints', 'glossary']
  const lines: string[] = []

  for (const sec of sections) {
    const filePath = path.join(contextDir, `${sec}.md`)
    if (!fs.existsSync(filePath)) continue
    const content = (await fs.readFile(filePath, 'utf-8')).trim()
    if (!content) continue
    const preview = content.split('\n').slice(0, 8).join('\n')
    lines.push(`### ${sec.toUpperCase()}\n${preview}`)
  }

  return lines.length > 0 ? lines.join('\n\n') : '*(mémoire vide — lancez kuate memory seed)*'
}

// ── SSE streaming parsers ─────────────────────────────────────────────────────

async function streamAnthropic(
  apiKey: string,
  model: string,
  system: string,
  userMessage: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream: true,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API ${response.status}: ${err.slice(0, 300)}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data) as {
          type: string
          delta?: { type: string; text?: string }
        }
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          const chunk = parsed.delta.text ?? ''
          fullContent += chunk
          onChunk(chunk)
        }
      } catch {
        // Ignore parse errors on non-JSON SSE lines
      }
    }
  }

  return fullContent
}

async function streamOpenAI(
  apiKey: string,
  model: string,
  system: string,
  userMessage: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI API ${response.status}: ${err.slice(0, 300)}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>
        }
        const chunk = parsed.choices?.[0]?.delta?.content ?? ''
        if (chunk) {
          fullContent += chunk
          onChunk(chunk)
        }
      } catch {
        // Ignore non-JSON SSE lines
      }
    }
  }

  return fullContent
}

// ── File detection ────────────────────────────────────────────────────────────

export function detectFilesInOutput(content: string): DetectedFile[] {
  const files: DetectedFile[] = []
  // Match ```lang\n// path/to/file.ext\n...code...\n```
  const codeBlockRegex = /```(\w+)?\n(?:\/\/|#)\s*([\w/./-]+\.\w+)\n([\s\S]*?)```/g
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] ?? 'text'
    const filename = match[2].trim()
    const code = match[3].trim()
    if (filename && code) {
      files.push({ filename, content: code, language })
    }
  }

  return files
}

// ── Main runner ───────────────────────────────────────────────────────────────

export async function runAgent(options: RunAgentOptions): Promise<RunAgentResult> {
  const { agentId, task, cwd, aiConfig, onChunk } = options

  const [agentPrompt, memoryContext] = await Promise.all([
    loadAgentPrompt(cwd, agentId),
    loadMemoryContext(cwd),
  ])

  const system = buildSystemPrompt(agentPrompt, memoryContext)
  const onChunkSafe = onChunk ?? (() => undefined)

  const apiKey = aiConfig.provider === 'anthropic'
    ? (aiConfig.anthropicKey ?? process.env.ANTHROPIC_API_KEY ?? '')
    : (aiConfig.openaiKey ?? process.env.OPENAI_API_KEY ?? '')

  if (!apiKey) {
    throw new Error(`Clé API manquante pour ${aiConfig.provider}. Lancez kuate config ai.`)
  }

  let content: string
  if (aiConfig.provider === 'anthropic') {
    content = await streamAnthropic(apiKey, aiConfig.model, system, task, onChunkSafe)
  } else {
    content = await streamOpenAI(apiKey, aiConfig.model, system, task, onChunkSafe)
  }

  return { content, agentId, task }
}
