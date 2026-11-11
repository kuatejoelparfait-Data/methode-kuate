<p align="center">
  <img src="docs/assets/banner.svg" alt="KUATE — Knower · Unifier · Architect · Transformer · Evaluator — CLI d'orchestration d'agents IA" width="720">
</p>

# Méthode KUATE

**CLI d'orchestration d'agents IA pour équipes structurées**

Auteur : KUATE JOEL PARFAIT — [LinkedIn](https://www.linkedin.com/in/joelparfaitkuate/)  
Licence : CC BY-NC-ND 4.0 — Usage personnel, partage autorisé, modifications et usage commercial interdits  
Version : 1.3.0

**→ [Tutoriel débutant : votre premier projet de A à Z](docs/TUTORIEL-DEBUTANT.md)** (45 min, cas d'usage guidé)  
**→ [Tutoriel complet — toutes les commandes](docs/TUTORIEL.md)**  
**→ [Scénario concret : LexiFlow SaaS de A à Z](docs/SCENARIO.md)**  
**→ [Tutoriels par phase](docs/tutoriels/README.md)** · **[Référence complète](docs/REFERENCE-COMPLETE.md)**

---

## Présentation

Méthode KUATE est un framework en ligne de commande qui installe dans n'importe quel projet une méthodologie structurée, des agents IA spécialisés et une mémoire persistante. Il transforme une idée en **specs complètes et vérifiables**, puis en code, en suivant cinq phases : **K·U·A·T·E**.

Ce que fait le code, concrètement :

1. **Il prépare le projet** (`kuate init`) : méthodologie, langue, description, agents choisis parmi 23, mémoire de projet, fichier `KUATE.md` à partager avec une IA.
2. **Il écrit les specs avec des agents** (`kuate spec`) : pour chaque phase K, U, A, un agent principal rédige, des agents relecteurs challengent, l'agent révise, l'outil vous pose les questions ouvertes, puis une **porte de complétude** vérifie le résultat.
3. **Il prouve que les specs sont complètes** (`kuate spec analyze`) : chaque story a ses critères, chaque critère est couvert par une tâche, plus aucune ambiguïté ni « TBD ». Un rapport de traçabilité est écrit dans `docs/analysis.md`.
4. **Il passe la main à un LLM de code** (`kuate spec export`) : fichiers de tâche autoportants, ordre d'exécution, instructions pour Claude Code, Copilot, Cursor ou un `AGENTS.md` générique. Ou bien KUATE code lui-même (`kuate projet`, `kuate dev`).
5. **Il suit le cycle** (`kuate cycle`, `kuate next`) : quelles phases sont produites, périmées, sautées ; ce qui est incohérent ; la prochaine action utile.
6. **Il garde la mémoire** (`kuate memory`) : contexte cumulatif, réinjectable dans n'importe quelle session IA.

Points forts :

- **Acronyme structurant** : 5 phases (K·U·A·T·E) forment la colonne vertébrale de la méthode.
- **Moteur de méthodologie** : les workflows s'adaptent à Agile, Lean, PMBOK, OKR, SAFe, Design Thinking.
- **Specs vérifiables** : formats à identifiants stables (`US-001`, `AC-001`, `T-001`), porte déterministe sans IA.
- **Multi-provider** : Claude (Anthropic) ou GPT (OpenAI), clés modifiables à tout moment, choix du provider avant chaque exécution.
- **Sûr par défaut** : tout fichier remplacé est sauvegardé dans `.kuate/backups/`.
- **Multilinguisme natif** : FR/EN, extensible par la communauté.

---

## Comment tout s'enchaîne

```
kuate config ai ─► kuate init ─► kuate spec ─────────────► kuate spec export ─► Claude Code / Copilot / Cursor
 (clé API)        (projet,       K → U → A                  (stories, ordre,       codent à partir des specs
                   agents)       rédiger · relire ·          instructions)
                                 réviser · clarifier ·
                                 porte de complétude
                                       │
                                       └──► ou : kuate projet (K→U→A→T→E, code généré par KUATE) ─► kuate dev

À tout moment :  kuate cycle (état et ajustements)   kuate next (prochaine action)   kuate memory (contexte)
```

## Les 5 phases KUATE

| Phase | Rôle | FR | EN |
|-------|------|----|-----|
| K | Knower | Découvrir & Contextualiser | Discover & Contextualize |
| U | Unifier | Agréger & Synthétiser | Aggregate & Synthesize |
| A | Architect | Concevoir & Structurer | Design & Structure |
| T | Transformer | Exécuter & Restructurer | Execute & Restructure |
| E | Evaluator | Évaluer & Valider | Evaluate & Validate |

---

## Installation

**Prérequis :** Node.js >= 20, npm >= 9, une clé API Claude (Anthropic) ou OpenAI pour les commandes qui utilisent l'IA.

```bash
git clone https://github.com/kuatejoelparfait-Data/methode-kuate.git
cd methode-kuate
npm install
```

Le `npm install` compile tous les packages et rend la commande `kuate` disponible globalement sur votre machine.

```bash
kuate --version   # 1.3.0
kuate doctor      # vérifie Node, npm, configuration du projet
```

Après un `git pull`, relancez `npm install` (ou `npm run build`) pour recompiler.

---

## Démarrage rapide

### Parcours recommandé : spécifier avec KUATE, coder avec votre outil

```bash
kuate config ai                 # 1. enregistrer votre clé API (Claude ou OpenAI)
mkdir mon-projet && cd mon-projet
kuate init                      # 2. wizard : nom, langue, méthode, description, agents
kuate spec                      # 3. phase K (constitution + specs), puis relancer pour U, puis A
kuate spec analyze              # 4. vérifier la porte de complétude
kuate spec export --target claude   # 5. passation (claude | copilot | cursor | agents)
```

Ouvrez ensuite Claude Code (ou Copilot, Cursor) dans le dossier : il trouve `CLAUDE.md`, `docs/IMPLEMENT.md` et `docs/stories/`, et code tâche par tâche. Le tutoriel débutant déroule ce parcours sur un cas concret : [docs/TUTORIEL-DEBUTANT.md](docs/TUTORIEL-DEBUTANT.md).

### Parcours alternatif : tout générer avec KUATE

```bash
kuate init
kuate projet                    # pipeline K → U → A → T → E (specs, backlog, archi, code, évaluation)
kuate dev                       # installe, lance, teste, corrige avec les agents
```

### Au quotidien

```bash
kuate next                      # l'IA suggère la prochaine action selon l'état du projet
kuate cycle                     # état des 5 phases, phases périmées, ajustements
kuate run --agent dev-senior --task "ajouter l'export PDF des factures"
kuate memory seed               # remplir la mémoire du projet
kuate conseil --agents "architecte-solution,expert-securite" --topic "..." --save
```

---

## Choisir et gérer le provider IA

Deux providers sont supportés : **Claude (Anthropic)** et **GPT (OpenAI)**. Les deux clés peuvent coexister.

```bash
kuate config ai       # menu : changer provider/modèle, ajouter/modifier/tester/supprimer une clé
kuate config show     # provider actif, clés masquées (sk-ant-…a1b2) et leur source
```

- Les clés sont stockées dans `~/.kuate/global.json` (hors dépôt, droits restreints quand le système le permet).
- Une clé enregistrée par `kuate config ai` est **prioritaire** sur la variable d'environnement `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`.
- Changer de provider **ne supprime aucune clé**.
- Une clé saisie est vérifiée par un appel réel avant d'être enregistrée.

**Choisir le provider avant une exécution**, sans toucher à la configuration globale — options disponibles sur `run`, `phase`, `next`, `projet`, `dev`, `cycle`, `spec` (sous-commandes IA) :

```bash
kuate spec --choose-ai                        # menu provider puis modèle, avec option « définir par défaut »
kuate next --provider openai --model gpt-4o   # pour cette exécution seulement
```

Si le provider choisi n'a pas de clé, la commande vous la demande (terminal interactif) ou s'arrête avec un message clair.

---

## Commandes

### Démarrer

#### `kuate init`

Wizard interactif en 6 étapes :

```
Étape 1 : Nom du projet
Étape 2 : Langue de travail (fr | en)
Étape 3 : Méthodologie (agile | lean | pmbok | design-thinking | okr | safe | custom)
Étape 4 : Description du projet (texte libre)
Étape 5 : Configuration IA — provider + clé + modèle (optionnel ; garder ou remplacer une clé existante)
Étape 6 : Sélection des agents
          - IA intelligente : analyse la description ou un fichier de cahier des charges
          - Manuelle : par domaine (dev, business, contenu, formation)
```

Génère dans le projet : `.kuate/config.yaml`, `.kuate/agents/*.md`, `.kuate/context/*.md` (5 sections de mémoire) et `KUATE.md`. À la fin, propose de lancer le pipeline, de laisser l'IA guider (`kuate next`) ou de remplir la mémoire.

> Pour `kuate spec`, installez au moins les domaines **Dev + Business** : les agents `business-analyst`, `chef-projet`, `architecte-solution` (rédaction) et `qa-strategist`, `expert-securite`, `tech-lead`, `expert-devops` (relecture) en font partie. Un relecteur absent est simplement sauté avec un avertissement ; un agent principal absent arrête la commande.

#### `KUATE.md` — contexte maître

Généré par `kuate init` : description, agents groupés par phase, workflow recommandé, instructions pour l'IA. Partagez-le en premier message dans Claude, ChatGPT ou Gemini.

#### `kuate doctor`

Vérifie la version de Node.js et npm, la présence de `.kuate/`, la validité de `config.yaml`, les agents générés et le dossier de contexte.

#### `kuate config ai` / `kuate config show`

Voir [Choisir et gérer le provider IA](#choisir-et-gérer-le-provider-ia).

---

### Spécifier

#### `kuate spec`

Outil de **spécification en phases** (inspiré de BMAD et de GitHub Spec Kit). Objectif : sortir des phases K, U, A avec un paquet de specs **complet et vérifiable**, qu'un LLM de code ou la phase T peut implémenter sans poser de question.

```bash
kuate spec                     # boucle pour la prochaine phase K/U/A incomplète (--phase K|U|A pour forcer)
kuate spec constitution        # principes, stack, conventions (docs/constitution.md)
kuate spec clarify             # répond aux [NEEDS CLARIFICATION] ouverts
kuate spec analyze [--ai]      # porte de complétude -> docs/analysis.md (code de sortie 1 s'il reste des erreurs)
kuate spec stories             # un fichier de tâche autoportant par tâche (docs/stories/)
kuate spec export --target claude|copilot|cursor|agents   # passation
```

**Boucle d'une phase** : rédiger (agent principal) → relire (agents relecteurs) → réviser → clarifier (questions à l'humain) → porte. Si les documents de la phase existent déjà, l'outil propose de les **réviser** (en gardant vos réponses et corrections) plutôt que de tout régénérer.

| Phase | Agent principal | Relecteurs | Documents |
|---|---|---|---|
| K | `business-analyst` | `qa-strategist`, `expert-securite` | `docs/constitution.md`, `docs/specs.md` |
| U | `chef-projet` | `tech-lead` | `docs/backlog.md` |
| A | `architecte-solution` | `expert-securite`, `expert-devops`, `tech-lead` | `docs/architecture.md`, `docs/data-model.md`, `docs/contracts/*.md` |

**Formats analysables** (identifiants stables) :

```
### US-001 — Titre                                  (docs/specs.md)
- AC-001 (US-001) : Étant donné …, quand …, alors …

### T-001 [P] — Titre                               (docs/backlog.md)
Covers: US-001, AC-001
Depends: T-000
Files: src/auth/login.ts, src/auth/login.test.ts
Done when: critère vérifiable
```

`[NEEDS CLARIFICATION: question]` marque une ambiguïté dans n'importe quel document ; `kuate spec clarify` pose la question, remplace le marqueur par la réponse et journalise dans `docs/clarifications.md`.

**Porte de complétude** (déterministe, sans IA) :

| Règle | Contrôle |
|---|---|
| G0 | `specs.md`, `backlog.md`, `architecture.md` présents et non vides |
| G1 | plus aucun `[NEEDS CLARIFICATION]`, `TBD`, `TODO`, « à définir » (valeur isolée), `???` hors blocs de code ; la ligne fautive est indiquée |
| G2 | au moins une story, chacune avec au moins un critère `AC-` |
| G3 / G4 | chaque story et chaque critère couverts par au moins une tâche |
| G5 | au moins une tâche ; chacune avec `Covers`, `Files`, `Done when` et des références existantes |
| G6 | dépendances existantes, sans cycle |
| G7 | sections d'architecture obligatoires ; `data-model.md` et `contracts/` si la constitution les déclare |
| G8 | aucun identifiant en double |
| G9 | aucune ligne ne ressemble à une définition d'identifiant sans respecter le format (elle serait sinon ignorée en silence) |

`kuate spec export` refuse de s'exécuter tant que la porte n'est pas passée (sauf `--force`), écrit `docs/IMPLEMENT.md` (ordre d'exécution par groupes, tâches `[P]` parallélisables), les fichiers `docs/stories/T-xxx.md` et le fichier d'instructions de l'outil : `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/kuate.mdc` ou `AGENTS.md`.

---

### Piloter

#### `kuate next` ⭐ Point d'entrée recommandé

L'assistant guidé. Il affiche l'avancement du cycle, puis propose des actions concrètes avec l'agent et la tâche pré-remplis.

```bash
kuate next
```

```
  MonSaaS · Claude (Anthropic) / claude-haiku-4-5-20251001

   ✓ K ─[⚠ U]─ ○ A ─ ○ T ─ ○ E

  Quelle action lancer ?
  ❯ [U] chef-projet           Mettre à jour le backlog après la modification des specs
    [A] architecte-solution   Concevoir le schéma Prisma : users, invoices, clients
    [T] dev-senior            Créer le composant InvoiceCard avec shadcn/ui
    ✏  Décrire une autre tâche manuellement
    ✕  Quitter
```

- Les suggestions tiennent compte du statut du cycle (phases périmées d'abord, rien pour les phases sautées), de vos notes d'ajustement et de l'historique des actions déjà faites.
- Si l'IA est indisponible, des suggestions de secours basées sur le cycle sont proposées.
- Les fichiers générés qui en remplacent d'autres sont sauvegardés dans `.kuate/backups/` ; chaque action réussie est ajoutée à l'historique.

#### `kuate cycle`

Analyse le cycle K·U·A·T·E et permet de l'ajuster. Sans appel IA par défaut.

```bash
kuate cycle              # vue des 5 phases + menu d'ajustements
kuate cycle --analyse    # + analyse de cohérence par IA (specs ↔ backlog ↔ archi ↔ code ↔ éval)
kuate cycle --json       # statut machine-lisible
```

Statuts : `produite`, `périmée` (une phase amont a été modifiée après), `validée`, `sautée`, `à faire`. Pour K, U, A, l'état de la **porte de complétude** s'affiche à côté (« complète » ou « N erreur(s) »).

Ajustements : relancer une phase (ancien document sauvegardé dans `.kuate/backups/`), valider, sauter, rouvrir, ajouter une note d'ajustement transmise aux agents. L'état est conservé dans `.kuate/cycle.json`.

---

### Exécuter

#### `kuate projet`

Pipeline complet K → U → A → T → E avec suivi de phase : `docs/specs.md`, `docs/backlog.md`, `docs/architecture.md`, code dans le projet (l'IA planifie les tâches, les agents les exécutent, une revue valide chaque tâche), puis `docs/evaluation.md`. Il démarre à la première phase à faire ou périmée, ignore les phases sautées ou validées via `kuate cycle`, et propose d'exporter vers un outil externe (Claude Code, Cursor, Codex) ou de lancer `kuate dev`.

```bash
kuate projet                # reprend là où le projet en est
kuate projet --from T       # démarre à une phase précise (K|U|A|T|E)
```

> La phase T de `kuate projet` lit un extrait (3000 premiers caractères) de chaque document. Pour un projet plus gros, préférez le parcours `kuate spec` + `kuate spec export`, qui transmet des fichiers de tâche autoportants.

#### `kuate dev`

De `src/` à une application qui tourne : détecte le gestionnaire de paquets et installe les dépendances, configure la base (Prisma si présent), lance le serveur de développement, exécute les tests, puis, en cas d'échec, une boucle d'agents lit l'erreur et corrige le fichier jusqu'au passage ou à l'abandon. Un terminal d'agents reste disponible ensuite.

#### `kuate phase <K|U|A|T|E>`

Session guidée et interactive pour une phase. L'agent IA génère du code, des specs ou des analyses **directement dans votre projet** via l'API configurée.

```bash
kuate phase K   # Knower      — analyse, user stories, risques
kuate phase T   # Transformer — génération de code dans le projet
```

Boucle : choisir l'agent → décrire la tâche → réponse IA streamée → sauvegarder les fichiers générés → note mémoire → continuer ou passer à la phase suivante.

#### `kuate run`

Exécute un agent sur une tâche précise. Le code généré est détecté automatiquement et proposé à la sauvegarde.

```bash
kuate run --agent dev-senior --task "créer le système d'authentification avec Clerk"
kuate run --agent expert-securite --task "audit OWASP du module de signature" --choose-ai
```

#### `kuate conseil`

Mode multi-agents : génère un prompt qui structure plusieurs experts autour d'un sujet, prêt à coller dans Claude ou ChatGPT (aucun appel IA), avec option de sauvegarde dans la mémoire d'architecture.

```bash
kuate conseil --agents "architecte-solution,expert-securite,tech-lead" \
  --topic "Quelle architecture pour une app Next.js avec 100k utilisateurs ?" --save
```

---

### Contexte et agents

#### `kuate memory`

```bash
kuate memory show                          # vue d'ensemble de la mémoire
kuate memory show --section architecture   # une section spécifique
kuate memory add --section constraints     # ajouter une entrée
kuate memory seed                          # wizard guidé pour remplir toutes les sections
kuate memory inject                        # bloc de contexte à coller dans une session IA
```

Sections : `memory`, `architecture`, `business`, `constraints`, `glossary`. Les agents lisent les entrées récentes du journal `memory.md` et les notes d'ajustement du cycle.

#### `kuate agent`

```bash
kuate agent list              # liste tous les agents disponibles
kuate agent use <nom>         # copie le prompt dans le presse-papier
kuate agent info <nom>        # fiche complète d'un agent
```

#### `kuate workflow`

```bash
kuate workflow list                    # liste les 27 workflows par phase
kuate workflow list --phase T          # filtrer par phase (K|U|A|T|E)
kuate workflow show sprint-planning    # fiche d'un workflow
```

#### `kuate build`

Exporte les **agents** (leurs prompts) pour différentes plateformes IA. Pour transmettre un **paquet de specs** à un LLM de code, utilisez `kuate spec export`.

```bash
kuate build --target claude     # CLAUDE.md
kuate build --target chatgpt    # chatgpt-instructions.json
kuate build --target gemini     # gemini-gem.md
kuate build --target cursor     # .cursorrules
kuate build --target copilot    # .github/copilot-instructions.md
kuate build --target pack       # pack partageable
```

---

## Les 23 agents

### Dev Software (8 agents)

| ID | Phase | Description |
|----|-------|-------------|
| `architecte-solution` | A | Conception systèmes, TOGAF-aware |
| `dev-senior` | T | Implémentation TDD, clean code |
| `expert-devops` | T | CI/CD, Docker, Kubernetes |
| `expert-securite` | A | OWASP, threat modeling, audit |
| `qa-strategist` | E | Tests basés sur le risque |
| `tech-lead` | T | Revue de code, mentoring |
| `expert-performance` | E | Optimisation, Core Web Vitals |
| `expert-ia-ml` | T | Intégration modèles IA, MLOps |

### Business et Stratégie (6 agents)

| ID | Phase | Description |
|----|-------|-------------|
| `chef-projet` | U | PMBOK, jalons, risques |
| `coach-agile` | U | Scrum, Kanban, SAFe |
| `business-analyst` | K | Exigences, BDD, user stories |
| `expert-lean` | U | VSM, réduction gaspillages |
| `stratege-okr` | U | OKR, alignement, suivi |
| `expert-finance-tech` | K | Budget, ROI, business case |

### Création de Contenu (5 agents)

| ID | Phase | Description |
|----|-------|-------------|
| `copywriter-technique` | E | Docs techniques, README, API |
| `expert-seo` | E | SEO, mots-clés, Core Web Vitals |
| `social-media-strategist` | T | Calendrier éditorial, engagement |
| `expert-communication` | K | Relations presse, stakeholders |
| `createur-formation` | A | Curriculum, ADDIE |

### Formation et Pédagogie (4 agents)

| ID | Phase | Description |
|----|-------|-------------|
| `concepteur-pedagogique` | A | ADDIE, taxonomie de Bloom |
| `tuteur-ia` | T | Apprentissage personnalisé |
| `evaluateur-competences` | E | Assessment, certifications |
| `createur-contenu-educatif` | T | Vidéos, cours, exercices |

---

## Les 7 méthodologies supportées

| Méthodologie | Workflows activés |
|---|---|
| `agile` | Sprint Planning, Backlog Grooming, Retrospective, Review |
| `lean` | Value Stream Mapping, Kaizen, 5S Digital |
| `pmbok` | Charte Projet, WBS, RACI, Rapport Avancement |
| `design-thinking` | Empathize, Define, Ideate, Prototype, Test |
| `okr` | OKR Definition, Weekly Check-in, Quarterly Review |
| `safe` | PI Planning, ART Sync, Solution Demo |
| `custom` | Définis par l'utilisateur |

---

## Structure générée dans le projet

```
KUATE.md                       Contexte maître à partager avec une IA
.kuate/
|-- config.yaml                Méthodologie, langue, agents actifs
|-- cycle.json                 État du cycle : phases sautées/validées, notes d'ajustement, historique
|-- agents/                    Un fichier .md par agent (prompt prêt à l'emploi)
|-- context/
|   |-- memory.md              Journal chronologique des décisions
|   |-- architecture.md        Choix techniques et rationale
|   |-- business.md            Contexte métier et parties prenantes
|   |-- constraints.md         Contraintes non négociables
|   `-- glossary.md            Termes spécifiques au projet
`-- backups/                   Anciennes versions des fichiers remplacés (horodatées)
docs/                          Paquet de specs (voir kuate spec)
|-- constitution.md            Principes, stack, conventions, drapeaux données/API
|-- specs.md                   Phase K : stories US-xxx et critères AC-xxx
|-- backlog.md                 Phase U : tâches T-xxx
|-- architecture.md            Phase A : stack, dossiers, conventions, décisions
|-- data-model.md              Phase A : entités (si données persistantes)
|-- contracts/*.md             Phase A : contrats d'API (si API exposée)
|-- clarifications.md          Journal des questions et réponses
|-- analysis.md                Rapport de la porte + matrice de traçabilité
|-- IMPLEMENT.md               Ordre d'exécution pour le LLM de code (après spec export)
`-- stories/T-xxx.md           Fichiers de tâche autoportants
```

Le fichier global `~/.kuate/global.json` (hors projet) contient le provider actif, le modèle et les clés.

---

## Architecture du monorepo

```
methode-kuate/
|-- packages/
|   |-- cli/              CLI (bin: kuate + methode-kuate) : commandes, wizard, interface
|   |-- core/             Moteur sans interface
|   |   |-- config-manager/     config.yaml (validation Zod)
|   |   |-- methodology-engine/ méthodologies et workflows
|   |   |-- agent-generator/    rendu des prompts d'agents (Handlebars)
|   |   |-- ai-generator/       appels IA (Claude, OpenAI), clés, runner d'agents
|   |   |-- cycle/              état et statut du cycle K·U·A·T·E
|   |   `-- spec/               parsing, porte de complétude, stories, passation
|   |-- agents-dev/       8 agents Dev Software
|   |-- agents-business/  6 agents Business et Stratégie
|   |-- agents-content/   5 agents Création de Contenu
|   `-- agents-education/ 4 agents Formation et Pédagogie
|-- templates/
|   `-- methodology/      agile.yaml, lean.yaml, pmbok.yaml, etc.
`-- docs/                 Tutoriels, scénarios, spécifications et plans
```

---

## Stack technique

- **Runtime** : Node.js 20+, TypeScript 5, ESM
- **CLI** : Commander.js, @clack/prompts, chalk, ora
- **Moteur** : Handlebars (templates), Zod (validation), yaml, fs-extra
- **IA** : API Anthropic et API OpenAI (appels directs, sans SDK)
- **Build** : tsup, npm workspaces
- **Tests** : vitest v2

---

## Licence

Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)

Copyright (c) 2026 KUATE JOEL PARFAIT  
[linkedin.com/in/joelparfaitkuate](https://www.linkedin.com/in/joelparfaitkuate/)

Voir le fichier [LICENSE](./LICENSE) pour les termes complets.
