# Phase T — Transformer : Génération du code

**Auteur : KUATE JOEL PARFAIT**

> Tutoriel 4/5 — Phase T : les agents génèrent le code source complet à partir des specs et de l'architecture.
> Précédent : [Phase A — Architecture](03-PHASE-A.md) | Suivant : [Phase E — Évaluation](05-PHASE-E.md)

---

## Rôle de la Phase T

**T = Transformer** — Transformer les specs et l'architecture en code réel.

L'IA planifie les tâches de développement, les exécute une par une,
et sauvegarde chaque fichier directement dans votre projet.

**Livrable :** code source dans `src/`, `prisma/`, fichiers de config

---

## Prérequis

- `docs/specs.md`, `docs/backlog.md`, `docs/architecture.md` présents
- Au moins un agent de développement installé : `dev-senior`, `tech-lead`, ou `expert-devops`

---

## Lancer la Phase T

```bash
kuate projet          # pipeline — arrive ici après Phase A
# ou
kuate phase T         # directement
# ou
kuate projet --from T # reprendre depuis Phase T si A déjà fait
```

---

## Choisir le mode

```
  Mode Phase T ?

  Autonome — les agents generent tout le code jusqu'a la fin
  Exporter vers Claude Code / Codex / Cursor
  Retour
```

---

## Mode 1 — Autonome

### Etape 1 : Planification automatique

L'IA lit vos 3 documents et génère un plan de développement ordonné :

```
  Planification des taches basees sur les specs et l'architecture...
  Plan genere — 8 taches

  Plan de developpement :

  1.  Configuration projet & package.json        dev-senior
      Genere le code de : src/index.ts, package.json, tsconfig.json,
      .env.example. Implémenter : Express setup, middleware global.

  2.  Schema Prisma & migrations                 dev-senior
      Genere le code de : prisma/schema.prisma. Implémenter : User,
      Company, Client, Invoice, InvoiceLine, enum InvoiceStatus.

  3.  Middleware auth JWT                        dev-senior
      Genere le code de : src/middleware/auth.ts, src/config/env.ts.
      Implémenter : verify JWT, extract userId, 401 si invalide.

  4.  Routes authentification                    dev-senior
      Genere le code de : src/routes/auth.ts, src/services/auth.service.ts.
      Implémenter : POST /auth/register, POST /auth/login, bcrypt, JWT.

  5.  CRUD clients                               dev-senior
      Genere le code de : src/routes/clients.ts, src/services/client.service.ts.
      Implémenter : GET /clients, POST /clients, GET /clients/:id, PUT, DELETE.

  6.  CRUD factures                              dev-senior
      Genere le code de : src/routes/invoices.ts, src/services/invoice.service.ts.
      Implémenter : CRUD complet, calcul totaux TTC, numérotation automatique.

  7.  Génération PDF                             dev-senior
      Genere le code de : src/services/pdf.service.ts.
      Implémenter : HTML template facture, Puppeteer → Buffer, route GET /pdf.

  8.  Tests unitaires fondamentaux               tech-lead
      Genere le code de : tests/auth.test.ts, tests/invoice.test.ts.
      Implémenter : Jest, describe/it, mocks Prisma.

  Lancer la generation avec ces 8 taches ? Oui
```

### Etape 2 : Génération fichier par fichier

Pour chaque tâche, l'agent génère le code en streaming :

```
  [========--------------------]  1/8  Configuration projet
  Agent : dev-senior
  ----------------------------------------------------------

  ```typescript
  // src/index.ts
  import express from 'express'
  import helmet from 'helmet'
  import cors from 'cors'
  import { authRouter } from './routes/auth.js'
  import { clientsRouter } from './routes/clients.js'
  import { invoicesRouter } from './routes/invoices.js'
  import { errorHandler } from './middleware/error.js'

  const app = express()
  app.use(helmet())
  app.use(cors({ origin: process.env.FRONTEND_URL }))
  app.use(express.json())

  app.use('/auth', authRouter)
  app.use('/clients', clientsRouter)
  app.use('/invoices', invoicesRouter)
  app.use(errorHandler)

  export default app
  ```

  src/index.ts                      ← sauvegarde
  package.json                      ← sauvegarde
  tsconfig.json                     ← sauvegarde
  .env.example                      ← sauvegarde

  [================------------]  2/8  Schema Prisma
  ...
```

### Etape 3 : Résumé

```
  [==============================]

  Phase T terminee
  8 taches   23 fichier(s) genere(s)

    src/index.ts
    src/config/env.ts
    src/middleware/auth.ts
    src/middleware/error.ts
    src/routes/auth.ts
    src/routes/clients.ts
    src/routes/invoices.ts
    src/services/auth.service.ts
    src/services/invoice.service.ts
    src/services/pdf.service.ts
    prisma/schema.prisma
    package.json
    tsconfig.json
    ... et 10 autres

  Continuer vers Phase E — Evaluator ?
  > Oui — generer docs/evaluation.md
    Exporter vers outil externe
    Non — terminer ici
```

---

## Mode 2 — Export vers outil externe

Préférez travailler dans Claude Code, Cursor ou Codex ?
Exportez le contexte complet (specs + backlog + architecture) :

```
  Exporter vers quel outil ?

  Claude Code      → .claude/AGENTS.md (lu automatiquement)
  Cursor           → .cursor/rules/kuate.md
  Codex CLI        → KUATE-context.md
  Autre (universel)→ KUATE-context.md
```

### Avec Claude Code

```bash
# Apres export :
claude
# .claude/AGENTS.md est charge automatiquement
# Claude connait votre projet, vos specs, votre architecture
```

### Avec Codex CLI

```bash
codex --context KUATE-context.md "Commence par la tache 1 : setup Express"
```

### Avec Cursor

Ouvrez le dossier dans Cursor — `.cursor/rules/kuate.md` est chargé automatiquement.

---

## Vérifier le code généré

```bash
ls src/
# auth.ts  clients.ts  invoices.ts  ...

# Installer les dépendances si package.json généré :
npm install

# Lancer le projet :
npm run dev
```

---

## Corriger ou compléter

Si un fichier manque ou est incomplet :

```bash
# Relancer l'agent sur une tache precise
kuate run --agent dev-senior \
  --task "Génère src/services/email.service.ts : envoi facture PDF par email via Resend API"

# Ou session interactive
kuate phase T
# Décrivez la correction à faire
```

---

## Suite

Le code est généré. Phase E évalue la qualité et produit le plan de tests.

```bash
kuate projet          # propose automatiquement de continuer vers E
# ou
kuate projet --from E
```

**Prochain tutoriel :** [Phase E — Évaluation](05-PHASE-E.md)

---

*[Index des tutoriels](README.md)*
