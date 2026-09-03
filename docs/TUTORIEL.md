# Tutoriel Complet — Methode KUATE v1.3.0

**Auteur : KUATE JOEL PARFAIT**  
**Duree estimee : 20-30 minutes**  
[linkedin.com/in/joelparfaitkuate](https://www.linkedin.com/in/joelparfaitkuate/)

> Ce tutoriel couvre l'integralite des commandes de la CLI. Il suit un projet fictif **MonSaaS** de bout en bout, de l'installation au premier sprint de code.

---

## Sommaire

1. [Installation](#1--installation)
2. [Diagnostic initial](#2--diagnostic-initial)
3. [Initialisation du projet (wizard 6 etapes)](#3--initialisation-du-projet)
4. [KUATE.md — le contexte maitre](#4--kuatemd--le-contexte-maitre)
5. [Gestion des agents](#5--gestion-des-agents)
6. [Workflows](#6--workflows)
7. [Memoire persistante](#7--memoire-persistante)
8. [Session guidee par phase](#8--session-guidee-par-phase-kuate-phase)
9. [Execution directe d'un agent](#9--execution-directe-dun-agent-kuate-run)
10. [Mode multi-experts](#10--mode-multi-experts-kuate-conseil)
11. [Configuration IA](#11--configuration-ia-kuate-config-ai)
12. [Export multi-plateformes](#12--export-multi-plateformes-kuate-build)
13. [Configuration et diagnostic final](#13--configuration-et-diagnostic-final)
14. [Flux de travail quotidien](#14--flux-de-travail-quotidien)
15. [Reference complete des commandes](#15--reference-complete-des-commandes)
16. [Agents par cas d'usage](#16--agents-par-cas-dusage)
17. [Problemes courants](#17--problemes-courants)

---

## 1 — Installation

**Prerequis :** Node.js >= 20, npm >= 9

```bash
node --version
# v20.x.x ou superieur requis
```

Clonez et installez :

```bash
git clone https://github.com/kuatejoelparfait-Data/methode-kuate.git
cd methode-kuate
npm install
```

Le `npm install` compile tous les packages et rend `kuate` disponible globalement.

```bash
kuate --version
# 1.3.0

kuate --help
# Liste toutes les commandes
```

---

## 2 — Diagnostic initial

Avant de commencer, verifiez l'etat de l'installation :

```bash
mkdir ~/projets/monsaas
cd ~/projets/monsaas
kuate doctor
```

Resultat attendu avant initialisation :

```
  KUATE DOCTOR — Diagnostic du projet

  ✓  Node.js >= 20          v20.x.x
  ✓  npm >= 9               v10.x.x
  ⚠  .kuate/ absent         Lancez kuate init
  ⚠  config.yaml            Projet non initialise
  ⚠  Agents                 kuate init requis

  3 avertissement(s) — lancez kuate init pour les resoudre
```

---

## 3 — Initialisation du projet

```bash
kuate init
```

Le wizard interactif en **6 etapes** :

### Etape 1 — Nom du projet

```
◆─○─○─○─○─○  1/6   Nom du projet ?
> MonSaaS
```

### Etape 2 — Langue

```
●─◆─○─○─○─○  2/6   Langue de travail ?
> Français
```

### Etape 3 — Methodologie

```
●─●─◆─○─○─○  3/6   Méthodologie ?
> Agile / Scrum   (sprints, backlog, vélocité)
```

Methodologies disponibles : `Agile/Scrum`, `Lean`, `PMBOK`, `Design Thinking`, `OKR`, `SAFe`, `Custom`

### Etape 4 — Description du projet

```
  📋 Description du projet
  Cette description servira à sélectionner les agents pertinents
  et à générer le fichier KUATE.md du projet.

●─●─●─◆─○─○  4/6   Décris le projet en quelques phrases :
> Plateforme SaaS B2B de gestion de factures pour freelances.
  Stack Next.js + PostgreSQL, paiements Stripe, RGPD strict.
```

> **Pourquoi cette etape ?** La description est utilisee par l'IA (si configuree) pour selectionner automatiquement les agents les plus pertinents. Elle alimente aussi le fichier `KUATE.md` genere a la fin.

### Etape 5 — Configuration IA

```
  💡 Provider IA
  Permet la sélection intelligente d'agents et l'exécution
  IA (kuate phase / kuate run) sans quitter le terminal.
  Clé stockée dans ~/.kuate/global.json — non versionnée.

●─●─●─●─◆─○  5/6   Configurer un provider IA ?
> Oui

  Provider IA ?
  > Claude (Anthropic)   Recommandé — Haiku rapide & économique

  Clé API ANTHROPIC_API_KEY ?
  > ****************************

  Modèle ?
  > Claude Haiku 4.5   Rapide & économique — recommandé

  ✓ IA configurée : Claude (Anthropic) / claude-haiku-4-5-20251001
```

> La cle est stockee dans `~/.kuate/global.json` — jamais dans le projet, jamais dans git.

### Etape 6 — Selection des agents

Avec l'IA configuree, trois modes sont disponibles :

```
●─●─●─●─●─◆  6/6   Comment sélectionner les agents ?
> ✨ Décrire le projet    L'IA sélectionne les agents pertinents
  📄 Charger un fichier  README, specs, CDC en .md/.txt
  Sélection manuelle     Choisir les domaines manuellement
```

**Mode IA — description :**

La description de l'etape 4 est pre-remplie :

```
  Description (pré-remplie depuis l'étape 4) :
  > Plateforme SaaS B2B de gestion de factures pour freelances...

  Analyse IA du projet et sélection des agents...

  ✓ 11 agents sélectionnés par l'IA

  Raisonnement IA : Ce projet SaaS B2B nécessite des experts en
  architecture backend, sécurité RGPD, gestion de projet agile
  et documentation technique...

  Agents sélectionnés :
    ◆ architecte-solution       [A] dev
    ◆ dev-senior                [T] dev
    ◆ expert-securite           [A] dev
    ◆ expert-devops             [T] dev
    ◆ qa-strategist             [E] dev
    ◆ chef-projet               [U] business
    ◆ business-analyst          [K] business
    ◆ expert-finance-tech       [K] business
    ◆ copywriter-technique      [E] content
    ◆ tech-lead                 [T] dev
    ◆ expert-performance        [E] dev

  Valider cette sélection ?
  > Oui — utiliser ces agents
```

**Mode fichier CDC :**

```
  Quel fichier analyser ?
  > README.md    (ou cahier-des-charges.md, specs.txt, etc.)

  Fichier chargé : README.md (3842 chars)
  Analyse IA en cours...
```

**Mode manuel :**

```
  Domaines d'agents à installer ?
  > Dev + Business & Stratégie    (14 agents)
```

### Resultat final

```
  ─────────────────────────────────────────────────────
  ✓  Méthode KUATE initialisée avec succès
  ─────────────────────────────────────────────────────

  Projet      MonSaaS
  Méthode     Agile / Scrum
  Agents      11 générés dans .kuate/agents/
  Workflows   4 disponibles
  Contexte    .kuate/context/ — 5 sections prêtes
  KUATE.md    ✓ contexte maître — partagez avec Claude

  Prochaine étape recommandée :
    kuate phase K    commencez par la phase Knower — découverte & contexte
```

---

## 4 — KUATE.md — le contexte maitre

Apres l'initialisation, un fichier `KUATE.md` est genere a la racine du projet. C'est le **document de reference de votre projet** pour toutes vos sessions IA.

```bash
cat KUATE.md
```

Il contient :
- Tableau projet (nom, langue, methode, domaines)
- Description du projet
- Agents groupes par phase KUATE avec leurs roles
- Workflow recommande (commandes bash)
- Instructions pour Claude

**Usage avec Claude :**

1. Ouvrez Claude (chat ou project)
2. Partagez `KUATE.md` comme premier message
3. Claude connait maintenant tous vos agents et leur role
4. Continuez en referenciez les agents par ID : `"Utilise l'agent dev-senior pour..."`

**Mettre a jour KUATE.md :**

Pour l'instant, regenerez-le avec `kuate init` ou editez-le manuellement. Une commande `kuate kuate-update` est prevue.

---

## 5 — Gestion des agents

### Lister les agents installes

```bash
kuate agent list
```

```
  AGENTS DISPONIBLES — MonSaaS

  DOMAINE DEV SOFTWARE
  ──────────────────────────────────────────────────────
  architecte-solution    A   Conception systèmes, TOGAF-aware
  dev-senior             T   Implémentation TDD, clean code
  expert-devops          T   CI/CD, Docker, Kubernetes
  expert-securite        A   OWASP, threat modeling, audit
  qa-strategist          E   Tests basés sur le risque
  tech-lead              T   Revue de code, mentoring
  expert-performance     E   Optimisation, Core Web Vitals

  DOMAINE BUSINESS & STRATEGIE
  ──────────────────────────────────────────────────────
  chef-projet            U   PMBOK, jalons, risques
  business-analyst       K   Exigences, BDD, user stories
  expert-finance-tech    K   Budget, ROI, business case

  DOMAINE CREATION DE CONTENU
  ──────────────────────────────────────────────────────
  copywriter-technique   E   Docs techniques, README, API
```

### Fiche d'un agent

```bash
kuate agent info architecte-solution
```

```
  Architecte Solution / Solution Architect
  ID      : architecte-solution
  Phase   : A
  Domaine : dev
  FR      : Conception systèmes, TOGAF-aware, ADR
  EN      : Designs scalable system architecture (TOGAF-aware)
```

### Copier un prompt dans le presse-papier

```bash
kuate agent use dev-senior
# Prompt copié → collez dans Claude, ChatGPT ou Gemini
```

Pour voir le prompt directement :

```bash
cat .kuate/agents/dev-senior.md
```

---

## 6 — Workflows

Les workflows sont des processus structures associes a chaque phase.

### Lister tous les workflows

```bash
kuate workflow list
```

### Filtrer par phase

```bash
kuate workflow list --phase T   # Phase Transformer
kuate workflow list --phase K   # Phase Knower
```

### Fiche d'un workflow

```bash
kuate workflow show sprint-planning
kuate workflow show feature-implementation
kuate workflow show code-review
```

---

## 7 — Memoire persistante

Le dossier `.kuate/context/` contient 5 fichiers markdown qui forment la memoire du projet :

| Fichier | Contenu |
|---------|---------|
| `memory.md` | Log chronologique des decisions |
| `architecture.md` | Choix techniques et rationale |
| `business.md` | Contexte metier, stakeholders |
| `constraints.md` | Contraintes non-negociables |
| `glossary.md` | Termes specifiques au projet |

### Wizard de remplissage (recommande au debut)

```bash
kuate memory seed
```

Guide interactif qui vous pose les bonnes questions pour chaque section.

```
  KUATE Memory Seed — Contexte Projet
  Section : Architecture

  Quel est le stack technique principal ?
  > Next.js 14 App Router, PostgreSQL 15, Prisma ORM

  Framework ou librairie UI ?
  > shadcn/ui + Tailwind CSS

  Stratégie d'hébergement ?
  > Vercel (frontend) + Neon.tech (DB) — hébergement EU RGPD

  ✓ Architecture mise à jour
```

### Ajouter une entree manuellement

```bash
kuate memory add --section architecture
# Ouvre un editeur pour saisir la note
```

### Afficher la memoire

```bash
kuate memory show                          # Vue d'ensemble
kuate memory show --section architecture   # Une section
kuate memory show --section constraints
```

### Injecter le contexte dans une session IA externe

```bash
kuate memory inject
```

```
[CONTEXTE KUATE — MonSaaS]
Méthode: agile | Langue: FR | Agents: 11

ARCHITECTURE:
  Stack: Next.js 14, PostgreSQL 15, Prisma ORM
  Hébergement: Vercel + Neon.tech (EU, RGPD)
  UI: shadcn/ui + Tailwind CSS

CONTRAINTES:
  RGPD strict — données hébergées France
  Budget infra < 600€/mois

[FIN CONTEXTE]
```

Copiez ce bloc en debut de session Claude, ChatGPT ou Cursor pour que l'IA connaisse votre contexte projet.

---

## 8 — Session guidee par phase : `kuate phase`

La commande la plus puissante de la CLI. Lance une session interactive ou l'IA genere du code **directement dans votre projet**.

**Prerequis :** IA configuree (`kuate config ai`)

```bash
kuate phase K   # Knower    — analyse, user stories, risques
kuate phase U   # Unifier   — backlog, sprints, planification
kuate phase A   # Architect — architecture, securite, schemas
kuate phase T   # Transformer — generation de code
kuate phase E   # Evaluator  — tests, QA, documentation
```

### Exemple : Phase T (Transformer)

```bash
kuate phase T
```

```
  [ T ] Transformer — Exécuter & Restructurer
  7 agent(s) disponible(s) · Claude (Anthropic) / claude-haiku-4-5-20251001
  Tapez Ctrl+C à tout moment pour quitter.

  Quel agent pour cette tâche ?
  > dev-senior
    expert-devops
    tech-lead
    expert-ia-ml
    ✕ Quitter la session

  Décris la tâche :
  > Créer le système d'authentification avec Clerk et Next.js
    (entrée vide = retour au choix d'agent)
```

L'agent streame sa reponse en temps reel :

```
  ◆ dev-senior en cours...
  ──────────────────────────────────────────────

  # Système d'authentification — Clerk + Next.js 14

  ## Architecture

  Clerk gère l'authentification côté serveur...

  ```typescript
  // app/middleware.ts
  import { authMiddleware } from "@clerk/nextjs"

  export default authMiddleware({
    publicRoutes: ["/", "/api/webhooks/clerk"],
    ignoredRoutes: ["/api/public"],
  })
  ```

  ```typescript
  // app/layout.tsx
  import { ClerkProvider } from "@clerk/nextjs"

  export default function RootLayout({ children }) {
    return (
      <ClerkProvider>
        <html lang="fr">
          <body>{children}</body>
        </html>
      </ClerkProvider>
    )
  }
  ```
```

Apres la reponse :

```
  2 fichier(s) détecté(s) :
    app/middleware.ts
    app/layout.tsx

  Sauvegarder 2 fichiers ?
  > Oui

  ✓ app/middleware.ts
  ✓ app/layout.tsx

  Note mémoire ? (Entrée pour ignorer)
  > Clerk integré pour auth — middleware configuré — 2026-09-03

  ✓ Mémorisé dans .kuate/context/memory.md

  Que faire ensuite ?
  > Continuer en phase T — autre agent / autre tâche
    Même agent — nouvelle tâche
    ✕ Terminer la session
```

A la fin :

```
  Phase suivante : [ E ] Evaluator — Évaluer & Valider
  Lancez : kuate phase E
```

---

## 9 — Execution directe d'un agent : `kuate run`

Pour une tache precise sans session interactive.

```bash
kuate run --agent <id-agent> --task "<description de la tache>"
```

### Exemples

```bash
# Generer le schema Prisma
kuate run --agent architecte-solution \
  --task "Concevoir le schema Prisma pour MonSaaS : users, invoices, clients, payments"

# Creer un composant React
kuate run --agent dev-senior \
  --task "Creer le composant InvoiceCard avec shadcn/ui, props: invoice, onEdit, onDelete"

# Audit securite
kuate run --agent expert-securite \
  --task "Audit OWASP du module de paiement Stripe — identifier les risques critiques"

# Configuration CI/CD
kuate run --agent expert-devops \
  --task "Pipeline GitHub Actions pour Next.js : lint, tests, build, deploy Vercel"

# Documentation API
kuate run --agent copywriter-technique \
  --task "Documenter l'API REST /invoices avec exemples curl et types TypeScript"
```

Les fichiers detectes dans la reponse sont proposes a la sauvegarde dans le projet.

---

## 10 — Mode multi-experts : `kuate conseil`

Pose une question a plusieurs agents en meme temps.

```bash
kuate conseil \
  --agents "<id1>,<id2>,<id3>" \
  --topic "<votre question>" \
  [--save]
```

### Exemples

```bash
# Decision d'architecture
kuate conseil \
  --agents "architecte-solution,expert-securite,tech-lead" \
  --topic "Microservices vs monolithe modulaire pour MonSaaS V1 ?"

# Choix technique
kuate conseil \
  --agents "expert-ia-ml,architecte-solution,expert-devops" \
  --topic "Quelle strategie pour integrer un LLM de classification de contrats ?"

# Revue de code (avec sauvegarde memoire)
kuate conseil \
  --agents "tech-lead,qa-strategist,expert-securite" \
  --topic "Criteres de revue de code pour notre module de facturation" \
  --save
```

Le flag `--save` enregistre la session dans `.kuate/context/architecture.md`.

---

## 11 — Configuration IA : `kuate config ai`

Si vous n'avez pas configure l'IA pendant `kuate init`, ou pour changer de provider :

```bash
kuate config ai
```

```
  Provider IA ?
  > Claude (Anthropic)   Recommandé
    GPT (OpenAI)

  Clé API ANTHROPIC_API_KEY ?
  > ****************************

  Modèle ?
  > Claude Haiku 4.5    Rapide & économique — recommandé
    Claude Sonnet 5     Meilleur qualité
    Claude Opus 5       Maximum

  ✓ Config sauvegardée dans ~/.kuate/global.json
```

### Voir la configuration actuelle

```bash
kuate config show
```

```
  CONFIGURATION KUATE — MonSaaS
  ─────────────────────────────────────────────────────
  project     MonSaaS
  lang        fr
  method      agile
  domains     dev, business, content
  version     1.3.0
  agents      11 installes

  CONFIGURATION IA
  ─────────────────────────────────────────────────────
  provider    anthropic
  model       claude-haiku-4-5-20251001
  cle         ✓ configuree (sk-ant-...)
```

---

## 12 — Export multi-plateformes : `kuate build`

Exporte vos agents pour differents outils IA.

```bash
kuate build --target claude     # Genere CLAUDE.md (Claude Projects)
kuate build --target chatgpt    # Genere chatgpt-instructions.json
kuate build --target gemini     # Genere gemini-gem.md
kuate build --target cursor     # Genere .cursorrules
kuate build --target copilot    # Genere .github/copilot-instructions.md
kuate build --target pack       # Genere un pack complet partageable
```

### Usage avec Claude Projects

```bash
kuate build --target claude
```

Ouvre `claude.ai/projects` → Nouveau projet → Parametres → Coller le contenu de `CLAUDE.md` comme instructions systeme.

Tous vos agents sont maintenant disponibles dans chaque conversation Claude de ce projet.

---

## 13 — Configuration et diagnostic final

```bash
kuate doctor
```

Apres une initialisation complete :

```
  KUATE DOCTOR — Diagnostic du projet

  ✓  Node.js >= 20          v20.x.x
  ✓  npm >= 9               v10.x.x
  ✓  .kuate/ present
  ✓  config.yaml valide     projet: MonSaaS, methode: agile
  ✓  Agents                 11 genere(s)
  ✓  Contexte               .kuate/context/ — 5 sections

  Tout est en ordre.
```

---

## 14 — Flux de travail quotidien

### Au debut d'une session

```bash
# Option A : session guidee par phase
kuate phase T

# Option B : executer un agent sur une tache precise
kuate run --agent dev-senior --task "Votre tache"

# Option C : injecter le contexte dans Claude externe
kuate memory inject
# → copiez le bloc dans votre session Claude / ChatGPT
```

### Pendant le developpement

```bash
# Decision d'architecture en equipe
kuate conseil \
  --agents "architecte-solution,tech-lead" \
  --topic "Comment paginer la liste de factures avec curseur Prisma ?"

# Ajouter une decision a la memoire
kuate memory add --section architecture

# Voir l'etat de la memoire
kuate memory show
```

### Passage d'une phase a l'autre

```bash
# Phase K → U → A → T → E
kuate phase K   # Analyse et user stories
kuate phase U   # Backlog et planification sprint
kuate phase A   # Architecture et schemas
kuate phase T   # Generation de code
kuate phase E   # Tests, QA, documentation
```

### Fin de sprint

```bash
# Preparer le sprint review
kuate run --agent chef-projet --task "Rapport d'avancement sprint 3 pour MonSaaS"

# Mettre a jour le contexte
kuate memory seed

# Exporter vers Claude Projects
kuate build --target claude
```

---

## 15 — Reference complete des commandes

### `kuate init`
Lance le wizard interactif (6 etapes).

```bash
kuate init
```

| Etape | Contenu |
|-------|---------|
| 1 | Nom du projet |
| 2 | Langue (fr / en) |
| 3 | Methodologie |
| 4 | Description du projet |
| 5 | Configuration IA (provider + cle + modele) |
| 6 | Selection agents (IA intelligente ou manuelle) |

---

### `kuate agent`

```bash
kuate agent list                    # Liste tous les agents installes
kuate agent info <id>               # Fiche complete d'un agent
kuate agent use <id>                # Copie le prompt dans le presse-papier
```

---

### `kuate workflow`

```bash
kuate workflow list                  # Tous les workflows
kuate workflow list --phase <K|U|A|T|E>   # Filtrer par phase
kuate workflow show <nom>            # Fiche d'un workflow
```

---

### `kuate memory`

```bash
kuate memory seed                    # Wizard guidé de remplissage
kuate memory show                    # Vue d'ensemble
kuate memory show --section <s>      # Section specifique
kuate memory add --section <s>       # Ajouter une entree
kuate memory inject                  # Generer bloc contexte pour IA externe
```

Sections : `memory`, `architecture`, `business`, `constraints`, `glossary`

---

### `kuate phase`

```bash
kuate phase K   # Knower    — analyse, contextualisation
kuate phase U   # Unifier   — agregation, planification
kuate phase A   # Architect — conception, securite
kuate phase T   # Transformer — execution, generation de code
kuate phase E   # Evaluator  — tests, QA, documentation
```

Boucle interactive : agent → tache → reponse IA streamee → sauvegarde fichiers → note memoire → continuer.

---

### `kuate run`

```bash
kuate run --agent <id> --task "<description>"
```

---

### `kuate conseil`

```bash
kuate conseil \
  --agents "<id1>,<id2>,<id3>" \
  --topic "<votre question>" \
  [--save]
```

---

### `kuate config`

```bash
kuate config show       # Configuration actuelle
kuate config ai         # Configurer le provider IA
```

---

### `kuate build`

```bash
kuate build --target <cible>
# cibles : claude | chatgpt | gemini | cursor | copilot | pack
```

---

### `kuate doctor`

```bash
kuate doctor
# Diagnostic complet : Node, npm, .kuate/, config, agents, contexte
```

---

## 16 — Agents par cas d'usage

| Situation | Agent recommande | Phase |
|-----------|-----------------|-------|
| Analyser les besoins utilisateurs | `business-analyst` | K |
| Evaluer la faisabilite financiere | `expert-finance-tech` | K |
| Planifier le projet | `chef-projet` | U |
| Animer un sprint Agile | `coach-agile` | U |
| Appliquer le Lean | `expert-lean` | U |
| Concevoir l'architecture | `architecte-solution` | A |
| Auditer la securite (OWASP) | `expert-securite` | A |
| Creer un curriculum de formation | `concepteur-pedagogique` | A |
| Concevoir une formation | `createur-formation` | A |
| Ecrire du code propre (TDD) | `dev-senior` | T |
| Mettre en place CI/CD | `expert-devops` | T |
| Faire une revue de code | `tech-lead` | T |
| Integrer un modele IA/ML | `expert-ia-ml` | T |
| Creer du contenu editorial | `social-media-strategist` | T |
| Creer des contenus pedagogiques | `createur-contenu-educatif` | T |
| Tutorer des apprenants | `tuteur-ia` | T |
| Definir une strategie de tests | `qa-strategist` | E |
| Optimiser les performances | `expert-performance` | E |
| Ecrire la documentation technique | `copywriter-technique` | E |
| Optimiser le referencement | `expert-seo` | E |
| Evaluer les competences | `evaluateur-competences` | E |

---

## 17 — Problemes courants

**"Aucun projet KUATE trouve"**

Vous n'etes pas dans un dossier initialise par `kuate init`. Verifiez que `.kuate/config.yaml` existe dans le dossier courant.

```bash
ls .kuate/
# config.yaml  agents/  context/
```

**"IA non configuree — Lancez kuate config ai"**

Les commandes `kuate phase` et `kuate run` necessitent une cle API. Configurez-la :

```bash
kuate config ai
```

**"Aucun agent de phase X installe"**

L'agent correspondant n'est pas dans les domaines selectionnes lors de `kuate init`. Verifiez :

```bash
kuate agent list
```

Si des agents manquent, reinitilalisez dans un nouveau dossier avec plus de domaines.

**"Analyse IA echouee"**

- Verifiez que la cle API est valide et a du credit
- Testez avec `kuate config show` pour voir le provider configure
- Reconfigurez avec `kuate config ai`

**Build TypeScript echoue**

```bash
npm run build
```

Relancez depuis la racine du depot. Si des erreurs persistent, verifiez `node --version` (>= 20 requis).

**"Missing helper: eq"**

Version de build obsolete. Relancez `npm run build` depuis la racine.

---

## Annexe — Structure generee dans le projet

```
.kuate/
├── config.yaml           Methodologie, langue, agents actifs
├── agents/               Un fichier .md par agent (prompt pret a l'emploi)
│   ├── architecte-solution.md
│   ├── dev-senior.md
│   ├── expert-devops.md
│   └── ...
└── context/
    ├── memory.md          Log chronologique des decisions
    ├── architecture.md    Choix techniques et rationale
    ├── business.md        Contexte metier et stakeholders
    ├── constraints.md     Contraintes non-negociables
    └── glossary.md        Termes specifiques au projet

KUATE.md                  Contexte maitre — a partager avec Claude
```

---

**KUATE JOEL PARFAIT — Methode KUATE v1.3.0 — 2026**  
[linkedin.com/in/joelparfaitkuate](https://www.linkedin.com/in/joelparfaitkuate/)
