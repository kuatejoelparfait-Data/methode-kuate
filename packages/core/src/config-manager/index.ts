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
  let parsed: unknown
  try {
    parsed = parse(raw)
  } catch (err) {
    throw new Error(`Config YAML invalide dans ${configPath}: ${(err as Error).message}`)
  }
  try {
    return KuateConfigSchema.parse(parsed)
  } catch (err) {
    throw new Error(`Config invalide dans ${configPath}: ${(err as Error).message}`)
  }
}

export async function writeConfig(cwd: string, config: KuateConfig): Promise<void> {
  const kuateDir = getKuateDir(cwd)
  await fs.ensureDir(kuateDir)
  const configPath = getConfigPath(cwd)
  await fs.writeFile(configPath, stringify(config), 'utf-8')
}

function getContextTemplate(section: string, config: KuateConfig): string {
  const date = new Date().toISOString().split('T')[0]
  const project = config.project
  const method = config.method
  const lang = config.lang

  switch (section) {
    case 'architecture':
      return `# Architecture — ${project}

> Ce fichier documente les choix techniques et leur rationale.
> Complétez avec \`kuate memory seed\` ou \`kuate memory add --section architecture\`.

## Contexte initial — ${date}

**Projet :** ${project}
**Méthodologie :** ${method}
**Langue :** ${lang}

**Stack technique :** *(à renseigner — ex: Next.js 14, PostgreSQL 15, Docker)*

**Rationale :** *(pourquoi ces choix ? contraintes client, performance, équipe ?)*

**Contraintes techniques non négociables :** *(ex: Node.js 20+, hébergement EU, pas de cloud US)*

---
`
    case 'business':
      return `# Business — ${project}

> Ce fichier documente le contexte métier, les objectifs et les parties prenantes.
> Complétez avec \`kuate memory seed\` ou \`kuate memory add --section business\`.

## Contexte initial — ${date}

**Projet :** ${project}

**Objectif principal :** *(ex: réduire le temps de traitement des dossiers de 40%)*

**Client / Organisation :** *(ex: startup B2B SaaS, 12 personnes)*

**Parties prenantes clés :** *(ex: CTO décideur, 2 devs seniors, 1 PO)*

**Valeur attendue :** *(ce que le succès ressemble concrètement)*

---
`
    case 'constraints':
      return `# Contraintes — ${project}

> Ce fichier documente les contraintes non négociables du projet.
> Complétez avec \`kuate memory seed\` ou \`kuate memory add --section constraints\`.

## Contexte initial — ${date}

**Réglementaire / Conformité :** *(ex: RGPD, données hébergées EU, ISO 27001)*

**Budget / Timeline :** *(ex: MVP en 3 mois, budget infra < 500€/mois)*

**Hors scope / Interdit :** *(ex: pas de microservices V1, pas de mobile natif)*

**Dépendances critiques :** *(librairies, APIs, services tiers obligatoires)*

---
`
    case 'glossary':
      return `# Glossaire — ${project}

> Ce fichier liste les termes métier spécifiques au projet.
> Les agents IA utilisent ce glossaire pour adapter leur vocabulaire.
> Complétez avec \`kuate memory seed\` ou \`kuate memory add --section glossary\`.

## Termes — ${date}

*(Format : **Terme** : définition précise dans le contexte du projet)*

**Exemple :** *(à remplacer)*
- **Dossier** : unité de travail principale traitée par le système
- **Client** : utilisateur final payant, distinct de l'administrateur

---
`
    case 'memory':
      return `# Mémoire Décisions — ${project}

> Ce fichier est le log chronologique des décisions importantes.
> Chaque entrée documente POURQUOI une décision a été prise.
> Complétez avec \`kuate memory add --section memory\`.

## Initialisation — ${date}

**Décision :** Projet initialisé avec la Méthode KUATE
**Méthodologie choisie :** ${method}
**Raison :** Structure l'orchestration des agents IA dès le démarrage

---
`
    default:
      return `# ${section}\n\n`
  }
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
      const section = file.replace('.md', '')
      await fs.writeFile(filePath, getContextTemplate(section, config), 'utf-8')
    }
  }

  await writeConfig(cwd, config)
}
