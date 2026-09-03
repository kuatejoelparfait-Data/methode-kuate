# Scénario Concret — Méthode KUATE en Action

> Version 1.3.0 — Ce scénario utilise le cycle complet : `kuate phase`, `kuate run`, `kuate conseil`

**Projet : LexiFlow** — Plateforme SaaS B2B de gestion de contrats juridiques pour PME  
**Équipe :** 1 CTO (décideur), 2 devs seniors, 1 designer UX, 1 juriste  
**Stack cible :** Next.js 14, PostgreSQL 15, Stripe, hébergement EU  
**Contraintes :** RGPD strict, données hébergées France, budget infra < 600€/mois  
**Timeline :** MVP en 4 mois, puis itérations trimestrielles  

---

## Étape 0 — Installation et initialisation

```bash
git clone https://github.com/kuatejoelparfait-Data/methode-kuate.git
cd methode-kuate
npm install
```

```bash
cd ~/projets/lexiflow
kuate init
```

**Le wizard (6 étapes) :**

```
◆─○─○─○─○─○  1/6   Nom du projet ?
> LexiFlow

●─◆─○─○─○─○  2/6   Langue de travail ?
> Français

●─●─◆─○─○─○  3/6   Méthodologie ?
> Agile / Scrum   (sprints, backlog, vélocité)

  📋 Description du projet
  Cette description servira à sélectionner les agents pertinents
  et à générer le fichier KUATE.md du projet.

●─●─●─◆─○─○  4/6   Décris le projet en quelques phrases :
> Plateforme SaaS B2B de gestion de contrats juridiques pour PME.
  Stack Next.js 14 + PostgreSQL. Hébergement France, RGPD strict.
  Signature électronique, workflow de validation, intégration CRM.

  💡 Provider IA — clé stockée dans ~/.kuate/global.json (non versionnée)

●─●─●─●─◆─○  5/6   Configurer un provider IA ?
> Oui
   Provider : Claude (Anthropic)
   Clé API : ****************************
   Modèle  : claude-haiku-4-5-20251001

  ✓ IA configurée

●─●─●─●─●─◆  6/6   Comment sélectionner les agents ?
> ✨ Décrire le projet    (description pré-remplie depuis l'étape 4)

  Analyse IA du projet et sélection des agents...

  ✓ 14 agents sélectionnés par l'IA

  Raisonnement IA : Ce projet SaaS juridique nécessite une équipe solide
  en architecture backend (RGPD), sécurité, gestion de projet Agile,
  analyse métier juridique et documentation technique...

  Agents sélectionnés :
    ◆ business-analyst          [K] business
    ◆ expert-finance-tech       [K] business
    ◆ chef-projet               [U] business
    ◆ coach-agile               [U] business
    ◆ architecte-solution       [A] dev
    ◆ expert-securite           [A] dev
    ◆ dev-senior                [T] dev
    ◆ tech-lead                 [T] dev
    ◆ expert-devops             [T] dev
    ◆ expert-ia-ml              [T] dev
    ◆ qa-strategist             [E] dev
    ◆ expert-performance        [E] dev
    ◆ copywriter-technique      [E] content
    ◆ expert-seo                [E] content

  Valider cette sélection ?
  > Oui — utiliser ces agents

✓ 14 agents générés
✓ Contexte IA généré — 5 fichiers enrichis
✓ KUATE.md généré — contexte maître du projet
```

**Résultat dans le projet :**

```
.kuate/
├── config.yaml
├── agents/                    ← 14 agents sélectionnés par l'IA
│   ├── architecte-solution.md
│   ├── dev-senior.md
│   ├── expert-securite.md
│   ├── business-analyst.md
│   ├── chef-projet.md
│   ├── copywriter-technique.md
│   └── ... (8 autres)
└── context/
    ├── architecture.md    ← IA : stack Next.js + contraintes RGPD
    ├── business.md        ← IA : objectif SaaS B2B, contexte PME juridique
    ├── constraints.md     ← IA : RGPD, hébergement EU, budget 600€/mois
    ├── glossary.md        ← IA : Contrat, Clause, Avenant, Signataire...
    └── memory.md          ← IA : Décision initiale Agile

KUATE.md                   ← Contexte maître — partagez avec Claude
```

