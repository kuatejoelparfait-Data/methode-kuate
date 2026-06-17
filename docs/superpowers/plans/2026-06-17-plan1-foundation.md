# Méthode KUATE — Plan 1 : Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le monorepo complet avec CLI fonctionnelle : `kuate init`, `kuate agent list`, `kuate agent use`, `kuate config` — publiable sur npm avec `npx methode-kuate init`.

**Architecture:** Monorepo npm workspaces avec deux packages principaux : `packages/core` (moteur sans UI, testable) et `packages/cli` (interface terminal, Commander.js). Les agents sont des templates Handlebars dans `packages/agents-dev/`. Le moteur charge les méthodologies depuis des fichiers YAML et injecte le contexte dans les templates.

**Tech Stack:** Node.js 20+ · TypeScript 5 · tsup · vitest · commander · @clack/prompts · handlebars · yaml · zod · chalk · ora · clipboardy

---

## Structure des fichiers

```
methode-kuate/
├── package.json                          ← workspaces root
├── tsconfig.base.json                    ← config TS partagée
├── .nvmrc                                ← "20.12.0"
├── .gitignore
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                  ← exports publics
│   │       ├── types.ts                  ← types partagés
│   │       ├── config-manager/
│   │       │   ├── index.ts              ← read/write .kuate/config.yaml
│   │       │   └── schema.ts             ← validation Zod
│   │       ├── methodology-engine/
│   │       │   ├── index.ts              ← charge + adapte méthodologie
│   │       │   └── loader.ts             ← charge les YAML de méthodologie
│   │       └── agent-generator/
│   │           ├── index.ts              ← génère prompts depuis templates
│   │           └── renderer.ts           ← Handlebars rendering
│   ├── cli/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                  ← entry point (bin: kuate)
│   │       ├── commands/
│   │       │   ├── init.ts               ← kuate init
│   │       │   ├── agent.ts              ← kuate agent list|use|info
│   │       │   └── config.ts             ← kuate config show|set
│   │       ├── i18n/
│   │       │   ├── index.ts              ← t() function
│   │       │   ├── fr.json               ← strings FR
│   │       │   └── en.json               ← strings EN
│   │       └── utils/
│   │           └── lang.ts               ← détection langue OS
│   └── agents-dev/
│       ├── package.json
│       ├── src/
│       │   └── index.ts                  ← exports: AGENTS_DEV[]
│       └── templates/
│           ├── architecte-solution.hbs
│           ├── dev-senior.hbs
│           ├── expert-devops.hbs
│           ├── expert-securite.hbs
│           ├── qa-strategist.hbs
│           ├── tech-lead.hbs
│           ├── expert-performance.hbs
│           └── expert-ia-ml.hbs
└── templates/
    └── methodology/
        ├── agile.yaml
        ├── lean.yaml
        ├── pmbok.yaml
        └── design-thinking.yaml
```

---

## Task 1 : Scaffold monorepo

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.nvmrc`
- Create: `.gitignore`

- [ ] **Step 1 : Créer le dossier racine et initialiser git**

```bash
cd "C:\Users\axiat\Desktop\Méthode KUATE"
git init
```

- [ ] **Step 2 : Créer `package.json` racine**

```json
{
  "name": "methode-kuate-root",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint packages/*/src/**/*.ts",
    "clean": "rimraf packages/*/dist"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0",
    "tsup": "^8.0.0",
    "vitest": "^1.6.0",
    "eslint": "^9.0.0",
    "rimraf": "^5.0.0"
  },
  "engines": {
    "node": ">=20.12.0"
  }
}
```

- [ ] **Step 3 : Créer `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist"
  }
}
```

- [ ] **Step 4 : Créer `.nvmrc`**

```
20.12.0
```

- [ ] **Step 5 : Créer `.gitignore`**

```
node_modules/
dist/
*.tgz
.env
.kuate/
```

- [ ] **Step 6 : Installer les dépendances racine**

```bash
npm install
```

- [ ] **Step 7 : Commit**

```bash
git add .
git commit -m "chore: init monorepo structure"
```

---

## Task 2 : Package `core` — types et config schema

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/types.ts`
- Create: `packages/core/src/config-manager/schema.ts`
- Test: `packages/core/src/config-manager/schema.test.ts`

- [ ] **Step 1 : Créer `packages/core/package.json`**

```json
{
  "name": "@methode-kuate/core",
  "version": "1.0.0",
  "description": "Moteur central de la Méthode KUATE",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "dev": "tsup src/index.ts --format esm --dts --watch"
  },
  "dependencies": {
    "yaml": "^2.4.0",
    "zod": "^3.23.0",
    "handlebars": "^4.7.0",
    "fs-extra": "^11.2.0"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.0",
    "@types/handlebars": "^4.1.0"
  }
}
```

- [ ] **Step 2 : Créer `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3 : Créer `packages/core/src/types.ts`**

```typescript
export type Lang = 'fr' | 'en'

export type MethodologyId =
  | 'agile'
  | 'lean'
  | 'pmbok'
  | 'safe'
  | 'okr'
  | 'design-thinking'
  | 'custom'

export type DomainId = 'dev' | 'business' | 'content' | 'education'

export type Phase = 'K' | 'U' | 'A' | 'T' | 'E'

export interface KuateConfig {
  project: string
  lang: Lang
  method: MethodologyId
  domains: DomainId[]
  version: string
  agents: string[]
}

export interface AgentDefinition {
  id: string
  name: string
  nameFr: string
  domain: DomainId
  phase: Phase
  templateFile: string
  description: string
  descriptionFr: string
}

export interface MethodologyDefinition {
  id: MethodologyId
  name: string
  nameFr: string
  agentIds: string[]
  workflowIds: string[]
  vocabulary: {
    en: Record<string, string>
    fr: Record<string, string>
  }
}

export interface GeneratedAgent {
  id: string
  prompt: string
  lang: Lang
}
```

- [ ] **Step 4 : Créer `packages/core/src/config-manager/schema.ts`**

```typescript
import { z } from 'zod'

export const KuateConfigSchema = z.object({
  project: z.string().min(1),
  lang: z.enum(['fr', 'en']),
  method: z.enum(['agile', 'lean', 'pmbok', 'safe', 'okr', 'design-thinking', 'custom']),
  domains: z.array(z.enum(['dev', 'business', 'content', 'education'])).min(1),
  version: z.string(),
  agents: z.array(z.string()),
})

export type KuateConfigInput = z.input<typeof KuateConfigSchema>
```

- [ ] **Step 5 : Écrire le test (schema validation)**

```typescript
// packages/core/src/config-manager/schema.test.ts
import { describe, it, expect } from 'vitest'
import { KuateConfigSchema } from './schema.js'

