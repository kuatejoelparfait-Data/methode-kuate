# Méthode KUATE — Design Spec

**Date :** 2026-06-17
**Statut :** Approuvé
**Commande CLI :** `kuate` / `npx methode-kuate`
**Stack :** Node.js 20+ · TypeScript 5 · npm workspaces

---

## 1. Vision

**Méthode KUATE** est un framework CLI open-source d'orchestration d'agents IA, pensé pour les équipes francophones. Il installe dans n'importe quel projet une méthodologie structurée, des agents IA spécialisés et une mémoire persistante — permettant à Claude, ChatGPT, Gemini et Cursor de se comporter comme de véritables experts méthodologiques.

KUATE se distingue des outils d'orchestration IA existants sur quatre axes :
1. **Acronyme structurant** — 5 phases (K·U·A·T·E) forment la colonne vertébrale de toute la méthode
2. **Moteur de méthodologie** — les agents s'adaptent automatiquement à Agile, Lean, PMBOK, etc.
3. **Mémoire persistante** — contexte projet cumulatif réinjectable entre sessions
4. **Multilinguisme natif** — FR/EN, extensible par la communauté

---

## 2. L'acronyme KUATE

| Lettre | Phase | Description |
|--------|-------|-------------|
| **K** | **Konnaître** | Discovery — comprendre le problème, le domaine, les utilisateurs |
| **U** | **Unifier** | Planning — unifier les exigences en une architecture cohérente |
| **A** | **Architecturer** | Design — concevoir la solution technique |
| **T** | **Transformer** | Build — transformer le design en code fonctionnel |
| **E** | **Évaluer** | Deliver — tester, déployer, mesurer, itérer |

---

## 3. Architecture Monorepo

```
methode-kuate/
├── packages/
│   ├── cli/              → CLI principale (bin: kuate + methode-kuate)
│   ├── core/             → Moteur de méthodologie, sans UI
│   ├── agents-dev/       → 8 agents Dev Software
│   ├── agents-business/  → 6 agents Business & Stratégie
│   ├── agents-content/   → 5 agents Création de Contenu
│   └── agents-education/ → 4 agents Formation & Pédagogie
├── templates/
│   ├── methodology/      → agile.yaml · lean.yaml · pmbok.yaml · etc.
│   ├── project/          → structure initiale .kuate/
│   └── platform/         → claude.hbs · chatgpt.hbs · cursor.hbs · etc.
├── plugins/              → plugins officiels (supabase, nextjs, mobile)
├── docs/                 → Astro Starlight (site de documentation)
├── test/                 → Vitest unit + integration
└── .github/workflows/    → CI lint · test · publish
```

### Structure générée dans le projet utilisateur

```
.kuate/
├── config.yaml           → méthodologie + langue + modules actifs
├── agents/               → prompts générés (1 fichier .md par agent)
├── workflows/            → workflows actifs par phase
└── context/
    ├── memory.md         → log chronologique des décisions
    ├── architecture.md   → choix techniques et rationale
    ├── business.md       → contexte métier et stakeholders
    ├── constraints.md    → contraintes non-négociables
    └── glossary.md       → termes spécifiques au projet
```

---

## 4. Commandes CLI

### `kuate init`
Initialise la Méthode KUATE dans un projet. Lance un wizard interactif.

```
--lang <fr|en>         Langue (défaut: auto-détecté depuis l'OS)
--method <nom>         Méthodologie: agile | lean | pmbok | safe | okr | design-thinking | custom
--domain <noms>        Domaines: dev,business,content,education (défaut: dev)
```

### `kuate install`
Installe ou met à jour des modules et plugins.

```
--module <nom>         Module: agents-dev | agents-business | agents-content | agents-education
--plugin <nom>         Plugin tiers: kuate-plugin-supabase | kuate-plugin-nextjs | etc.
--list                 Lister tous les modules et plugins disponibles
```

### `kuate agent`
Gère les agents spécialisés.

