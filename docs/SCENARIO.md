# Scénario Concret — Méthode KUATE en Action

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

**Le wizard demande :**

```
◆─○─○─○─○  1/5   Nom du projet ?
> LexiFlow

●─◆─○─○─○  2/5   Langue de travail ?
> Français

●─●─◆─○─○  3/5   Méthodologie ?
> Agile / Scrum   (sprints, backlog, vélocité)

●─●─●─◆─○  4/5   Domaines d'agents à installer ?
> Dev + Business + Contenu   (19 agents)

💡 Génération IA du contexte projet
   Stockée dans ~/.kuate/global.json (non versionnée)

●─●─●─●─◆  5/5   Configurer un provider IA maintenant ?
> Oui
   Provider : Claude (Anthropic)
   Clé API : **********************
   Modèle  : claude-haiku-4-5-20251001

✓ 19 agents générés
✓ Contexte IA généré — 5 fichiers enrichis
```

**Résultat dans `.kuate/` :**

```
.kuate/
├── config.yaml
├── agents/
│   ├── architecte-solution.md
│   ├── dev-senior.md
│   ├── expert-securite.md
│   ├── business-analyst.md
│   ├── chef-projet.md
│   ├── copywriter-technique.md
│   └── ... (13 autres)
└── context/
    ├── architecture.md   ← généré par IA avec stack Next.js + contraintes RGPD
    ├── business.md       ← objectif SaaS B2B, contexte PME juridique
    ├── constraints.md    ← RGPD, hébergement EU, budget 600€/mois
    ├── glossary.md       ← Contrat, Clause, Avenant, Signataire...
    └── memory.md         ← Décision initiale : Agile choisi pour itérations rapides
```

---

## Phase K — Knower · Découvrir & Contextualiser

**Objectif :** Comprendre le domaine juridique, cartographier les besoins, identifier les risques réglementaires.

### Session 1 — Analyse des besoins avec business-analyst

```bash
kuate agent use business-analyst
# → copie le prompt dans le presse-papier
```

**Coller dans Claude + contexte mémoire :**

```bash
kuate memory inject
```

```
[CONTEXTE KUATE — LexiFlow]
Méthode: agile | Langue: FR | Agents: 19

ARCHITECTURE: Stack Next.js 14, PostgreSQL 15, Stripe. Rationale: SSR natif...
BUSINESS: Objectif réduire temps de traitement contrats PME de 60%...
CONSTRAINTS: RGPD strict, données France, budget infra < 600€/mois...
GLOSSARY: Contrat: document juridique liant deux parties...
MEMORY: Décision: Agile choisi pour itérations rapides avec retours juriste...

[FIN CONTEXTE]
```

**Prompt collé à Claude avec ce contexte → l'agent business-analyst analyse :**
- User stories pour 3 types d'utilisateurs : juriste, DG PME, assistant administratif
- 47 exigences fonctionnelles priorisées (MoSCoW)
- Carte des risques RGPD : données personnelles dans les contrats (noms, adresses, RIB)

**Résultat → sauvegarder dans la mémoire :**

```bash
kuate memory add --section business
# → "47 user stories collectées. Risque RGPD majeur : RIB et données bancaires dans contrats."
```

### Session 2 — Analyse financière avec expert-finance-tech

```bash
kuate agent use expert-finance-tech
kuate memory inject
```

**Claude avec ce profil calcule :**
- Pricing : 49€/mois (starter 5 users) → 199€/mois (pro 20 users) → 599€/mois (enterprise)
- Break-even à 87 clients → 14 mois
- ROI client moyen : 8h/semaine économisées × 60€/h = 480€/mois économisés

```bash
kuate memory add --section business
# → "Pricing validé : 49/199/599€. Break-even 14 mois. ROI client 480€/mois."
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
kuate agent use architecte-solution
kuate memory inject
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

### Session 6 — Sprint 1 avec dev-senior

```bash
kuate agent use dev-senior
kuate memory inject
```

**Prompt : "Implémenter le système d'authentification et RBAC pour LexiFlow"**

L'agent génère :
- Structure Prisma schema (User, Organization, Role, Permission)
- Middleware Next.js pour RBAC
- Tests d'intégration Vitest pour chaque rôle
- Hook `usePermission()` côté client

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
kuate agent use qa-strategist
kuate memory inject
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
kuate agent use copywriter-technique
kuate memory inject
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
# Initialiser avec IA
kuate init

# Injecter le contexte dans une session IA
kuate memory inject

# Utiliser un agent spécialisé
kuate agent use <nom-agent>

# Session multi-experts sur un sujet
kuate conseil --agents "agent1,agent2" --topic "..." --save

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