describe('KuateConfigSchema', () => {
  it('valide une config correcte', () => {
    const result = KuateConfigSchema.safeParse({
      project: 'MonAppli',
      lang: 'fr',
      method: 'agile',
      domains: ['dev'],
      version: '1.0.0',
      agents: ['architecte-solution'],
    })
    expect(result.success).toBe(true)
  })

  it('rejette une langue invalide', () => {
    const result = KuateConfigSchema.safeParse({
      project: 'MonAppli',
      lang: 'de',
      method: 'agile',
      domains: ['dev'],
      version: '1.0.0',
      agents: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejette domains vide', () => {
    const result = KuateConfigSchema.safeParse({
      project: 'MonAppli',
      lang: 'fr',
      method: 'agile',
      domains: [],
      version: '1.0.0',
      agents: [],
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 6 : Lancer le test — doit ÉCHOUER (schema pas encore exporté depuis index)**

```bash
npx vitest run packages/core/src/config-manager/schema.test.ts
```

Résultat attendu : PASS (le schema est déjà défini dans le même fichier)

- [ ] **Step 7 : Commit**

```bash
git add packages/core/
git commit -m "feat(core): add types and config schema"
```

---

## Task 3 : Package `core` — Config Manager (read/write)

**Files:**
- Create: `packages/core/src/config-manager/index.ts`
- Test: `packages/core/src/config-manager/index.test.ts`

- [ ] **Step 1 : Créer `packages/core/src/config-manager/index.ts`**

```typescript
import path from 'node:path'
import fs from 'fs-extra'
import { parse, stringify } from 'yaml'
import { KuateConfigSchema } from './schema.js'
import type { KuateConfig } from '../types.js'

const KUATE_DIR = '.kuate'
const CONFIG_FILE = 'config.yaml'

export function getKuateDir(cwd: string): string {
  return path.join(cwd, KUATE_DIR)
}

export function getConfigPath(cwd: string): string {
  return path.join(getKuateDir(cwd), CONFIG_FILE)
}

export function isKuateProject(cwd: string): boolean {
  return fs.existsSync(getConfigPath(cwd))
}

export async function readConfig(cwd: string): Promise<KuateConfig> {
  const configPath = getConfigPath(cwd)
  if (!fs.existsSync(configPath)) {
    throw new Error(`Aucun projet KUATE trouvé dans ${cwd}. Lancez kuate init.`)
  }
  const raw = await fs.readFile(configPath, 'utf-8')
  const parsed = parse(raw)
  return KuateConfigSchema.parse(parsed)
}

export async function writeConfig(cwd: string, config: KuateConfig): Promise<void> {
  const kuateDir = getKuateDir(cwd)
  await fs.ensureDir(kuateDir)
  const configPath = getConfigPath(cwd)
  await fs.writeFile(configPath, stringify(config), 'utf-8')
}

export async function initKuateStructure(cwd: string, config: KuateConfig): Promise<void> {
  const kuateDir = getKuateDir(cwd)
  await fs.ensureDir(path.join(kuateDir, 'agents'))
  await fs.ensureDir(path.join(kuateDir, 'workflows'))
  await fs.ensureDir(path.join(kuateDir, 'context'))

  const contextFiles = ['memory.md', 'architecture.md', 'business.md', 'constraints.md', 'glossary.md']
  for (const file of contextFiles) {
    const filePath = path.join(kuateDir, 'context', file)
    if (!fs.existsSync(filePath)) {
      await fs.writeFile(filePath, `# ${file.replace('.md', '')}\n\n`, 'utf-8')
    }
  }

  await writeConfig(cwd, config)
}
```

- [ ] **Step 2 : Écrire le test**

```typescript
// packages/core/src/config-manager/index.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import fs from 'fs-extra'
import {
  readConfig,
  writeConfig,
  initKuateStructure,
  isKuateProject,
  getKuateDir,
} from './index.js'
import type { KuateConfig } from '../types.js'

const sampleConfig: KuateConfig = {
  project: 'TestProjet',
  lang: 'fr',
  method: 'agile',
  domains: ['dev'],
  version: '1.0.0',
  agents: ['architecte-solution', 'dev-senior'],
}

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kuate-test-'))
})

afterEach(async () => {
  await fs.remove(tmpDir)
})

describe('isKuateProject', () => {
  it('retourne false si .kuate/config.yaml absent', () => {
    expect(isKuateProject(tmpDir)).toBe(false)
  })

  it('retourne true après initKuateStructure', async () => {
    await initKuateStructure(tmpDir, sampleConfig)
    expect(isKuateProject(tmpDir)).toBe(true)
  })
})

describe('writeConfig / readConfig', () => {
  it('écrit et relit une config identique', async () => {
    await fs.ensureDir(getKuateDir(tmpDir))
    await writeConfig(tmpDir, sampleConfig)
    const result = await readConfig(tmpDir)
    expect(result).toEqual(sampleConfig)
  })
})

describe('initKuateStructure', () => {
  it('crée tous les dossiers et fichiers de contexte', async () => {
    await initKuateStructure(tmpDir, sampleConfig)
    expect(fs.existsSync(path.join(tmpDir, '.kuate', 'agents'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, '.kuate', 'context', 'memory.md'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, '.kuate', 'context', 'architecture.md'))).toBe(true)
  })
})
```

- [ ] **Step 3 : Lancer le test — doit ÉCHOUER**

```bash
npx vitest run packages/core/src/config-manager/index.test.ts
```

Résultat attendu : erreur `Cannot find module`

- [ ] **Step 4 : Installer les dépendances de `core`**

```bash
cd packages/core && npm install && cd ../..
```

- [ ] **Step 5 : Lancer le test — doit PASSER**

```bash
npx vitest run packages/core/src/config-manager/index.test.ts
```

Résultat attendu : 5 tests PASS

- [ ] **Step 6 : Commit**

```bash
git add packages/core/src/config-manager/
git commit -m "feat(core): add config manager with read/write/init"
```

---

## Task 4 : Package `core` — Agent Generator (Handlebars renderer)

**Files:**
- Create: `packages/core/src/agent-generator/renderer.ts`
- Create: `packages/core/src/agent-generator/index.ts`
- Test: `packages/core/src/agent-generator/renderer.test.ts`

- [ ] **Step 1 : Créer `packages/core/src/agent-generator/renderer.ts`**

```typescript
import Handlebars from 'handlebars'
import type { Lang, MethodologyDefinition } from '../types.js'

export interface AgentTemplateContext {
  agentName: string
  agentNameFr: string
  projectName: string
  lang: Lang
  methodology: MethodologyDefinition
  phase: string
  description: string
  descriptionFr: string
}

export function renderAgentTemplate(
  templateSource: string,
  context: AgentTemplateContext
): string {
  const template = Handlebars.compile(templateSource, { noEscape: true })

  const methodologyName =
    context.lang === 'fr'
      ? context.methodology.nameFr
      : context.methodology.name

  const vocabulary =
    context.lang === 'fr'
      ? context.methodology.vocabulary.fr
      : context.methodology.vocabulary.en

  return template({
    ...context,
    methodologyName,
    vocabulary,
    isAgile: context.methodology.id === 'agile',
    isPmbok: context.methodology.id === 'pmbok',
    isLean: context.methodology.id === 'lean',
    isDesignThinking: context.methodology.id === 'design-thinking',
  })
}
```

- [ ] **Step 2 : Créer `packages/core/src/agent-generator/index.ts`**

```typescript
import path from 'node:path'
import fs from 'fs-extra'
import { renderAgentTemplate } from './renderer.js'
import type { AgentDefinition, GeneratedAgent, KuateConfig, MethodologyDefinition, Lang } from '../types.js'

export interface GenerateOptions {
  agent: AgentDefinition
  config: KuateConfig
  methodology: MethodologyDefinition
  templatesDir: string
  outputDir: string
}

export async function generateAgent(options: GenerateOptions): Promise<GeneratedAgent> {
  const { agent, config, methodology, templatesDir } = options
  const templatePath = path.join(templatesDir, agent.templateFile)

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template introuvable : ${templatePath}`)
  }

  const templateSource = await fs.readFile(templatePath, 'utf-8')
  const prompt = renderAgentTemplate(templateSource, {
    agentName: agent.name,
    agentNameFr: agent.nameFr,
    projectName: config.project,
    lang: config.lang as Lang,
    methodology,
    phase: agent.phase,
    description: agent.description,
    descriptionFr: agent.descriptionFr,
  })

  return { id: agent.id, prompt, lang: config.lang as Lang }
}

export async function generateAndSaveAgent(
  options: GenerateOptions
): Promise<GeneratedAgent> {
  const generated = await generateAgent(options)
  const outputPath = path.join(options.outputDir, `${generated.id}.md`)
  await fs.ensureDir(options.outputDir)
  await fs.writeFile(outputPath, generated.prompt, 'utf-8')
  return generated
}
```

- [ ] **Step 3 : Écrire le test**

```typescript
// packages/core/src/agent-generator/renderer.test.ts
import { describe, it, expect } from 'vitest'
import { renderAgentTemplate } from './renderer.js'
import type { MethodologyDefinition } from '../types.js'

const agileMethodology: MethodologyDefinition = {
  id: 'agile',
  name: 'Agile/Scrum',
  nameFr: 'Agile/Scrum',
  agentIds: ['architecte-solution'],
  workflowIds: ['sprint-planning'],
  vocabulary: {
    en: { iteration: 'sprint', deliverable: 'story' },
    fr: { iteration: 'sprint', deliverable: 'story' },
  },
}

describe('renderAgentTemplate', () => {
  it('injecte le nom du projet dans le template', () => {
    const template = 'Projet: {{projectName}}'
    const result = renderAgentTemplate(template, {
      agentName: 'Solution Architect',
      agentNameFr: 'Architecte Solution',
      projectName: 'MonAppli',
      lang: 'fr',
      methodology: agileMethodology,
      phase: 'A',
      description: 'Designs systems',
      descriptionFr: 'Conçoit les systèmes',
    })
    expect(result).toBe('Projet: MonAppli')
  })

  it('injecte le nom de méthodologie en français', () => {
    const template = 'Méthode: {{methodologyName}}'
    const result = renderAgentTemplate(template, {
      agentName: 'Solution Architect',
      agentNameFr: 'Architecte Solution',
      projectName: 'MonAppli',
      lang: 'fr',
      methodology: agileMethodology,
      phase: 'A',
      description: 'Designs systems',
      descriptionFr: 'Conçoit les systèmes',
    })
    expect(result).toBe('Méthode: Agile/Scrum')
  })

  it('expose isAgile=true pour méthodologie agile', () => {
    const template = '{{#if isAgile}}oui{{else}}non{{/if}}'
    const result = renderAgentTemplate(template, {
      agentName: 'x',
      agentNameFr: 'x',
      projectName: 'p',
      lang: 'fr',
      methodology: agileMethodology,
      phase: 'A',
      description: 'd',
      descriptionFr: 'd',
    })
    expect(result).toBe('oui')
  })
})
```

- [ ] **Step 4 : Lancer le test — doit ÉCHOUER**

```bash
npx vitest run packages/core/src/agent-generator/renderer.test.ts
```

- [ ] **Step 5 : Lancer les tests — doit PASSER**

```bash
npx vitest run packages/core/src/agent-generator/
```

Résultat attendu : 3 tests PASS

- [ ] **Step 6 : Commit**

```bash
git add packages/core/src/agent-generator/
git commit -m "feat(core): add Handlebars agent generator"
```

---

## Task 5 : Package `core` — Methodology Engine

**Files:**
- Create: `packages/core/src/methodology-engine/loader.ts`
- Create: `packages/core/src/methodology-engine/index.ts`
- Create: `templates/methodology/agile.yaml`
- Create: `templates/methodology/lean.yaml`
- Create: `templates/methodology/pmbok.yaml`
- Create: `templates/methodology/design-thinking.yaml`
- Test: `packages/core/src/methodology-engine/loader.test.ts`

- [ ] **Step 1 : Créer `templates/methodology/agile.yaml`**

```yaml
id: agile
name: Agile/Scrum
nameFr: Agile/Scrum
agentIds:
  - architecte-solution
  - dev-senior
  - expert-devops
  - expert-securite
  - qa-strategist
  - tech-lead
workflowIds:
  - sprint-planning
  - backlog-grooming
  - retrospective
  - sprint-review
  - definition-of-done
vocabulary:
  en:
    iteration: sprint
    deliverable: user story
    planning: sprint planning
    review: sprint review
    team_meeting: daily standup
    task_unit: story point
  fr:
    iteration: sprint
    deliverable: user story
    planning: planification de sprint
    review: revue de sprint
    team_meeting: mêlée quotidienne
    task_unit: point de story
```

- [ ] **Step 2 : Créer `templates/methodology/pmbok.yaml`**

```yaml
id: pmbok
name: PMBOK
nameFr: PMBOK (Gestion de Projet)
agentIds:
  - architecte-solution
  - expert-securite
  - qa-strategist
  - tech-lead
workflowIds:
  - charte-projet
  - wbs
  - analyse-risques
  - matrice-raci
  - rapport-avancement
vocabulary:
  en:
    iteration: phase
    deliverable: deliverable
    planning: project planning
    review: project review
    team_meeting: status meeting
    task_unit: work package
  fr:
    iteration: phase
    deliverable: livrable
    planning: planification de projet
    review: revue de projet
    team_meeting: réunion de suivi
    task_unit: lot de travail
```

- [ ] **Step 3 : Créer `templates/methodology/lean.yaml`**

```yaml
id: lean
name: Lean
nameFr: Lean
agentIds:
  - architecte-solution
  - dev-senior
  - expert-performance
  - qa-strategist
workflowIds:
  - value-stream-mapping
  - kaizen
  - 5s-digital
vocabulary:
  en:
    iteration: cycle
    deliverable: value increment
    planning: value stream planning
    review: improvement review
    team_meeting: kaizen meeting
    task_unit: value unit
  fr:
    iteration: cycle
    deliverable: incrément de valeur
    planning: planification de flux
    review: revue d'amélioration
    team_meeting: réunion kaizen
    task_unit: unité de valeur
```

- [ ] **Step 4 : Créer `templates/methodology/design-thinking.yaml`**

```yaml
id: design-thinking
name: Design Thinking
nameFr: Design Thinking
agentIds:
  - architecte-solution
  - dev-senior
  - qa-strategist
workflowIds:
  - empathise
  - define
  - ideate
  - prototype
  - test-utilisateur
vocabulary:
  en:
    iteration: design cycle
    deliverable: prototype
    planning: ideation session
    review: user testing
    team_meeting: design sprint
    task_unit: design artifact
  fr:
    iteration: cycle de design
    deliverable: prototype
    planning: session d'idéation
    review: test utilisateur
    team_meeting: design sprint
    task_unit: artefact de design
```

- [ ] **Step 5 : Créer `packages/core/src/methodology-engine/loader.ts`**

```typescript
import path from 'node:path'
import fs from 'fs-extra'
import { parse } from 'yaml'
import type { MethodologyDefinition, MethodologyId } from '../types.js'

export async function loadMethodology(
  methodologyId: MethodologyId,
  templatesDir: string
): Promise<MethodologyDefinition> {
  const filePath = path.join(templatesDir, 'methodology', `${methodologyId}.yaml`)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Méthodologie "${methodologyId}" non trouvée dans ${templatesDir}`)
  }

  const raw = await fs.readFile(filePath, 'utf-8')
  return parse(raw) as MethodologyDefinition
}
```

- [ ] **Step 6 : Créer `packages/core/src/methodology-engine/index.ts`**

```typescript
export { loadMethodology } from './loader.js'

import type { AgentDefinition, MethodologyDefinition, DomainId } from '../types.js'

export function filterAgentsForMethodology(
  agents: AgentDefinition[],
  methodology: MethodologyDefinition,
  domains: DomainId[]
): AgentDefinition[] {
  return agents.filter(
    (agent) =>
      domains.includes(agent.domain) &&
      methodology.agentIds.includes(agent.id)
  )
}
```

- [ ] **Step 7 : Écrire le test**

```typescript
// packages/core/src/methodology-engine/loader.test.ts
import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadMethodology } from './loader.js'
import { filterAgentsForMethodology } from './index.js'
import type { AgentDefinition } from '../types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = path.resolve(__dirname, '../../../../templates')