---

## Phase K — Knower · Découvrir & Contextualiser

**Objectif :** Comprendre le domaine juridique, cartographier les besoins, identifier les risques réglementaires.

```bash
kuate phase K
```

```
  [ K ] Knower — Découvrir & Contextualiser
  3 agent(s) disponible(s) · Claude / claude-haiku-4-5-20251001

  Quel agent pour cette tâche ?
  > business-analyst

  Décris la tâche :
  > Analyser les besoins d'une plateforme de gestion de contrats juridiques B2B

  ◆ business-analyst en cours...
  ─────────────────────────────────────────────────────

  [réponse IA streamée en temps réel...]

  En tant que Business Analyst spécialisé...

  ## User Stories — LexiFlow

  ### Juriste (utilisateur principal)
  - US-01 : En tant que juriste, je veux créer un modèle de contrat...
  - US-02 : En tant que juriste, je veux envoyer un contrat en signature...
  ...47 user stories au total

  ## Risques RGPD identifiés
  - 🔴 CRITIQUE : RIB et données bancaires dans les annexes de contrats
  - 🟠 ÉLEVÉ : Signatures électroniques → données biométriques (eIDAS)
  - 🟡 MOYEN : Logs d'accès aux contrats → données de connexion personnelles

  ─────────────────────────────────────────────────────

  2 fichier(s) détecté(s) :
    docs/user-stories.md
    docs/risks-rgpd.md

  Sauvegarder ces fichiers ? [Oui]
  ✓ docs/user-stories.md
  ✓ docs/risks-rgpd.md

  Note mémoire ? > 47 user stories. Risque RGPD critique : RIB dans annexes.
  ✓ Mémorisé dans .kuate/context/memory.md

  Continuer en phase K avec un autre agent ? [Oui]

  Quel agent ? > expert-finance-tech
  Tâche ? > Calculer le pricing et ROI pour LexiFlow SaaS B2B

  [réponse IA...]
  → Pricing : 49€ / 199€ / 599€/mois
  → Break-even : 87 clients → 14 mois
  → ROI client : 480€/mois économisés

  Note mémoire ? > Pricing validé 49/199/599€. Break-even 14 mois.

  Continuer en phase K ? [Non]

  Phase suivante : [ U ] Unifier — Agréger & Synthétiser
  Lancez : kuate phase U
```

---

## Phase U — Unifier · Agréger & Synthétiser

**Objectif :** Structurer le backlog, définir les sprints, aligner l'équipe.

### Session 3 — Planification Agile avec chef-projet + coach-agile

```bash
kuate workflow list --phase U
```

```
  Workflows disponibles — Phase U (Unifier)
  ──────────────────────────────────────────
  ● sprint-planning        Planification de sprint (Story Points, vélocité)
  ● backlog-grooming       Affinage du backlog produit
  ● sprint-retrospective   Rétrospective d'équipe
  ● okr-definition         Définition des OKR trimestriels
```

```bash
kuate workflow show sprint-planning
```

**Session multi-agents (conseil) :**

```bash
kuate conseil \
  --agents "chef-projet,coach-agile,business-analyst" \
  --topic "Découper le MVP LexiFlow en sprints de 2 semaines sur 4 mois" \
  --save
```

**Les 3 experts IA se prononcent sur le découpage → sauvegardé dans architecture.md**

**Résultat : 8 sprints définis**

| Sprint | Objectif | Livrable |
|--------|----------|----------|
| S1-S2 | Auth + gestion utilisateurs | Login, RBAC, invitations |
| S3-S4 | Création et stockage contrats | Éditeur, upload PDF, versioning |
| S5-S6 | Signature électronique | Intégration Yousign, workflow validation |
| S7-S8 | Tableaux de bord + facturation | Analytics, Stripe, exports |

