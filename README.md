# Methode KUATE

**CLI d'orchestration d'agents IA pour equipes structurees**

Auteur : KUATE JOEL PARFAIT — [LinkedIn](https://www.linkedin.com/in/joelparfaitkuate/)  
Licence : CC BY-NC-ND 4.0 — Usage personnel, partage autorise, modifications et usage commercial interdits  
Version : 1.0.0

---

## Presentation

Methode KUATE est un framework CLI open-source qui installe dans n'importe quel projet une methodologie structuree, des agents IA specialises et une memoire persistante. Il permet a Claude, ChatGPT, Gemini et Cursor de se comporter comme de veritables experts methodologiques.

Quatre differenciateurs principaux :

1. **Acronyme structurant** — 5 phases (K·U·A·T·E) forment la colonne vertebrale de toute la methode
2. **Moteur de methodologie** — les agents s'adaptent automatiquement a Agile, Lean, PMBOK, OKR, SAFe
3. **Memoire persistante** — contexte projet cumulatif reinjectable entre sessions IA
4. **Multilinguisme natif** — FR/EN, extensible par la communaute

---

## Les 5 phases KUATE

| Phase | Nom | Description |
|-------|-----|-------------|
| K | Connaitre | Discovery — comprendre le probleme, le domaine, les utilisateurs |
| U | Unifier | Planning — unifier les exigences en une vision coherente |
| A | Architecturer | Design — concevoir la solution technique |
| T | Transformer | Build — transformer le design en code fonctionnel |
| E | Evaluer | Deliver — tester, deployer, mesurer, iterer |

---

## Installation

**Prerequis :** Node.js >= 20, npm >= 9

```bash
git clone https://github.com/kuatejoelparfait-Data/methode-kuate.git
cd methode-kuate
npm install
```

C'est tout. Le `npm install` compile automatiquement tous les packages et rend la commande `kuate` disponible globalement sur votre machine.

```bash
kuate --version   # 1.0.0
kuate init        # lancer le wizard
```

---

## Demarrage rapide

```bash
# 1. Initialiser la methode dans votre projet
kuate init

# 2. Lister les agents disponibles
kuate agent list

# 3. Copier un prompt d'agent dans le presse-papier
kuate agent use architecte-solution

# 4. Voir les workflows par phase
kuate workflow list

# 5. Exporter pour Claude
kuate build --target claude

# 6. Injecter la memoire dans une session IA
kuate memory inject
```

---

## Commandes

### `kuate init`

Lance le wizard interactif pour initialiser la Methode KUATE dans le projet courant.

```
Wizard interactif :
  - Nom du projet
  - Langue de travail (fr | en)
  - Methodologie (agile | lean | pmbok | design-thinking | okr | safe | custom)
  - Domaines d'agents (dev | business | content | education)
```

Genere dans `.kuate/` :
- `config.yaml` — configuration du projet
- `agents/*.md` — prompts des agents selectionnes
- `context/*.md` — fichiers de memoire persistante

---

### `kuate agent`

```bash
kuate agent list              # Liste tous les agents installes
kuate agent use <nom>         # Copie le prompt dans le presse-papier
kuate agent info <nom>        # Fiche complete d'un agent
```

---

### `kuate workflow`

```bash
kuate workflow list                    # Liste les 27 workflows par phase
kuate workflow list --phase T          # Filtrer par phase (K|U|A|T|E)
kuate workflow show sprint-planning    # Fiche d'un workflow
```

---

### `kuate memory`

```bash
kuate memory show                          # Vue d'ensemble de la memoire
kuate memory show --section architecture   # Une section specifique
kuate memory add --section constraints     # Ajouter une entree
kuate memory inject                        # Generer un bloc contexte pour session IA
```

Sections disponibles : `memory`, `architecture`, `business`, `constraints`, `glossary`

---

### `kuate build`

Exporte les agents pour differentes plateformes IA.

```bash
kuate build --target claude     # Genere CLAUDE.md
kuate build --target chatgpt    # Genere chatgpt-instructions.json
kuate build --target gemini     # Genere gemini-gem.md
kuate build --target cursor     # Genere .cursorrules
kuate build --target copilot    # Genere .github/copilot-instructions.md
kuate build --target pack       # Genere un pack partageable
```

---

### `kuate conseil`

Mode multi-agents : plusieurs experts IA en simultane sur un sujet.

```bash
kuate conseil \
  --agents "architecte-solution,expert-securite,tech-lead" \
  --topic "Quelle architecture pour une app Next.js avec 100k utilisateurs ?" \
  --save
```

Genere un prompt structurant plusieurs experts autour du sujet, pret a etre colle dans Claude ou ChatGPT.

---

### `kuate doctor`

Diagnostic complet de l'installation.

```bash
kuate doctor
```

Verifie : version Node.js, npm, presence `.kuate/`, validite config, agents generes, contexte.

---

### `kuate config show`

Affiche la configuration courante du projet.

---

## Les 23 agents

### Dev Software (8 agents)

| ID | Phase | Description |
|----|-------|-------------|
| `architecte-solution` | A | Conception systemes, TOGAF-aware |
| `dev-senior` | T | Implementation TDD, clean code |
| `expert-devops` | T | CI/CD, Docker, Kubernetes |
| `expert-securite` | A | OWASP, threat modeling, audit |
| `qa-strategist` | E | Tests bases sur le risque |
| `tech-lead` | T | Revue de code, mentoring |
| `expert-performance` | E | Optimisation, Core Web Vitals |
| `expert-ia-ml` | T | Integration modeles IA, MLOps |

### Business et Strategie (6 agents)

| ID | Phase | Description |
|----|-------|-------------|
| `chef-projet` | U | PMBOK, jalons, risques |
| `coach-agile` | U | Scrum, Kanban, SAFe |
| `business-analyst` | K | Exigences, BDD, user stories |
| `expert-lean` | U | VSM, reduction gaspillages |
| `stratege-okr` | U | OKR, alignement, suivi |
| `expert-finance-tech` | K | Budget, ROI, business case |

### Creation de Contenu (5 agents)

| ID | Phase | Description |
|----|-------|-------------|
| `copywriter-technique` | E | Docs techniques, README, API |
| `expert-seo` | E | SEO, mots-cles, Core Web Vitals |
| `social-media-strategist` | T | Calendrier editorial, engagement |
| `expert-communication` | K | Relations presse, stakeholders |
| `createur-formation` | A | Curriculum, ADDIE |

### Formation et Pedagogie (4 agents)

| ID | Phase | Description |
|----|-------|-------------|
| `concepteur-pedagogique` | A | ADDIE, taxonomie de Bloom |
| `tuteur-ia` | T | Apprentissage personnalise |
| `evaluateur-competences` | E | Assessment, certifications |
| `createur-contenu-educatif` | T | Videos, cours, exercices |

---

## Les 7 methodologies supportees

| Methodologie | Workflows actives |
|---|---|
| `agile` | Sprint Planning, Backlog Grooming, Retrospective, Review |
| `lean` | Value Stream Mapping, Kaizen, 5S Digital |
| `pmbok` | Charte Projet, WBS, RACI, Rapport Avancement |
| `design-thinking` | Empathize, Define, Ideate, Prototype, Test |
| `okr` | OKR Definition, Weekly Check-in, Quarterly Review |
| `safe` | PI Planning, ART Sync, Solution Demo |
| `custom` | Definis par l'utilisateur |

---

## Structure generee dans le projet

```
.kuate/
|-- config.yaml           Methodologie, langue, agents actifs
|-- agents/               Un fichier .md par agent (prompt pret a l'emploi)
|   |-- architecte-solution.md
|   |-- dev-senior.md
|   `-- ...
`-- context/
    |-- memory.md         Log chronologique des decisions
    |-- architecture.md   Choix techniques et rationale
    |-- business.md       Contexte metier et stakeholders
    |-- constraints.md    Contraintes non-negociables
    `-- glossary.md       Termes specifiques au projet
```

---

## Architecture du monorepo

```
methode-kuate/
|-- packages/
|   |-- cli/              CLI principale (bin: kuate + methode-kuate)
|   |-- core/             Moteur de methodologie, sans UI
|   |-- agents-dev/       8 agents Dev Software
|   |-- agents-business/  6 agents Business et Strategie
|   |-- agents-content/   5 agents Creation de Contenu
|   `-- agents-education/ 4 agents Formation et Pedagogie
|-- templates/
|   `-- methodology/      agile.yaml, lean.yaml, pmbok.yaml, etc.
`-- docs/                 Specifications et plans
```

---

## Stack technique

- **Runtime** : Node.js 20+, TypeScript 5, ESM
- **CLI** : Commander.js, @clack/prompts, chalk, ora
- **Moteur** : Handlebars (templates), Zod (validation), yaml, fs-extra
- **Build** : tsup, npm workspaces
- **Tests** : vitest v2

---

## Licence

Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)

Copyright (c) 2026 KUATE JOEL PARFAIT  
[linkedin.com/in/joelparfaitkuate](https://www.linkedin.com/in/joelparfaitkuate/)

Voir le fichier [LICENSE](./LICENSE) pour les termes complets.
