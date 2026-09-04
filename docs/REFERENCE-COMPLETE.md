# Référence Complète — Méthode KUATE

**Auteur : KUATE JOEL PARFAIT**  
**Version : 1.3.0**

> Toutes les commandes, workflows, phases, agents, et analyse de navigation.
> Chaque entrée de menu a un chemin de retour. Chaque commande converge vers le pipeline.

---

## Sommaire

1. [Vue d'ensemble — flux de la méthode](#1--vue-densemble)
2. [Toutes les commandes](#2--toutes-les-commandes)
3. [Pipeline principal kuate projet](#3--pipeline-principal)
4. [Phases détaillées K U A T E + Dev](#4--phases-détaillées)
5. [Agents disponibles par domaine](#5--agents-disponibles)
6. [Workflows par phase](#6--workflows-par-phase)
7. [Orchestration multi-agents](#7--orchestration-multi-agents)
8. [Navigation — analyse des chemins](#8--navigation--analyse-des-chemins)
9. [Points d'entrée — depuis n'importe où](#9--points-dentrée)
10. [Référence des fichiers générés](#10--référence-des-fichiers)

---

## 1 — Vue d'ensemble

```
INSTALLATION        CONFIGURATION       INITIALISATION
kuate doctor   →    kuate config ai  →  kuate init
                                              ↓
                    ┌─────────────────────────────────────────────────┐
                    │            PIPELINE KUATE PROJET                │
                    │                                                 │
                    │  K ──── U ──── A ──── T ──── E ──── Dev        │
                    │  specs  back  archi   code   qual  localhost   │
                    └─────────────────────────────────────────────────┘
                              ↕ (entree a n'importe quelle phase)
           ┌──────────────────────────────────────────────────────────┐
           │                  OUTILS ANNEXES                          │
           │  kuate phase <K|U|A|T|E>   session guidee par phase     │
           │  kuate next                suggestions IA contextuelles  │
           │  kuate run                 agent direct sur une tache    │
           │  kuate conseil             multi-agents sur un sujet     │
           │  kuate memory              memoire persistante           │
           │  kuate agent               gestion des agents            │
           │  kuate build               export multi-plateformes      │
           └──────────────────────────────────────────────────────────┘
```

---

## 2 — Toutes les commandes

### Installation & Diagnostic

| Commande | Description | Sortie |
|----------|-------------|--------|
| `kuate --version` | Version installée | `1.3.0` |
| `kuate --help` | Aide complète | liste des commandes |
| `kuate doctor` | Diagnostic Node, config, agents | rapport d'état |
| `kuate config show` | Config du projet courant | methodologie, domaine, langue |
| `kuate config ai` | Configurer le provider IA | `~/.kuate/global.json` mis à jour |

### Pipeline principal

| Commande | Description | Sortie |
|----------|-------------|--------|
| `kuate init` | Wizard 6 étapes — initialise KUATE dans le projet | `.kuate/`, `KUATE.md` |
| `kuate projet` | Pipeline K→U→A→T→E complet | tous les livrables |
| `kuate projet --from K` | Reprendre depuis Phase K | `docs/specs.md` |
| `kuate projet --from U` | Reprendre depuis Phase U | `docs/backlog.md` |
| `kuate projet --from A` | Reprendre depuis Phase A | `docs/architecture.md` |
| `kuate projet --from T` | Reprendre depuis Phase T | code source |
| `kuate projet --from E` | Reprendre depuis Phase E | `docs/evaluation.md` |
| `kuate dev` | Application en local : install + tests + serveur + agents | appli sur localhost |

### Sessions guidées par phase

| Commande | Agent principal | Livrable |
|----------|----------------|---------|
| `kuate phase K` | business-analyst | `docs/specs.md` |
| `kuate phase U` | chef-projet | `docs/backlog.md` |
| `kuate phase A` | architecte-solution | `docs/architecture.md` |
| `kuate phase T` | dev-senior, tech-lead | code source (autonome ou interactif) |
| `kuate phase E` | tech-lead | `docs/evaluation.md` |

### Agents

| Commande | Description |
|----------|-------------|
| `kuate agent list` | Liste tous les agents disponibles (installés + catalogue) |
| `kuate agent info <nom>` | Fiche complète d'un agent (role, phase, domaine) |
| `kuate agent use <nom>` | Copie le prompt dans le presse-papier |

### Exécution directe

| Commande | Description | Exemple |
|----------|-------------|---------|
| `kuate run --agent <nom> --task "<texte>"` | Agent sur une tache précise | `kuate run --agent dev-senior --task "Genere src/routes/stats.ts"` |
| `kuate conseil --agents <a,b> --topic "<texte>"` | Session multi-agents | `kuate conseil --agents architecte-solution,expert-securite --topic "Auth JWT ou OAuth"` |
| `kuate conseil --agents <a,b> --topic "<texte>" --save` | Multi-agents + sauvegarde dans architecture.md | |
| `kuate next` | Suggestions IA de la prochaine action | liste priorisée |

### Mémoire

| Commande | Description |
|----------|-------------|
| `kuate memory show` | Affiche toute la mémoire projet |
| `kuate memory show --section architecture` | Affiche une section |
| `kuate memory add --section business` | Ajoute une entrée dans la mémoire |
| `kuate memory inject` | Génère un bloc contexte à coller dans une IA |
| `kuate memory seed` | Wizard pour remplir la mémoire dès le départ |

### Workflows

| Commande | Description |
|----------|-------------|
| `kuate workflow list` | Liste tous les workflows disponibles |
| `kuate workflow list --phase T` | Workflows filtrés par phase |
| `kuate workflow show <nom>` | Détail d'un workflow |

### Export

| Commande | Description |
|----------|-------------|
| `kuate build --target claude` | Export agents pour Claude Projects |
| `kuate build --target chatgpt` | Export agents pour GPT |
| `kuate build --target cursor` | Export pour Cursor |
| `kuate build --target copilot` | Export pour GitHub Copilot |
| `kuate build --target pack` | Archive ZIP de tous les agents |

---

## 3 — Pipeline principal

```bash
kuate projet [--from K|U|A|T|E]
```

### Séquence complète

```
1. Tracker affiché : [ K ] ── [ U ] ── [ A ] ── [ T ] ── [ E ]

2. Phase K — business-analyst génère docs/specs.md
   ↓ Proposer : Continuer | Exporter | Arrêter

3. Phase U — chef-projet génère docs/backlog.md
   ↓ Proposer : Continuer | Exporter | Arrêter

4. Phase A — architecte-solution génère docs/architecture.md
   ↓ Proposer : Continuer | Exporter | Arrêter

5. Phase T — mode :
   a. Autonome : planProjectTasks → loop generate → save → review → fix
   b. Export : .claude/AGENTS.md | .cursor/rules/ | KUATE-context.md
   ↓ Proposer : Continuer vers E | Exporter | Terminer

6. Phase E — tech-lead génère docs/evaluation.md
   ↓ Proposer : Lancer kuate dev | Terminer

7. kuate dev :
   npm install → prisma migrate → tests → fix agents → serveur → terminal agents
```

### Export vers outils externes (depuis Phase T ou E)

| Outil | Fichier généré | Usage |
|-------|---------------|-------|
| Claude Code | `.claude/AGENTS.md` + `KUATE-context.md` | `claude` dans le dossier |
| Cursor / Windsurf | `.cursor/rules/kuate.md` | Ouvrir le dossier dans Cursor |
| Codex CLI | `KUATE-context.md` | `codex --context KUATE-context.md "..."` |
| Universel | `KUATE-context.md` | Copier-coller dans n'importe quel LLM |

---

## 4 — Phases détaillées

### Phase K — Knower

- **Agent :** `business-analyst` (fallback : `expert-finance-tech`, `expert-communication`)
- **Input :** description du projet (KUATE.md + `.kuate/context/business.md`)
- **Output :** `docs/specs.md`
- **Contenu généré :**
  - Objectif et valeur du projet
  - Personas et segments utilisateurs
  - User stories (min. 8, format standard)
  - Critères d'acceptation
  - Contraintes techniques
  - Hors scope MVP
  - Découpage KUATE par phase

### Phase U — Unifier

- **Agent :** `chef-projet` (fallback : `coach-agile`, `stratege-okr`)
- **Input :** `docs/specs.md`
- **Output :** `docs/backlog.md`
- **Contenu généré :**
  - Backlog MoSCoW (Must / Should / Could / Won't)
  - Définition du MVP
  - Sprints avec objectifs démontrables
  - Top 3 risques + mitigation
  - Dépendances et ordre de développement

### Phase A — Architect

- **Agent :** `architecte-solution` (fallback : `expert-securite`, `tech-lead`)
- **Input :** `docs/specs.md` + `docs/backlog.md`
- **Output :** `docs/architecture.md`
- **Contenu généré :**
  - Stack technique avec justifications
  - Modèle de données (entités, relations, schéma Prisma)
  - API (endpoints, méthodes, réponses)
  - Sécurité OWASP
  - Arborescence de fichiers cible
  - Décisions d'architecture (alternatives écartées)

### Phase T — Transformer

- **Agents :** `dev-senior`, `tech-lead`, `expert-devops`, `expert-ia-ml`
- **Input :** `docs/specs.md` + `docs/backlog.md` + `docs/architecture.md`
- **Output :** code source dans `src/`, `prisma/`, fichiers de config
- **Mode autonome :**
  1. `planProjectTasks()` : 5-12 tâches ordonnées avec agent assigné
  2. Pour chaque tâche : `runAgent()` → streaming → `detectFilesInOutput()` → save
  3. `reviewCodeOutput()` : validation tech-lead → fix si besoin (max 2 tentatives)
  4. `logMemory()` : journal de chaque tâche
- **Mode interactif :** session libre avec l'agent choisi

### Phase E — Evaluator

- **Agent :** `tech-lead` (fallback : `expert-securite`, `coach-agile`)
- **Input :** tous les docs + code généré
- **Output :** `docs/evaluation.md`
- **Contenu généré :**
  - Checklist critères d'acceptation (OK / A TESTER / NON COUVERT)
  - Plan de tests (unitaires, intégration, E2E) avec code
  - Audit sécurité OWASP Top 10
  - Analyse performance et goulots d'étranglement
  - Dette technique identifiée
  - Rétrospective (points forts, points d'amélioration)
  - Recommandations v2

### Phase Dev — Application locale

- **Auto-détection :** npm/yarn/pnpm, port, commande test, commande dev
- **Étapes :**
  1. `npm install` (ou yarn/pnpm)
  2. `prisma generate` + `prisma migrate dev` si schema présent
  3. Vérification `.env`
  4. Exécution des tests (Jest / Vitest / Mocha)
  5. Boucle correction : agent lit erreur → corrige fichier → reteste (max 3)
  6. Démarrage serveur de dev (`npm run dev`)
  7. Terminal agents interactif
- **Terminal agents :** tâche libre → agent génère fichier → save → reteste → boucle

---

## 5 — Agents disponibles

### Domaine Développement

| ID | Nom | Phase | Rôle |
|----|-----|-------|------|
| `dev-senior` | Développeur Senior | T | Architecture code, patterns, bonnes pratiques |
| `tech-lead` | Tech Lead | T/E | Revues, architecture, qualité |
| `expert-devops` | Expert DevOps | T | CI/CD, Docker, déploiement |
| `expert-securite` | Expert Sécurité | A/E | OWASP, audit, hardening |
| `expert-ia-ml` | Expert IA/ML | T | Modèles, pipelines data |
| `tuteur-ia` | Tuteur IA | K | Pédagogie, documentation |

### Domaine Business

| ID | Nom | Phase | Rôle |
|----|-----|-------|------|
| `business-analyst` | Business Analyst | K | User stories, specs, exigences |
| `chef-projet` | Chef de Projet | U | Planning, backlog, risques |
| `architecte-solution` | Architecte Solution | A | Architecture technique |
| `coach-agile` | Coach Agile | U | Scrum, Kanban, retrospectives |
| `stratege-okr` | Stratège OKR | U | Objectifs, KPI, mesure |
| `expert-finance-tech` | Expert Finance Tech | K | Modèles économiques SaaS |
| `expert-communication` | Expert Communication | K | Messages, positioning |

### Domaine Contenu

| ID | Nom | Phase | Rôle |
|----|-----|-------|------|
| `redacteur-technique` | Rédacteur Technique | E | Documentation, guides |
| `expert-seo` | Expert SEO | K | Stratégie contenu, keywords |
| `community-manager` | Community Manager | K | Engagement, tone of voice |

### Domaine Education

| ID | Nom | Phase | Rôle |
|----|-----|-------|------|
| `tuteur-ia` | Tuteur IA | K | Pédagogie, conception cours |
| `ingenieur-pedagogique` | Ingénieur Pédagogique | A | Architecture formation |

---

## 6 — Workflows par phase

Les workflows sont des séquences d'actions prédéfinies disponibles via `kuate workflow`.

```bash
kuate workflow list --phase K    # workflows de découverte
kuate workflow list --phase T    # workflows de génération de code
kuate workflow list              # tous
```

Exemples de workflows disponibles :

| Workflow | Phase | Description |
|----------|-------|-------------|
| `discovery-interviews` | K | Guide d'entretiens utilisateurs |
| `user-story-mapping` | K | Atelier story mapping |
| `sprint-planning` | U | Cérémonie planning agile |
| `architecture-review` | A | Revue d'architecture en équipe |
| `code-review-checklist` | T | Checklist revue de code |
| `security-audit` | E | Audit sécurité systématique |
| `retrospective` | E | Atelier rétrospective |

---

## 7 — Orchestration multi-agents

### Mode autonome (Phase T)

L'IA orchestre plusieurs agents sur les tâches :

```
planProjectTasks()
  ↓
Tâche 1 → dev-senior (configuration)
Tâche 2 → dev-senior (modèle données)
Tâche 3 → dev-senior (API auth)
Tâche 4 → dev-senior (API factures)
Tâche 5 → tech-lead  (tests)
```

### Mode conseil (multi-agents simultanés)

```bash
kuate conseil \
  --agents architecte-solution,expert-securite,tech-lead \
  --topic "Choix entre microservices et monolithe modulaire" \
  --save
```

Chaque agent donne son point de vue, le résultat est sauvegardé dans
`.kuate/context/architecture.md`.

### Boucle de correction (Phase Dev)

```
runTests()
  ↓ échec
parseTestFailures() → liste des erreurs + fichiers
  ↓
runAgent(dev-senior, erreur + fichiers sources)
  ↓
detectFilesInOutput() → fichiers corrigés
  ↓
saveFiles()
  ↓
runTests() → si échec et < 3 tentatives → boucle
```

### Terminal agents interactif (Phase Dev)

```
while (user veut continuer) {
  choisir agent
  décrire tâche
  runAgent() → streaming → save fichiers
  relancer tests si souhaité
  agentFixLoop() si échec
}
```

---

## 8 — Navigation : analyse des chemins

**Principe :** chaque écran a un chemin de retour. Aucune impasse.

### Init (`kuate init`)

```
Etape 1 → ... → Etape 6
  ↓ (à tout moment)
Ctrl+C = annulation propre
  ↓ (fin)
Menu post-init :
  - Lancer le pipeline complet K→U→A→T   → kuate projet
  - Lancer une phase seule               → kuate phase <X>
  - Configuration avancee                → kuate config show
  - Quitter
  [Retour disponible sur chaque option]
```

Si le projet existe déjà : menu de reprise avec option "Quitter" en bas.

### Pipeline (`kuate projet`)

```
Phase K → [Continuer | Exporter | Arrêter]
Phase U → [Continuer | Exporter | Arrêter]
Phase A → [Continuer | Exporter | Arrêter]
Phase T → [Mode Autonome | Exporter | Retour]
          Mode Autonome → [Confirmer plan | Abandonner]
          Après T : [Continuer vers E | Exporter | Terminer]
Phase E → run automatique si choix "Continuer"
          Après E : [Lancer kuate dev | Terminer]
kuate dev → [Tests | Serveur | Les deux | Annuler]
            Tests : [Corriger avec agent | Continuer]
            Terminal agents : [Agent | Tests | Redemarrer | Terminer]
```

Toutes les options de sélection ont une option "Retour" ou "Arrêter".
`Ctrl+C` est géré proprement à tous les niveaux (`p.isCancel`).

### Sessions guidées (`kuate phase X`)

```
Phase T → [Autonome | Supervisé | Interactif classique | Exporter | Retour]
  Autonome → [Confirmer plan | Abandonner]
  Supervisé → tâche par tâche avec [Continuer | Arrêter]
  Interactif → entrée vide = retour au menu

Phase K/U/A/E → session interactive directe
  Entrée vide = retour au menu principal
```

### kuate next

```
[Suggestions IA]
  → Choisir suggestion → [Choisir agent | Retour]
  → Décrire manuellement → [Choisir agent | Retour]
  → Nouvelles suggestions
  → Quitter
```

### kuate dev

```
[Vérification .env] → [Continuer quand même | Annuler]
[Installation] → [Continuer malgré erreur | Annuler]
[Démarrage] → [Tests | Serveur | Les deux | Annuler]
[Tests échoués] → [Corriger avec agent | Ignorer | Arrêter]
[Terminal agents] → [Agent | Tests | Redémarrer | Terminer]
  [Agent] → [Choisir agent | Retour]
           → Tâche → [entrée vide = retour]
```

### Points d'entrée universels — revenir au pipeline depuis n'importe où

```bash
kuate projet          # pipeline complet depuis la première phase manquante
kuate projet --from T # reprendre directement à une phase précise
kuate next            # suggestions pour la prochaine action
kuate dev             # lancer l'application si Phase T déjà faite
```

---

## 9 — Points d'entrée

### Nouveau projet

```bash
mkdir mon-projet && cd mon-projet && git init
kuate init
kuate projet
```

### Projet existant sans KUATE

```bash
cd mon-projet-existant
kuate init             # init sur projet existant — détecte et propose de reprendre
kuate memory seed      # remplir la mémoire avec le contexte existant
kuate next             # suggestions basées sur l'état du projet
```

### Reprendre un projet KUATE en cours

```bash
cd mon-projet
kuate config show      # voir l'état
kuate projet           # reprend depuis la première phase manquante
# ou
kuate next             # voir les suggestions prioritaires
```

### Ajouter une feature après le pipeline complet

```bash
kuate dev
# Terminal agents → Décrire la nouvelle feature → agent génère → tests
# ou
kuate run --agent dev-senior --task "Ajoute route GET /invoices/stats"
```

### Collaborer sur un sujet complexe

```bash
kuate conseil \
  --agents architecte-solution,expert-securite \
  --topic "Comment implémenter le multi-tenant ?" \
  --save
```

### Exporter vers outil externe à tout moment

```bash
kuate projet --from T
# Choisir "Exporter vers outil externe"
# → .claude/AGENTS.md | .cursor/rules/ | KUATE-context.md
```

---

## 10 — Référence des fichiers

### Fichiers du projet KUATE

| Fichier / Dossier | Rôle |
|-------------------|------|
| `KUATE.md` | Contexte maître du projet (nom, méthode, description, config IA) |
| `.kuate/config.json` | Configuration (project, method, domain, lang) |
| `.kuate/agents/*.md` | Prompts des agents installés |
| `.kuate/context/business.md` | Contexte métier |
| `.kuate/context/architecture.md` | Décisions d'architecture |
| `.kuate/context/constraints.md` | Contraintes techniques |
| `.kuate/context/glossary.md` | Glossaire du domaine |
| `.kuate/context/memory.md` | Journal chronologique des sessions |
| `~/.kuate/global.json` | Config globale (clé API, provider, modèle) — hors du projet |

### Livrables générés par le pipeline

| Fichier | Phase | Contenu |
|---------|-------|---------|
| `docs/specs.md` | K | User stories, critères, contraintes |
| `docs/backlog.md` | U | MoSCoW, sprints, risques |
| `docs/architecture.md` | A | Stack, modèle données, API, sécurité |
| `docs/evaluation.md` | E | Tests, audit OWASP, dette, rétro |
| `src/` | T | Code source complet |
| `.claude/AGENTS.md` | T (export) | Contexte pour Claude Code |
| `.cursor/rules/kuate.md` | T (export) | Contexte pour Cursor |
| `KUATE-context.md` | T (export) | Contexte universel |

---

*Tutoriels par phase : [docs/tutoriels/README.md](tutoriels/README.md)*  
*Tutoriel complet : [docs/TUTORIEL.md](TUTORIEL.md)*