```bash
kuate memory add --section memory
# → "Découpage 8 sprints validé équipe. Vélocité initiale estimée 34 pts/sprint."
```

---

## Phase A — Architect · Concevoir & Structurer

**Objectif :** Définir l'architecture technique, les choix de sécurité, les interfaces.

### Session 4 — Architecture avec architecte-solution

```bash
kuate run --agent architecte-solution \
  --task "Concevoir l'architecture complète de LexiFlow : stack, BDD, auth, stockage, signature, paiement"
```

**L'agent conçoit :**

```
Architecture proposée :
├── Frontend : Next.js 14 App Router + Tailwind + Shadcn UI
├── Backend  : Next.js API Routes + Prisma ORM
├── Base de données : PostgreSQL 15 (Neon.tech — EU West)
├── Auth : Clerk (RGPD-compliant, datacenter EU)
├── Storage : Scaleway Object Storage (Paris)
├── Signature : Yousign API (certifié eIDAS)
├── Paiement : Stripe (PCI-DSS Level 1)
└── Deploy : Vercel Edge (EU)
```

```bash
kuate memory add --section architecture
# → "Stack validée : Next.js 14 + Prisma + Neon EU + Clerk + Yousign + Stripe"
```

### Session 5 — Audit sécurité avec expert-securite

```bash
kuate conseil \
  --agents "expert-securite,architecte-solution" \
  --topic "Threat modeling LexiFlow : données juridiques sensibles, RGPD, eIDAS" \
  --save
```

**Résultat :**
- Chiffrement AES-256 des contrats au repos
- Audit logs immuables (toute action sur un contrat tracée)
- DPIA (Data Protection Impact Assessment) obligatoire avant prod
- Rate limiting strict sur l'API de signature

```bash
kuate memory add --section constraints
# → "DPIA obligatoire. Chiffrement AES-256 requis. Audit logs immuables."
```

---

## Phase T — Transformer · Exécuter & Restructurer

**Objectif :** Implémenter, livrer les sprints, adapter au feedback.

### Session 6 — Sprint 1 avec dev-senior via `kuate phase T`

```bash
kuate phase T
```

```
  [ T ] Transformer — Exécuter & Restructurer
  7 agent(s) disponible(s)

  Quel agent ? > dev-senior
  Tâche ? > Implémenter le système d'authentification et RBAC pour LexiFlow avec Clerk

  ◆ dev-senior en cours...
  ─────────────────────────

  [code généré en streaming...]

  4 fichier(s) détecté(s) :
    prisma/schema.prisma
    src/middleware.ts
    src/hooks/usePermission.ts
    src/lib/auth.ts

  Sauvegarder ? [Oui]
  ✓ prisma/schema.prisma
  ✓ src/middleware.ts
  ✓ src/hooks/usePermission.ts
  ✓ src/lib/auth.ts

  Note mémoire ? > Auth RBAC implémentée avec Clerk. 4 rôles : owner, admin, editor, viewer.
```

### Session 7 — Sprint 3 avec dev-senior + expert-ia-ml

```bash
kuate conseil \
  --agents "dev-senior,expert-ia-ml" \
  --topic "Extraction automatique des clauses clés dans les contrats PDF uploadés" \
  --save
```

**Résultat :** Pipeline Claude API pour extraction de clauses → 94% de précision sur le jeu de test

```bash
kuate memory add --section architecture
# → "Claude API intégré pour extraction clauses. Model: claude-haiku. Cost: ~0.002$/contrat."
```

### Session 8 — DevOps avec expert-devops

```bash
kuate agent use expert-devops
kuate memory inject
```

**L'agent configure :**
- GitHub Actions : lint → test → build → deploy Vercel
- Environment secrets séparés (staging / prod)
- Monitoring Sentry + Datadog APM
- Backup PostgreSQL quotidien → Scaleway S3 chiffré

---

## Phase E — Evaluator · Évaluer & Valider

**Objectif :** Tester la qualité, documenter, préparer le lancement.

### Session 9 — Stratégie QA avec qa-strategist