```
list                   Affiche tous les agents (filtrés par domaine et phase KUATE)
use <nom>              Copie le prompt de l'agent dans le presse-papier
info <nom>             Fiche complète: rôle, méthodologie, workflows associés
create                 Wizard pour créer un agent personnalisé
```

### `kuate workflow`
Gère et exécute les workflows par phase.

```
list [--phase K|U|A|T|E]   Liste les workflows filtrés par phase
run <nom>                   Lance le workflow interactif étape par étape
show <nom>                  Affiche toutes les étapes et agents impliqués
create                      Wizard pour créer un workflow personnalisé
```

### `kuate conseil`
Mode multi-agents : plusieurs experts en simultané sur un sujet.

```
--agents <a,b,c>       Agents à convoquer (noms séparés par virgule)
--topic "<texte>"      Sujet de la session de conseil
--save                 Sauvegarde la décision dans .kuate/context/architecture.md
```

### `kuate memory`
Gère la mémoire persistante du projet.

```
show [--section <nom>]          Affiche la mémoire (ou une section spécifique)
add --section <nom>             Ajoute une décision à une section
inject                          Génère un bloc contexte prêt à coller en session IA
```

### `kuate build`
Génère les fichiers d'export pour les plateformes IA.

```
--target <plateforme>   claude | chatgpt | gemini | cursor | copilot | pack
```

### Autres commandes

| Commande | Description |
|----------|-------------|
| `kuate export --format <zip\|json\|md>` | Crée un KUATE Pack partageable |
| `kuate config show\|set\|reset` | Gère `.kuate/config.yaml` |
| `kuate update` | Met à jour kuate + modules en préservant les customisations |
| `kuate doctor` | Vérifie l'installation et propose des corrections |
| `kuate plugin list\|install\|remove\|create` | Gère les plugins tiers |
| `kuate help [commande]` | Aide contextuelle en FR ou EN |

---

## 5. Moteur de Méthodologie

Au moment de `kuate init --method agile`, le moteur :

1. Charge `templates/methodology/agile.yaml`
2. Sélectionne les agents et workflows pertinents
3. Injecte dans chaque template Handlebars (`.hbs`) :
   - `{{methodology}}` → vocabulaire et rituels Agile
   - `{{lang}}` → FR ou EN
   - `{{projectName}}` → nom du projet
   - `{{context}}` → contenu de `.kuate/context/`
4. Génère les fichiers `.md` finaux dans `.kuate/agents/`

### Méthodologies supportées

| Méthodologie | Agents principaux générés | Workflows activés |
|---|---|---|
| Agile/Scrum | Scrum Master, Product Owner, Dev Senior, Coach Agile | Sprint Planning, Backlog Grooming, Rétrospective, Review |
| PMBOK | Chef de Projet, Analyste Risques, Planificateur | Charte Projet, WBS, Matrice RACI, Rapport Avancement |
| Lean | Expert Lean, Value Stream Mapper | Value Stream Mapping, Kaizen, 5S Digital |
| Design Thinking | Chercheur UX, Facilitateur, Prototypeur | Empathise, Define, Ideate, Prototype, Test |
| SAFe | Release Train Engineer, Solution Architect | PI Planning, ART Sync, Solution Demo |
| OKR | Stratège OKR, Coach Performance | OKR Definition, Weekly Check-in, Quarterly Review |
| Custom | Défini par l'utilisateur via wizard | Définis par l'utilisateur |

---

## 6. Les 23 Agents

### Dev Software (8)
- `architecte-solution` — conception systèmes, TOGAF-aware · Phase **A**
- `dev-senior` — implémentation TDD, clean code · Phase **T**
- `expert-devops` — CI/CD, Docker, Kubernetes · Phase **T**
- `expert-securite` — OWASP, threat modeling, audit · Phase **A**
- `qa-strategist` — tests risk-based, stratégie qualité · Phase **E**
- `tech-lead` — revue de code, mentoring · Phase **T**
- `expert-performance` — optimisation, profiling · Phase **E**
- `expert-ia-ml` — intégration modèles, MLOps · Phase **T**

