# Phase A — Architect : Architecture Technique

**Auteur : KUATE JOEL PARFAIT**

> Tutoriel 3/5 — Phase A : l'agent architecte-solution conçoit l'architecture complète.
> Précédent : [Phase U — Backlog](02-PHASE-U.md) | Suivant : [Phase T — Génération de code](04-PHASE-T.md)

---

## Rôle de la Phase A

**A = Architect** — Définir la structure technique qui rend le code possible.

L'agent lit `docs/specs.md` et `docs/backlog.md` pour produire
un document d'architecture que les agents de Phase T utiliseront comme plan.

**Livrable :** `docs/architecture.md`

---

## Prérequis

- `docs/specs.md` et `docs/backlog.md` présents
- Agent `architecte-solution` installé

---

## Lancer la Phase A

```bash
kuate projet          # continue automatiquement depuis le pipeline
# ou
kuate phase A         # phase seule
```

---

## Ce que génère l'agent

L'`architecte-solution` produit `docs/architecture.md` :

```markdown
# Architecture — MonSaaS

## Stack technique

| Couche | Technologie | Justification |
|--------|------------|---------------|
| Runtime | Node.js 20 + TypeScript 5 | Equipe existante, types stricts |
| Framework API | Express 5 | Léger, ecosystème mature |
| Base de données | PostgreSQL 16 | ACID, JSON natif, scaling |
| ORM | Prisma | Migrations typees, DX excellent |
| Auth | JWT + bcrypt | Stateless, standard industrie |
| PDF | Puppeteer | HTML → PDF fidele, templates faciles |
| Email | Resend | API simple, delivrabilite haute |
| Hébergement | Railway (staging) + AWS (prod) | Pas de DevOps complexe en MVP |
| CI/CD | GitHub Actions | Intégré, gratuit |

## Modèle de données

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String
  company   Company?
  createdAt DateTime  @default(now())
}

model Company {
  id        String     @id @default(cuid())
  name      String
  siret     String?
  ownerId   String     @unique
  owner     User       @relation(fields: [ownerId], references: [id])
  clients   Client[]
  invoices  Invoice[]
}

model Client {
  id        String    @id @default(cuid())
  name      String
  email     String
  address   String?
  companyId String
  company   Company   @relation(fields: [companyId], references: [id])
  invoices  Invoice[]
}

model Invoice {
  id         String        @id @default(cuid())
  number     String        @unique
  status     InvoiceStatus @default(DRAFT)
  dueDate    DateTime
  lines      InvoiceLine[]
  clientId   String
  client     Client        @relation(fields: [clientId], references: [id])
  companyId  String
  company    Company       @relation(fields: [companyId], references: [id])
  createdAt  DateTime      @default(now())
}

enum InvoiceStatus { DRAFT SENT PAID OVERDUE }
```

## API REST — Endpoints principaux

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /auth/register | Inscription |
| POST | /auth/login | Connexion → JWT |
| GET | /clients | Liste des clients |
| POST | /clients | Créer un client |
| GET | /invoices | Liste des factures |
| POST | /invoices | Créer une facture |
| GET | /invoices/:id/pdf | Générer le PDF |
| PATCH | /invoices/:id/status | Changer le statut |

Toutes les routes (sauf auth) : header `Authorization: Bearer <token>`.

## Structure de fichiers

```
src/
  index.ts              ← Point d'entree Express
  config/
    env.ts              ← Variables d'environnement validees
  middleware/
    auth.ts             ← Verification JWT
    validate.ts         ← Validation Zod
    error.ts            ← Handler d'erreurs global
  routes/
    auth.ts
    clients.ts
    invoices.ts
  services/
    auth.service.ts
    invoice.service.ts
    pdf.service.ts
    email.service.ts
  types/
    index.ts
prisma/
  schema.prisma
```

## Sécurité (OWASP Top 10 applicables)

- A01 Contrôle d'accès : middleware JWT sur toutes les routes protégées
- A02 Cryptographie : bcrypt (cost 12) pour mots de passe
- A03 Injection : Prisma paramétré (pas de SQL brut)
- A05 Mauvaise config : CORS strict, helmet.js, rate limiting
- A07 Auth : tokens courte durée (1h), refresh tokens httpOnly
```

---

## Suite

L'architecture est le plan que Phase T utilise pour générer le code.

```bash
kuate projet          # continue vers Phase T
# ou
kuate phase T
```

**Prochain tutoriel :** [Phase T — Génération de code](04-PHASE-T.md)

---

*[Index des tutoriels](README.md)*