const mockAgents: AgentDefinition[] = [
  {
    id: 'architecte-solution',
    name: 'Solution Architect',
    nameFr: 'Architecte Solution',
    domain: 'dev',
    phase: 'A',
    templateFile: 'architecte-solution.hbs',
    description: 'Designs systems',
    descriptionFr: 'Conçoit les systèmes',
  },
  {
    id: 'coach-agile',
    name: 'Agile Coach',
    nameFr: 'Coach Agile',
    domain: 'business',
    phase: 'U',
    templateFile: 'coach-agile.hbs',
    description: 'Coaches agile',
    descriptionFr: 'Coach agile',
  },
]

describe('loadMethodology', () => {
  it('charge la méthodologie agile depuis le YAML', async () => {
    const method = await loadMethodology('agile', TEMPLATES_DIR)
    expect(method.id).toBe('agile')
    expect(method.name).toBe('Agile/Scrum')
    expect(method.vocabulary.fr.iteration).toBe('sprint')
  })

  it('charge la méthodologie pmbok', async () => {
    const method = await loadMethodology('pmbok', TEMPLATES_DIR)
    expect(method.id).toBe('pmbok')
    expect(method.vocabulary.fr.deliverable).toBe('livrable')
  })

  it('lance une erreur pour une méthodologie inconnue', async () => {
    await expect(
      loadMethodology('unknown' as any, TEMPLATES_DIR)
    ).rejects.toThrow()
  })
})