### Business & Stratégie (6)
- `chef-projet` — PMBOK, livrables, jalons · Phase **U**
- `coach-agile` — Scrum, Kanban, SAFe · Phase **U**
- `business-analyst` — requirements, BDD · Phase **K**
- `expert-lean` — réduction des gaspillages · Phase **U**
- `stratege-okr` — objectifs et résultats clés · Phase **U**
- `expert-finance-tech` — budget, ROI, business case · Phase **K**

### Création de Contenu (5)
- `copywriter-technique` — docs, README, tutoriels · Phase **E**
- `expert-seo` — optimisation moteurs de recherche · Phase **E**
- `social-media-strategist` — contenu réseaux sociaux · Phase **T**
- `expert-communication` — relations presse, stakeholders · Phase **K**
- `createur-formation` — conception curriculum · Phase **A**

### Formation & Pédagogie (4)
- `concepteur-pedagogique` — modèles ID, ADDIE · Phase **A**
- `tuteur-ia` — apprentissage personnalisé · Phase **T**
- `evaluateur-competences` — assessment, certification · Phase **E**
- `createur-contenu-educatif` — vidéos, cours, exercices · Phase **T**

---

## 7. Les 50+ Workflows par Phase

### K — Konnaître (10 workflows)
Discovery Interview · Market Analysis · Problem Definition · User Research · Competitor Audit · Stakeholder Mapping · Domain Modeling · Risk Identification · Business Case · Persona Creation

### U — Unifier (12 workflows)
Requirements Gathering · Sprint Planning · Roadmap Creation · OKR Definition · Matrice RACI · Backlog Grooming · Stakeholder Alignment · Estimation Poker · Release Planning · Communication Plan · Budget Planning · Dependency Mapping

### A — Architecturer (10 workflows)
System Design · Tech Stack Selection · API Design (REST/GraphQL) · Security Review (OWASP) · UX Architecture · DB Schema Design · ADR (Architecture Decision Record) · Infrastructure Design · Integration Design · Performance Planning

### T — Transformer (10 workflows)
Feature Implementation Guide · Code Review · CI/CD Pipeline Setup · Integration Testing · Refactoring Guide · Documentation Auto · Pair Programming · Bug Triage · Technical Debt Review · Release Candidate

### E — Évaluer (10 workflows)
Test Strategy (Risk-Based) · Performance Audit · Deployment Checklist · Rétrospective Sprint · Post-Mortem Incident · Rapport de Livraison · User Acceptance Testing · KPI Dashboard · Continuous Improvement · Lessons Learned

---

## 8. Système de Mémoire

La mémoire est structurée en fichiers Markdown dans `.kuate/context/`. Elle est :

- **Lisible humainement** — fichiers Markdown editables manuellement
- **Injectée automatiquement** — `kuate memory inject` génère un bloc de contexte prêt à coller
- **Versionnable** — commité avec le projet, partagé avec l'équipe
- **Structurée par domaine** — architecture, business, contraintes, glossaire

### Format de `kuate memory inject`

```
[CONTEXTE KUATE — MonAppli]
Méthode: Agile/Scrum | Langue: FR | Version: 1.2.0

ARCHITECTURE: Monolithe modulaire V1 → microservices V2 (décidé 2026-06-17)
SPRINT EN COURS: Sprint 3 — Objectif: Module Auth. 8 stories. Vélocité: 24 pts
CONTRAINTES: Node.js 20+, PostgreSQL, pas de vendor lock-in AWS
STACK: Next.js 14, Fastify, Prisma, Supabase
[FIN CONTEXTE]
```

---

## 9. Système de Plugins

Un plugin KUATE est un package npm qui respecte le contrat `plugin.yaml` :