```bash
kuate run --agent qa-strategist \
  --task "Plan de test LexiFlow : signature eIDAS, RGPD, RBAC, audit logs, performance 500 users"
```

**Plan de test basé sur les risques :**

```
Criticité HAUTE (tests obligatoires avant release) :
├── Signature électronique : valeur légale eIDAS
├── Chiffrement données : conformité RGPD
├── RBAC : isolation entre organisations
└── Audit logs : intégrité et immuabilité

Criticité MOYENNE :
├── Performance : < 2s chargement contrat PDF
├── Export PDF : rendu fidèle
└── Notifications email : délivrabilité

Tests de charge : 500 utilisateurs simultanés
```

### Session 10 — Documentation avec copywriter-technique

```bash
kuate run --agent copywriter-technique \
  --task "Générer la documentation API REST OpenAPI 3.0 + guide utilisateur LexiFlow"
```

**Génère :**
- Guide utilisateur (juriste, DG, assistant)
- Documentation API REST (OpenAPI 3.0)
- README développeur
- Politique de confidentialité RGPD

### Export final pour toutes les plateformes IA

```bash
# Export Claude
kuate build --target claude
# → génère CLAUDE.md avec tous les agents + contexte projet

# Export Cursor (pour les devs)
kuate build --target cursor
# → génère .cursorrules avec règles de code LexiFlow

# Pack partageable (onboarding nouveaux membres)
kuate build --target pack
# → génère lexiflow-kuate-pack.zip
```

---

## Bilan — Ce que la Méthode KUATE a apporté

| Sans KUATE | Avec KUATE |
|-----------|------------|
| Contexte réexpliqué à chaque session IA | `kuate memory inject` → contexte injecté en 2s |
| Agents IA génériques sans rôle | 19 experts spécialisés, prompts calibrés pour LexiFlow |
| Décisions perdues entre sessions | Toutes tracées dans `.kuate/context/memory.md` |
| Méthodologie improvisée | Agile structuré, 8 sprints définis, workflows guidés |
| Onboarding nouveau dev : 2 jours | `kuate build --target pack` → contexte complet en 1 fichier |

**Mémoire accumulée sur 4 mois :**
```bash
kuate memory show
```
```
  ● memory          23 lignes   Décision: Agile choisi pour... Claude API intégré...
  ● architecture    41 lignes   Stack: Next.js 14 + Prisma + Neon EU + Yousign...
  ● business        38 lignes   47 user stories. Pricing validé: 49/199/599€...
  ● constraints     19 lignes   DPIA obligatoire. AES-256. Audit logs immuables...
  ● glossary        12 lignes   Contrat, Clause, Avenant, Signataire, DPIA...
```

---

## Commandes clés de ce scénario

```bash
# Initialiser avec IA (wizard 5 étapes + config Claude/OpenAI)
kuate init

# Cycle complet par phase — IA génère du code dans votre projet
kuate phase K    # Analyse, user stories, risques
kuate phase U    # Backlog, sprints, planification
kuate phase A    # Architecture, sécurité, schémas
kuate phase T    # Génération de code — fichiers sauvegardés dans le projet
kuate phase E    # Tests, QA, documentation

# Exécuter un agent sur une tâche précise
kuate run --agent dev-senior --task "créer l'API de signature avec Yousign"
kuate run --agent expert-securite --task "audit OWASP du module auth"

# Session multi-experts sur un sujet complexe
kuate conseil --agents "architecte-solution,expert-securite" --topic "..." --save

# Voir les workflows d'une phase
kuate workflow list --phase K|U|A|T|E

# Ajouter une décision à la mémoire
kuate memory add --section memory|architecture|business|constraints|glossary

# Exporter pour votre outil IA préféré
kuate build --target claude|cursor|chatgpt|gemini|copilot|pack

# Diagnostic complet
kuate doctor
```

---

*Méthode KUATE — KUATE JOEL PARFAIT · [linkedin.com/in/joelparfaitkuate](https://www.linkedin.com/in/joelparfaitkuate/)*