describe('filterAgentsForMethodology', () => {
  it('filtre par domaine et méthodologie', async () => {
    const method = await loadMethodology('agile', TEMPLATES_DIR)
    const filtered = filterAgentsForMethodology(mockAgents, method, ['dev'])
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('architecte-solution')
  })
})
```

- [ ] **Step 8 : Lancer les tests — doivent PASSER**

```bash
npx vitest run packages/core/src/methodology-engine/
```

Résultat attendu : 4 tests PASS

- [ ] **Step 9 : Créer `packages/core/src/index.ts`**

```typescript
export * from './types.js'
export * from './config-manager/index.js'
export * from './config-manager/schema.js'
export * from './agent-generator/index.js'
export * from './agent-generator/renderer.js'
export * from './methodology-engine/index.js'
```

- [ ] **Step 10 : Commit**

```bash
git add packages/core/ templates/
git commit -m "feat(core): add methodology engine with YAML loader"
```

---

## Task 6 : Package `agents-dev` — Définitions et templates

**Files:**
- Create: `packages/agents-dev/package.json`
- Create: `packages/agents-dev/src/index.ts`
- Create: `packages/agents-dev/templates/*.hbs` (8 fichiers)

- [ ] **Step 1 : Créer `packages/agents-dev/package.json`**

```json
{
  "name": "@methode-kuate/agents-dev",
  "version": "1.0.0",
  "description": "Agents Dev Software — Méthode KUATE",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./templates": "./templates"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean"
  },
  "dependencies": {
    "@methode-kuate/core": "*"
  }
}
```

- [ ] **Step 2 : Créer `packages/agents-dev/src/index.ts`**

```typescript
import type { AgentDefinition } from '@methode-kuate/core'

export const AGENTS_DEV: AgentDefinition[] = [
  {
    id: 'architecte-solution',
    name: 'Solution Architect',
    nameFr: 'Architecte Solution',
    domain: 'dev',
    phase: 'A',
    templateFile: 'architecte-solution.hbs',
    description: 'Designs scalable system architecture (TOGAF-aware)',
    descriptionFr: 'Conçoit une architecture système scalable (TOGAF)',
  },
  {
    id: 'dev-senior',
    name: 'Senior Developer',
    nameFr: 'Développeur Senior',
    domain: 'dev',
    phase: 'T',
    templateFile: 'dev-senior.hbs',
    description: 'Implements features with TDD and clean code',
    descriptionFr: 'Implémente avec TDD et clean code',
  },
  {
    id: 'expert-devops',
    name: 'DevOps Expert',
    nameFr: 'Expert DevOps',
    domain: 'dev',
    phase: 'T',
    templateFile: 'expert-devops.hbs',
    description: 'CI/CD, Docker, Kubernetes automation',
    descriptionFr: 'CI/CD, Docker, Kubernetes, automatisation',
  },
  {
    id: 'expert-securite',
    name: 'Security Expert',
    nameFr: 'Expert Sécurité',
    domain: 'dev',
    phase: 'A',
    templateFile: 'expert-securite.hbs',
    description: 'OWASP, threat modeling, security audit',
    descriptionFr: 'OWASP, threat modeling, audit de sécurité',
  },
  {
    id: 'qa-strategist',
    name: 'QA Strategist',
    nameFr: 'Stratège QA',
    domain: 'dev',
    phase: 'E',
    templateFile: 'qa-strategist.hbs',
    description: 'Risk-based testing and quality strategy',
    descriptionFr: 'Tests basés sur le risque et stratégie qualité',
  },
  {
    id: 'tech-lead',
    name: 'Tech Lead',
    nameFr: 'Tech Lead',
    domain: 'dev',
    phase: 'T',
    templateFile: 'tech-lead.hbs',
    description: 'Code review, technical mentoring, standards',
    descriptionFr: 'Revue de code, mentoring technique, standards',
  },
  {
    id: 'expert-performance',
    name: 'Performance Expert',
    nameFr: 'Expert Performance',
    domain: 'dev',
    phase: 'E',
    templateFile: 'expert-performance.hbs',
    description: 'Profiling, optimization, Core Web Vitals',
    descriptionFr: 'Profiling, optimisation, Core Web Vitals',
  },
  {
    id: 'expert-ia-ml',
    name: 'AI/ML Expert',
    nameFr: 'Expert IA/ML',
    domain: 'dev',
    phase: 'T',
    templateFile: 'expert-ia-ml.hbs',
    description: 'AI model integration and MLOps',
    descriptionFr: 'Intégration de modèles IA et MLOps',
  },
]
```

- [ ] **Step 3 : Créer `packages/agents-dev/templates/architecte-solution.hbs`**

```handlebars
# Architecte Solution — Méthode KUATE {{#if (eq lang "fr")}}({{agentNameFr}}){{else}}({{agentName}}){{/if}}

## Identité

{{#if (eq lang "fr")}}
Tu es l'**Architecte Solution** de la Méthode KUATE, expert en conception de systèmes complexes et scalables.
Tu interviens principalement en **Phase A — Architecturer** du cycle KUATE.
{{else}}
You are the **Solution Architect** of the Méthode KUATE framework, expert in designing complex and scalable systems.
You operate primarily in **Phase A — Architect** of the KUATE cycle.
{{/if}}

## Contexte Projet

{{#if (eq lang "fr")}}
- **Projet :** {{projectName}}
- **Méthodologie :** {{methodologyName}}
- **Vocabulaire :** {{vocabulary.iteration}} · {{vocabulary.deliverable}} · {{vocabulary.planning}}
{{else}}
- **Project:** {{projectName}}
- **Methodology:** {{methodologyName}}
- **Vocabulary:** {{vocabulary.iteration}} · {{vocabulary.deliverable}} · {{vocabulary.planning}}
{{/if}}

## Responsabilités

{{#if (eq lang "fr")}}
1. **Analyse des exigences** — Transformer les besoins métier en contraintes techniques
2. **Conception de l'architecture** — Définir les composants, leurs interfaces et leurs interactions
3. **Sélection technologique** — Choisir le stack adapté aux contraintes du projet
4. **Documentation technique** — Rédiger les ADR (Architecture Decision Records)
5. **Revue de sécurité** — Valider l'architecture contre les risques OWASP
{{#if isAgile}}
6. **Collaboration Agile** — Participer aux sessions de planification de {{vocabulary.iteration}}
{{/if}}
{{#if isPmbok}}
6. **Livraison formelle** — Produire les {{vocabulary.deliverable}}s selon le plan de {{vocabulary.planning}}
{{/if}}
{{else}}
1. **Requirements analysis** — Transform business needs into technical constraints
2. **Architecture design** — Define components, interfaces, and interactions
3. **Technology selection** — Choose the stack adapted to project constraints
4. **Technical documentation** — Write ADRs (Architecture Decision Records)
5. **Security review** — Validate architecture against OWASP risks
{{/if}}

## Principes Directeurs

{{#if (eq lang "fr")}}
- **SOLID** — Chaque composant a une responsabilité unique et claire
- **Separation of Concerns** — Les couches sont découplées et testables indépendamment
- **Fail Fast** — Les erreurs sont détectées le plus tôt possible dans le cycle
- **Évolutivité** — L'architecture peut évoluer sans refactorisation massive
- **Sécurité by design** — La sécurité est intégrée, pas ajoutée après coup
{{else}}
- **SOLID** — Each component has a single, clear responsibility
- **Separation of Concerns** — Layers are decoupled and independently testable
- **Fail Fast** — Errors are detected as early as possible in the cycle
- **Scalability** — Architecture can evolve without massive refactoring
- **Security by design** — Security is built in, not added after
{{/if}}

## Format de Réponse Attendu

{{#if (eq lang "fr")}}
Pour chaque décision d'architecture, tu fournis :
1. **Contexte** — Pourquoi cette décision est nécessaire
2. **Options considérées** — Au moins 2 alternatives avec trade-offs
3. **Décision retenue** — L'option choisie et sa justification
4. **Conséquences** — Impacts positifs et négatifs de la décision
{{else}}
For each architectural decision, you provide:
1. **Context** — Why this decision is needed
2. **Options considered** — At least 2 alternatives with trade-offs
3. **Decision** — The chosen option and rationale
4. **Consequences** — Positive and negative impacts
{{/if}}
```

- [ ] **Step 4 : Créer `packages/agents-dev/templates/dev-senior.hbs`**

```handlebars
# Développeur Senior — Méthode KUATE

## Identité

{{#if (eq lang "fr")}}
Tu es le **Développeur Senior** de la Méthode KUATE. Tu interviens en **Phase T — Transformer** pour implémenter les fonctionnalités avec rigueur et qualité.
{{else}}
You are the **Senior Developer** of the Méthode KUATE. You operate in **Phase T — Transform** to implement features with rigor and quality.
{{/if}}

## Contexte Projet

{{#if (eq lang "fr")}}
- **Projet :** {{projectName}}
- **Méthodologie :** {{methodologyName}}
{{#if isAgile}}
- **Unité de travail :** {{vocabulary.task_unit}}
{{/if}}
{{else}}
- **Project:** {{projectName}}
- **Methodology:** {{methodologyName}}
{{/if}}

## Approche de Développement

{{#if (eq lang "fr")}}
Tu appliques systématiquement le cycle **TDD (Test-Driven Development)** :
1. **Red** — Écrire le test qui échoue d'abord
2. **Green** — Écrire le code minimal pour faire passer le test
3. **Refactor** — Améliorer le code sans changer le comportement

Tu appliques les principes **Clean Code** :
- Noms de variables et fonctions explicites
- Fonctions courtes (< 20 lignes) avec une seule responsabilité
- Pas de commentaires pour expliquer le QUOI (le code doit être auto-documenté)
- Commentaires uniquement pour expliquer le POURQUOI (contrainte non-évidente)
{{else}}
You systematically apply the **TDD (Test-Driven Development)** cycle:
1. **Red** — Write the failing test first
2. **Green** — Write minimal code to pass the test
3. **Refactor** — Improve code without changing behavior

You apply **Clean Code** principles:
- Explicit variable and function names
- Short functions (< 20 lines) with single responsibility
- No comments explaining WHAT (code should be self-documenting)
- Comments only for WHY (non-obvious constraints)
{{/if}}

## Format de Réponse

{{#if (eq lang "fr")}}
Pour chaque demande d'implémentation, tu fournis :
1. Le test d'abord (avec commande pour le lancer)
2. L'implémentation minimale
3. Les cas limites à couvrir
4. La commande de commit suggérée
{{else}}
For each implementation request, you provide:
1. The test first (with command to run it)
2. The minimal implementation
3. Edge cases to cover
4. The suggested commit command
{{/if}}
```

- [ ] **Step 5 : Créer les 6 templates restants**

Créer `packages/agents-dev/templates/expert-devops.hbs` :

```handlebars
# Expert DevOps — Méthode KUATE

## Identité

{{#if (eq lang "fr")}}
Tu es l'**Expert DevOps** de la Méthode KUATE. Tu interviens en **Phase T — Transformer** pour automatiser, sécuriser et optimiser les pipelines de livraison.
{{else}}
You are the **DevOps Expert** of the Méthode KUATE. You operate in **Phase T — Transform** to automate, secure and optimize delivery pipelines.
{{/if}}

## Contexte : {{projectName}} — {{methodologyName}}

## Responsabilités

{{#if (eq lang "fr")}}
- **CI/CD** — Pipelines GitHub Actions / GitLab CI robustes et rapides
- **Conteneurisation** — Docker multi-stage builds, images légères
- **Orchestration** — Kubernetes deployments, health checks, rollbacks
- **Monitoring** — Logs structurés, métriques, alertes
- **Infrastructure as Code** — Terraform / Pulumi pour l'infra reproductible
- **Sécurité** — Scan d'images Docker, secrets management, RBAC
{{else}}
- **CI/CD** — Robust and fast GitHub Actions / GitLab CI pipelines
- **Containerization** — Docker multi-stage builds, lightweight images
- **Orchestration** — Kubernetes deployments, health checks, rollbacks
- **Monitoring** — Structured logs, metrics, alerts
- **Infrastructure as Code** — Terraform / Pulumi for reproducible infra
- **Security** — Docker image scanning, secrets management, RBAC
{{/if}}
```

Créer `packages/agents-dev/templates/expert-securite.hbs` :

```handlebars
# Expert Sécurité — Méthode KUATE

## Identité

{{#if (eq lang "fr")}}
Tu es l'**Expert Sécurité** de la Méthode KUATE. Tu interviens en **Phase A — Architecturer** pour intégrer la sécurité dès la conception.
{{else}}
You are the **Security Expert** of the Méthode KUATE. You operate in **Phase A — Architect** to integrate security from the design phase.
{{/if}}

## Contexte : {{projectName}} — {{methodologyName}}

## Cadre de Référence

{{#if (eq lang "fr")}}
Tu travailles selon les standards :
- **OWASP Top 10** — Les 10 risques de sécurité les plus critiques
- **STRIDE** — Threat modeling (Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation)
- **NIST** — Framework de cybersécurité
- **RGPD** — Protection des données personnelles (projets EU)

Pour chaque revue, tu fournis : niveau de risque (Critique/Haut/Moyen/Faible), vecteur d'attaque, impact potentiel, remédiation recommandée.
{{else}}
You work according to standards:
- **OWASP Top 10** — The 10 most critical security risks
- **STRIDE** — Threat modeling
- **NIST** — Cybersecurity framework

For each review, you provide: risk level (Critical/High/Medium/Low), attack vector, potential impact, recommended remediation.
{{/if}}
```

Créer `packages/agents-dev/templates/qa-strategist.hbs` :

```handlebars
# Stratège QA — Méthode KUATE

## Identité

{{#if (eq lang "fr")}}
Tu es le **Stratège QA** de la Méthode KUATE. Tu interviens en **Phase E — Évaluer** pour définir et exécuter une stratégie de tests basée sur le risque.
{{else}}
You are the **QA Strategist** of the Méthode KUATE. You operate in **Phase E — Evaluate** to define and execute a risk-based testing strategy.
{{/if}}

## Contexte : {{projectName}} — {{methodologyName}}

## Pyramide de Tests

{{#if (eq lang "fr")}}
Tu structures les tests selon la pyramide :
1. **Tests unitaires (70%)** — Rapides, isolés, nombreux
2. **Tests d'intégration (20%)** — Vérifient les interfaces entre composants
3. **Tests E2E (10%)** — Valident les parcours utilisateur critiques

Priorité basée sur le risque : fonctionnalité critique × probabilité de défaut.
{{else}}
You structure tests according to the pyramid:
1. **Unit tests (70%)** — Fast, isolated, numerous
2. **Integration tests (20%)** — Verify interfaces between components
3. **E2E tests (10%)** — Validate critical user journeys

Priority based on risk: critical functionality × defect probability.
{{/if}}
```

Créer `packages/agents-dev/templates/tech-lead.hbs` :

```handlebars
# Tech Lead — Méthode KUATE

## Identité

{{#if (eq lang "fr")}}
Tu es le **Tech Lead** de la Méthode KUATE. Tu interviens en **Phase T — Transformer** pour maintenir la qualité du code et faire progresser l'équipe.
{{else}}
You are the **Tech Lead** of the Méthode KUATE. You operate in **Phase T — Transform** to maintain code quality and grow the team.
{{/if}}

## Contexte : {{projectName}} — {{methodologyName}}

## Responsabilités

{{#if (eq lang "fr")}}
- **Revue de code** — Feedback constructif, éducatif, jamais condescendant
- **Standards** — Définir et faire respecter les conventions du projet
- **Mentoring** — Guider les développeurs junior avec patience
- **Dette technique** — Identifier, prioriser et planifier le remboursement
- **Décisions techniques** — Arbitrer les choix d'implémentation

Pour chaque revue de code, tu fournis : ce qui est bien (toujours commencer par ça), ce qui doit changer (avec explication du pourquoi), suggestions d'amélioration (optionnelles).
{{else}}
- **Code review** — Constructive, educational, never condescending feedback
- **Standards** — Define and enforce project conventions
- **Mentoring** — Guide junior developers with patience
- **Technical debt** — Identify, prioritize and plan repayment
- **Technical decisions** — Arbitrate implementation choices
{{/if}}
```

Créer `packages/agents-dev/templates/expert-performance.hbs` :

```handlebars
# Expert Performance — Méthode KUATE

## Identité

{{#if (eq lang "fr")}}
Tu es l'**Expert Performance** de la Méthode KUATE. Tu interviens en **Phase E — Évaluer** pour mesurer, analyser et optimiser les performances.
{{else}}
You are the **Performance Expert** of the Méthode KUATE. You operate in **Phase E — Evaluate** to measure, analyze and optimize performance.
{{/if}}

## Contexte : {{projectName}} — {{methodologyName}}

## Métriques Clés

{{#if (eq lang "fr")}}
**Web :** Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
**API :** P95 < 200ms, P99 < 500ms, taux d'erreur < 0.1%
**Base de données :** Requêtes lentes > 100ms à optimiser

Approche : mesurer d'abord (pas d'optimisation prématurée), identifier le vrai goulot d'étranglement, optimiser, mesurer l'impact.
{{else}}
**Web:** Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
**API:** P95 < 200ms, P99 < 500ms, error rate < 0.1%
**Database:** Slow queries > 100ms to optimize

Approach: measure first (no premature optimization), identify real bottleneck, optimize, measure impact.
{{/if}}
```

Créer `packages/agents-dev/templates/expert-ia-ml.hbs` :

```handlebars
# Expert IA/ML — Méthode KUATE

## Identité

{{#if (eq lang "fr")}}
Tu es l'**Expert IA/ML** de la Méthode KUATE. Tu interviens en **Phase T — Transformer** pour intégrer des modèles d'IA et construire des pipelines ML robustes.
{{else}}
You are the **AI/ML Expert** of the Méthode KUATE. You operate in **Phase T — Transform** to integrate AI models and build robust ML pipelines.
{{/if}}

## Contexte : {{projectName}} — {{methodologyName}}

## Domaines d'Expertise

{{#if (eq lang "fr")}}
- **Intégration LLM** — API Claude / OpenAI, prompt engineering, RAG
- **MLOps** — Versioning de modèles, monitoring drift, réentraînement
- **Éthique IA** — Biais, explicabilité, privacy, conformité RGPD
- **Performance** — Latence d'inférence, batching, caching de réponses

Pour chaque intégration IA, tu évalues : coût par requête, latence P95, risques de biais, plan de fallback si le modèle est indisponible.
{{else}}
- **LLM Integration** — Claude / OpenAI API, prompt engineering, RAG
- **MLOps** — Model versioning, drift monitoring, retraining
- **AI Ethics** — Bias, explainability, privacy, GDPR compliance
- **Performance** — Inference latency, batching, response caching
{{/if}}
```

- [ ] **Step 6 : Installer les dépendances et builder**

```bash
cd packages/agents-dev && npm install && cd ../..
npm run build --workspace=packages/core
npm run build --workspace=packages/agents-dev
```

- [ ] **Step 7 : Commit**

```bash
git add packages/agents-dev/ templates/
git commit -m "feat(agents-dev): add 8 dev agent definitions and Handlebars templates"
```

---

## Task 7 : Package `cli` — Setup et i18n

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/i18n/fr.json`
- Create: `packages/cli/src/i18n/en.json`
- Create: `packages/cli/src/i18n/index.ts`
- Create: `packages/cli/src/utils/lang.ts`

- [ ] **Step 1 : Créer `packages/cli/package.json`**

```json
{
  "name": "methode-kuate",
  "version": "1.0.0",
  "description": "Méthode KUATE — CLI d'orchestration d'agents IA",
  "type": "module",
  "bin": {
    "kuate": "./dist/index.js",
    "methode-kuate": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsup src/index.ts --format esm --clean --banner.js '#!/usr/bin/env node'",
    "dev": "tsup src/index.ts --format esm --watch --banner.js '#!/usr/bin/env node'"
  },
  "dependencies": {
    "@methode-kuate/core": "*",
    "@methode-kuate/agents-dev": "*",
    "@clack/prompts": "^0.7.0",
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "clipboardy": "^4.0.0",
    "update-notifier": "^7.0.0"
  },
  "devDependencies": {
    "@types/update-notifier": "^6.0.0"
  }
}
```

- [ ] **Step 2 : Créer `packages/cli/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3 : Créer `packages/cli/src/i18n/fr.json`**

```json
{
  "welcome": "MÉTHODE KUATE — Bienvenue",
  "init.projectName": "Nom du projet ?",
  "init.lang": "Langue de travail ?",
  "init.method": "Méthodologie ?",
  "init.domains": "Domaines d'agents à installer ?",
  "init.success": "Méthode KUATE initialisée avec succès ✓",
  "init.hint": "Tapez kuate help pour commencer",
  "init.generating": "Génération des agents...",
  "init.generated": "{{count}} agents générés ({{method}}, {{lang}})",
  "agent.list.header": "AGENTS DISPONIBLES",
  "agent.list.domain.dev": "DOMAINE DEV SOFTWARE",
  "agent.list.domain.business": "DOMAINE BUSINESS",
  "agent.list.domain.content": "DOMAINE CONTENU",
  "agent.list.domain.education": "DOMAINE FORMATION",
  "agent.use.copied": "Prompt {{name}} copié dans le presse-papier",
  "agent.use.hint": "Collez ce prompt dans Claude, ChatGPT, Gemini ou Cursor",
  "agent.notFound": "Agent \"{{name}}\" introuvable. Tapez kuate agent list pour voir les agents disponibles.",
  "config.show.header": "CONFIGURATION KUATE",
  "error.notKuateProject": "Aucun projet KUATE trouvé. Lancez kuate init d'abord.",
  "phase.K": "Konnaître",
  "phase.U": "Unifier",
  "phase.A": "Architecturer",
  "phase.T": "Transformer",
  "phase.E": "Évaluer"
}
```

- [ ] **Step 4 : Créer `packages/cli/src/i18n/en.json`**

```json
{
  "welcome": "MÉTHODE KUATE — Welcome",
  "init.projectName": "Project name?",
  "init.lang": "Working language?",
  "init.method": "Methodology?",
  "init.domains": "Agent domains to install?",
  "init.success": "Méthode KUATE initialized successfully ✓",
  "init.hint": "Type kuate help to get started",
  "init.generating": "Generating agents...",
  "init.generated": "{{count}} agents generated ({{method}}, {{lang}})",
  "agent.list.header": "AVAILABLE AGENTS",
  "agent.list.domain.dev": "DEV SOFTWARE DOMAIN",
  "agent.list.domain.business": "BUSINESS DOMAIN",
  "agent.list.domain.content": "CONTENT DOMAIN",
  "agent.list.domain.education": "EDUCATION DOMAIN",
  "agent.use.copied": "Prompt {{name}} copied to clipboard",
  "agent.use.hint": "Paste this prompt into Claude, ChatGPT, Gemini or Cursor",
  "agent.notFound": "Agent \"{{name}}\" not found. Run kuate agent list to see available agents.",
  "config.show.header": "KUATE CONFIGURATION",
  "error.notKuateProject": "No KUATE project found. Run kuate init first.",
  "phase.K": "Know",
  "phase.U": "Unify",
  "phase.A": "Architect",
  "phase.T": "Transform",
  "phase.E": "Evaluate"
}
```

- [ ] **Step 5 : Créer `packages/cli/src/i18n/index.ts`**

```typescript
import { createRequire } from 'node:module'
import type { Lang } from '@methode-kuate/core'

const require = createRequire(import.meta.url)

let currentLang: Lang = 'fr'
let strings: Record<string, string> = {}

export function initI18n(lang: Lang): void {
  currentLang = lang
  strings =
    lang === 'fr'
      ? require('./fr.json')
      : require('./en.json')
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let str = strings[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
    }
  }
  return str
}

export function getLang(): Lang {
  return currentLang
}
```

- [ ] **Step 6 : Créer `packages/cli/src/utils/lang.ts`**

```typescript
import type { Lang } from '@methode-kuate/core'

export function detectSystemLang(): Lang {
  const envLang = process.env['LANG'] ?? process.env['LANGUAGE'] ?? ''
  if (envLang.toLowerCase().startsWith('fr')) return 'fr'
  return 'en'
}
```

- [ ] **Step 7 : Commit**

```bash
git add packages/cli/
git commit -m "feat(cli): setup CLI package with i18n (FR/EN)"
```

---

## Task 8 : CLI — Commande `kuate init`

**Files:**
- Create: `packages/cli/src/commands/init.ts`
- Test: `packages/cli/src/commands/init.test.ts`

- [ ] **Step 1 : Créer `packages/cli/src/commands/init.ts`**

```typescript
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
import type { KuateConfig, Lang, MethodologyId, DomainId } from '@methode-kuate/core'
import { initI18n, t, getLang } from '../i18n/index.js'
import { detectSystemLang } from '../utils/lang.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = path.resolve(__dirname, '../../../../templates')
const AGENTS_TEMPLATES_DIR = path.resolve(__dirname, '../../../agents-dev/templates')

const VERSION = '1.0.0'

export async function initCommand(cwd: string): Promise<void> {
  const detectedLang = detectSystemLang()
  initI18n(detectedLang)

  p.intro(chalk.bold.hex('#6c63ff')(t('welcome')))

  if (isKuateProject(cwd)) {
    p.log.warn('Un projet KUATE existe déjà dans ce dossier. Tapez kuate config pour modifier la configuration.')
    p.outro('')
    return
  }

  const projectName = await p.text({
    message: t('init.projectName'),
    validate: (v) => (v.trim().length === 0 ? 'Le nom ne peut pas être vide' : undefined),
  })
  if (p.isCancel(projectName)) { p.cancel('Annulé'); process.exit(0) }

  const lang = await p.select<{ value: Lang; label: string }[], Lang>({
    message: t('init.lang'),
    options: [
      { value: 'fr', label: 'Français' },
      { value: 'en', label: 'English' },
    ],
  })
  if (p.isCancel(lang)) { p.cancel('Annulé'); process.exit(0) }

  initI18n(lang as Lang)

  const method = await p.select<{ value: MethodologyId; label: string }[], MethodologyId>({
    message: t('init.method'),
    options: [
      { value: 'agile', label: 'Agile / Scrum' },
      { value: 'lean', label: 'Lean' },
      { value: 'pmbok', label: 'PMBOK (Gestion de Projet)' },
      { value: 'design-thinking', label: 'Design Thinking' },
      { value: 'okr', label: 'OKR' },
      { value: 'custom', label: 'Custom' },
    ],
  })
  if (p.isCancel(method)) { p.cancel('Annulé'); process.exit(0) }

  const domains = await p.multiselect<{ value: DomainId; label: string }[], DomainId>({
    message: t('init.domains'),
    options: [
      { value: 'dev', label: 'Dev Software', hint: '8 agents' },
      { value: 'business', label: 'Business & Stratégie', hint: '6 agents' },
      { value: 'content', label: 'Création de Contenu', hint: '5 agents' },
      { value: 'education', label: 'Formation & Pédagogie', hint: '4 agents' },
    ],
    initialValues: ['dev'],
  })
  if (p.isCancel(domains)) { p.cancel('Annulé'); process.exit(0) }

  const spin = p.spinner()
  spin.start(t('init.generating'))

  let methodology
  try {
    methodology = await loadMethodology(method as MethodologyId, TEMPLATES_DIR)
  } catch {
    methodology = await loadMethodology('agile', TEMPLATES_DIR)
  }

  const allAgents = [...AGENTS_DEV]
  const selectedAgents = filterAgentsForMethodology(allAgents, methodology, domains as DomainId[])

  const config: KuateConfig = {
    project: String(projectName),
    lang: lang as Lang,
    method: method as MethodologyId,
    domains: domains as DomainId[],
    version: VERSION,
    agents: selectedAgents.map((a) => a.id),
  }

  await initKuateStructure(cwd, config)

  const outputDir = path.join(cwd, '.kuate', 'agents')
  for (const agent of selectedAgents) {
    await generateAndSaveAgent({
      agent,
      config,
      methodology,
      templatesDir: AGENTS_TEMPLATES_DIR,
      outputDir,
    })
  }

  spin.stop(
    chalk.green(
      t('init.generated', { count: selectedAgents.length, method: methodology.nameFr, lang: lang as string })
    )
  )

  p.note(
    `${chalk.bold('.kuate/')} créé avec :\n` +
    `  ${chalk.cyan(selectedAgents.length)} agents · ${chalk.cyan(methodology.workflowIds.length)} workflows\n` +
    `  Langue : ${chalk.cyan(lang)}  Méthode : ${chalk.cyan(methodology.nameFr)}`,
    t('init.success')
  )

  p.outro(chalk.dim(t('init.hint')))
}
```

- [ ] **Step 2 : Installer les dépendances CLI**

```bash
cd packages/cli && npm install && cd ../..
```

- [ ] **Step 3 : Commit**

```bash
git add packages/cli/src/commands/init.ts
git commit -m "feat(cli): implement kuate init command with wizard"
```

---

## Task 9 : CLI — Commande `kuate agent`

**Files:**
- Create: `packages/cli/src/commands/agent.ts`

- [ ] **Step 1 : Créer `packages/cli/src/commands/agent.ts`**

```typescript
import path from 'node:path'
import * as p from '@clack/prompts'
import chalk from 'chalk'
import clipboard from 'clipboardy'
import fs from 'fs-extra'
import { readConfig, isKuateProject } from '@methode-kuate/core'
import { AGENTS_DEV } from '@methode-kuate/agents-dev'
import type { AgentDefinition } from '@methode-kuate/core'
import { initI18n, t } from '../i18n/index.js'

const ALL_AGENTS: AgentDefinition[] = [...AGENTS_DEV]

const PHASE_COLORS: Record<string, (s: string) => string> = {
  K: chalk.hex('#3b5bdb'),
  U: chalk.hex('#2f9e44'),
  A: chalk.hex('#e67700'),
  T: chalk.hex('#ae3ec9'),
  E: chalk.hex('#0ca678'),
}

export async function agentListCommand(cwd: string): Promise<void> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red(t('error.notKuateProject')))
    process.exit(1)
  }

  const config = await readConfig(cwd)
  initI18n(config.lang)

  const installedIds = new Set(config.agents)
  const installedAgents = ALL_AGENTS.filter((a) => installedIds.has(a.id))

  const byDomain = installedAgents.reduce<Record<string, AgentDefinition[]>>((acc, agent) => {
    acc[agent.domain] ??= []
    acc[agent.domain].push(agent)
    return acc
  }, {})

  console.log()
  console.log(chalk.bold.hex('#6c63ff')(`  ${t('agent.list.header')}`))
  console.log()

  const domainKeys = ['dev', 'business', 'content', 'education'] as const
  const domainLabels: Record<string, string> = {
    dev: t('agent.list.domain.dev'),
    business: t('agent.list.domain.business'),
    content: t('agent.list.domain.content'),
    education: t('agent.list.domain.education'),
  }

  for (const domain of domainKeys) {
    const agents = byDomain[domain]
    if (!agents?.length) continue

    console.log(chalk.dim(`  ${domainLabels[domain]}`))
    console.log(chalk.dim('  ' + '─'.repeat(55)))

    for (const agent of agents) {
      const phaseColor = PHASE_COLORS[agent.phase] ?? chalk.white
      const name = config.lang === 'fr' ? agent.nameFr : agent.name
      const desc = config.lang === 'fr' ? agent.descriptionFr : agent.description
      console.log(
        `  ${chalk.green('●')} ${chalk.bold(agent.id.padEnd(28))} ${phaseColor(agent.phase)}  ${chalk.dim(desc)}`
      )
      console.log(`    ${chalk.dim('└─')} ${chalk.italic.dim(name)}`)
    }
    console.log()
  }

  console.log(chalk.dim(`  Tapez ${chalk.hex('#6c63ff')('kuate agent use <nom>')} pour utiliser un agent`))
  console.log()
}

export async function agentUseCommand(cwd: string, agentId: string): Promise<void> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red(t('error.notKuateProject')))
    process.exit(1)
  }

  const config = await readConfig(cwd)
  initI18n(config.lang)

  const agentDef = ALL_AGENTS.find((a) => a.id === agentId)
  if (!agentDef) {
    console.error(chalk.red(t('agent.notFound', { name: agentId })))
    process.exit(1)
  }

  const promptPath = path.join(cwd, '.kuate', 'agents', `${agentId}.md`)
  if (!fs.existsSync(promptPath)) {
    console.error(chalk.red(`Agent "${agentId}" non généré. Relancez kuate init.`))
    process.exit(1)
  }

  const promptContent = await fs.readFile(promptPath, 'utf-8')
  await clipboard.write(promptContent)

  const name = config.lang === 'fr' ? agentDef.nameFr : agentDef.name
  p.log.success(chalk.green(t('agent.use.copied', { name })))
  console.log()
  console.log(chalk.dim('  ┌─ Aperçu ─────────────────────────────────────────────────┐'))
  const preview = promptContent.split('\n').slice(0, 3).join('\n  │ ')
  console.log(`  │ ${chalk.italic.dim(preview)}`)
  console.log(chalk.dim('  └──────────────────────────────────────────────────────────┘'))
  console.log()
  console.log(chalk.dim(`  → ${t('agent.use.hint')}`))
  console.log()
}

export async function agentInfoCommand(cwd: string, agentId: string): Promise<void> {
  const agentDef = ALL_AGENTS.find((a) => a.id === agentId)
  if (!agentDef) {
    console.error(chalk.red(`Agent "${agentId}" introuvable.`))
    process.exit(1)
  }

  const phaseColor = PHASE_COLORS[agentDef.phase] ?? chalk.white
  console.log()
  console.log(chalk.bold(`  ${agentDef.nameFr} / ${agentDef.name}`))
  console.log(chalk.dim(`  ID: ${agentDef.id}`))
  console.log(`  Phase KUATE : ${phaseColor(agentDef.phase)} — ${phaseColor(t(`phase.${agentDef.phase}`))}`)
  console.log(`  Domaine : ${chalk.cyan(agentDef.domain)}`)
  console.log(`  FR : ${agentDef.descriptionFr}`)
  console.log(`  EN : ${agentDef.description}`)
  console.log()
}
```

- [ ] **Step 2 : Commit**

```bash
git add packages/cli/src/commands/agent.ts
git commit -m "feat(cli): implement kuate agent list|use|info commands"
```

---

## Task 10 : CLI — Commande `kuate config` et entry point

**Files:**
- Create: `packages/cli/src/commands/config.ts`
- Create: `packages/cli/src/index.ts`

- [ ] **Step 1 : Créer `packages/cli/src/commands/config.ts`**

```typescript
import chalk from 'chalk'
import { readConfig, isKuateProject } from '@methode-kuate/core'
import { initI18n, t } from '../i18n/index.js'

export async function configShowCommand(cwd: string): Promise<void> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red(t('error.notKuateProject')))
    process.exit(1)
  }

  const config = await readConfig(cwd)
  initI18n(config.lang)

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
}
```

- [ ] **Step 2 : Créer `packages/cli/src/index.ts`**

```typescript
import { Command } from 'commander'
import { initI18n } from './i18n/index.js'
import { detectSystemLang } from './utils/lang.js'
import { initCommand } from './commands/init.js'
import { agentListCommand, agentUseCommand, agentInfoCommand } from './commands/agent.js'
import { configShowCommand } from './commands/config.js'

const VERSION = '1.0.0'
const cwd = process.cwd()

initI18n(detectSystemLang())

const program = new Command()

program
  .name('kuate')
  .description('Méthode KUATE — CLI d\'orchestration d\'agents IA')
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
  .description('Copie le prompt de l\'agent dans le presse-papier')
  .action((nom: string) => agentUseCommand(cwd, nom))

agentCmd
  .command('info <nom>')
  .description('Affiche la fiche complète d\'un agent')
  .action((nom: string) => agentInfoCommand(cwd, nom))

const configCmd = program.command('config').description('Gère la configuration .kuate/')

configCmd
  .command('show')
  .description('Affiche la configuration courante')
  .action(() => configShowCommand(cwd))

program.parse(process.argv)
```

- [ ] **Step 3 : Commit**

```bash
git add packages/cli/src/
git commit -m "feat(cli): add config command and main entry point"
```

---

## Task 11 : Build final et test d'intégration

**Files:**
- Modify: `package.json` (scripts de build global)

- [ ] **Step 1 : Builder tous les packages dans l'ordre**

```bash
npm run build --workspace=packages/core
npm run build --workspace=packages/agents-dev
npm run build --workspace=packages/cli
```

Résultat attendu : dossiers `dist/` créés dans chaque package, aucune erreur TypeScript.

- [ ] **Step 2 : Tester `kuate init` en local**

```bash
cd /tmp && mkdir kuate-test-project && cd kuate-test-project
node "C:\Users\axiat\Desktop\Méthode KUATE\packages\cli\dist\index.js" init
```

Résultat attendu : wizard interactif qui demande projet, langue, méthode, domaines.

- [ ] **Step 3 : Vérifier la structure `.kuate/` générée**

```bash
ls -la .kuate/
ls -la .kuate/agents/
cat .kuate/config.yaml
```

Résultat attendu : fichiers `config.yaml`, dossiers `agents/`, `context/`, fichiers `.md` des agents générés.

- [ ] **Step 4 : Tester `kuate agent list`**

```bash
node "C:\Users\axiat\Desktop\Méthode KUATE\packages\cli\dist\index.js" agent list
```

Résultat attendu : liste colorée des agents avec phases KUATE.

- [ ] **Step 5 : Tester `kuate agent use architecte-solution`**

```bash
node "C:\Users\axiat\Desktop\Méthode KUATE\packages\cli\dist\index.js" agent use architecte-solution
```

Résultat attendu : confirmation de copie dans le presse-papier, aperçu du prompt.

- [ ] **Step 6 : Tester `kuate config show`**

```bash
node "C:\Users\axiat\Desktop\Méthode KUATE\packages\cli\dist\index.js" config show
```

Résultat attendu : tableau formaté avec la configuration.

- [ ] **Step 7 : Lancer tous les tests unitaires**

```bash
npx vitest run
```

Résultat attendu : tous les tests PASS.

- [ ] **Step 8 : Commit final**

```bash
cd "C:\Users\axiat\Desktop\Méthode KUATE"
git add .
git commit -m "feat: Plan 1 complete — kuate init, agent list/use/info, config show"
```

---

## Récapitulatif Plan 1

À la fin de ce plan, vous aurez :

| Commande | Statut |
|---|---|
| `kuate init` | ✅ Wizard interactif complet |
| `kuate agent list` | ✅ Liste colorée par domaine/phase |
| `kuate agent use <nom>` | ✅ Copie dans le presse-papier |
| `kuate agent info <nom>` | ✅ Fiche détaillée |
| `kuate config show` | ✅ Configuration formatée |
| 8 agents Dev (templates FR/EN) | ✅ |
| Méthodologies Agile, Lean, PMBOK, DT | ✅ |
| Structure `.kuate/` complète | ✅ |
| Tests unitaires | ✅ Core testé (config, renderer, methodology) |

**Prochain plan (Plan 2) :** `kuate memory`, `kuate conseil`, agents Business/Content/Education, 50+ workflows.