```yaml
name: kuate-plugin-supabase
version: 1.0.0
description: Expert Supabase pour KUATE
domains: [dev]
phases: [A, T]
agents:
  - supabase-expert.hbs
workflows:
  - supabase-setup.yaml
  - rls-review.yaml
  - edge-functions.yaml
requires:
  kuate-core: ">=1.0.0"
```

Un plugin simple est composé uniquement de fichiers `.hbs` et `.yaml` — aucun code Node.js requis.

---

## 10. Export Multi-Plateforme (`kuate build`)

| Cible | Fichier généré | Usage |
|-------|---------------|-------|
| `claude` | `CLAUDE.md` | Claude Projects / Claude Code |
| `chatgpt` | `chatgpt-instructions.json` | Custom GPT |
| `gemini` | `gemini-gem.md` | Gemini Gems |
| `cursor` | `.cursorrules` | Cursor IDE |
| `copilot` | `.github/copilot-instructions.md` | GitHub Copilot |
| `pack` | `kuate-pack-<projet>.zip` | Partage équipe |

---

## 11. Stack Technique

### CLI & UX
- `commander` — routing des commandes
- `@clack/prompts` — wizard TUI interactif
- `chalk` — couleurs terminal
- `ora` — spinners
- `clipboardy` — presse-papier
- `update-notifier` — notification de mises à jour

### Core & Données
- `TypeScript 5.x` — typage strict
- `zod` — validation des schémas de config
- `yaml` — parsing/écriture `.kuate/config.yaml`
- `handlebars` — templating des agents
- `fs-extra` — opérations fichiers
- `glob` — découverte de fichiers

### Build & Qualité
- `tsup` — bundler rapide
- `vitest` — tests unitaires et integration
- `eslint` + `prettier` — qualité de code
- `husky` — pre-commit hooks
- `changesets` — versioning sémantique
- `markdownlint` — validation docs

### CI/CD & Publication
- `GitHub Actions` — lint, test, publish automatiques
- `npm workspaces` — gestion monorepo
- `Astro Starlight` — documentation publique
- `Node.js 20.12+` — version minimum requise

---

## 12. Multilinguisme

- Langue détectée automatiquement depuis l'OS (`process.env.LANG`)
- Configurable par projet dans `.kuate/config.yaml`
- Toutes les chaînes CLI dans `packages/cli/src/i18n/fr.json` et `en.json`
- Tous les agents disponibles en FR et EN via templates `.hbs` distincts
- Extensible par contribution communautaire (PR avec nouveau fichier de langue)

---

## 13. Positionnement Méthode KUATE

| Fonctionnalité | Méthode KUATE |
|---|---|
| Acronyme structurant | 5 phases K·U·A·T·E |
| Méthodologies formelles | Agile, Lean, PMBOK, SAFe, OKR... |
| Mémoire persistante | `.kuate/context/` injectable |
| Multilinguisme | FR/EN natif |
| Nombre d'agents | 23 sur 4 domaines |
| Nombre de workflows | 50+ adaptés par méthodologie |
| Mode multi-agents | Conseil Kuate + synthèse + mémoire |
| Export plateformes | Claude/GPT/Gemini/Cursor/Copilot + Pack |
| Système de plugins | Contrat `plugin.yaml` |
| Domaines couverts | Dev, Business, Contenu, Formation |

---

## 14. Roadmap V1 → V2

### V1.0 (MVP)
- CLI `kuate` avec commandes `init`, `agent`, `workflow`, `memory`, `build`
- Moteur de méthodologie : Agile, Lean, PMBOK, Design Thinking
- 23 agents · 50+ workflows
- Mémoire persistante
- Export Claude + ChatGPT + Cursor
- FR/EN

### V1.5
- `kuate conseil` (mode multi-agents)
- `kuate plugin` (écosystème plugins)
- Export Gemini + Copilot + Pack
- `kuate doctor`
- Site de documentation Astro

### V2.0
- Méthodologies Custom avancées
- Plugin marketplace
- `kuate workflow create` (wizard)
- Intégration directe API Claude/OpenAI (optionnel)
- Support langues additionnelles via contributions
