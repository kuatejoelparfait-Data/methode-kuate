# Phase Dev — Application fonctionnelle en local

**Auteur : KUATE JOEL PARFAIT**

> Tutoriel 6/6 — Après le code généré : installer, tester, corriger, itérer avec les agents.
> Précédent : [Phase E — Évaluation](05-PHASE-E.md) | [Index](README.md)

---

## Rôle de la Phase Dev

Transformer le code généré en Phase T en une application qui tourne.

**Ce que fait `kuate dev` :**
1. Détecte npm / yarn / pnpm et installe les dépendances
2. Lance Prisma migrate si un schema est présent
3. Démarre le serveur de dev en arrière-plan
4. Exécute les tests (Jest / Vitest / Mocha auto-détecté)
5. Sur échec : un agent IA lit l'erreur et corrige le fichier
6. Relance les tests — itère jusqu'à passage
7. Ouvre un terminal agents pour continuer le développement

---

## Prérequis

- Code généré en Phase T (`src/` présent)
- `package.json` avec scripts `dev` et `test`
- `.env` créé depuis `.env.example`

---

## Lancer

### Depuis le pipeline (recommandé)

```bash
kuate projet
# A la fin de Phase E, le pipeline propose :
#   Lancer l'application en local avec kuate dev ?
#   > Oui
```

### Directement

```bash
kuate dev
```

---

## Déroulement complet

### 1. Détection automatique

```
  kuate dev — MonSaaS
  Claude Opus / claude-opus-4-5

  Package manager : npm
  Port detecte    : 3000       (lu depuis .env.example)
  Commande tests  : npm test   (depuis package.json scripts)
  Commande dev    : npm run dev
```

### 2. Installation

```
  Installation des dependances (npm install)...
  Dependances installees
```

### 3. Prisma (si schema.prisma présent)

```
  Prisma schema detecte — migration dev...
  Prisma : client genere + migration appliquee
```

> Si `DATABASE_URL` n'est pas dans `.env`, ce message apparaît :
> `Prisma migrate : verifiez DATABASE_URL dans .env`

### 4. Choix du point de départ

```
  Par ou commencer ?
  > Tests puis serveur      ← recommande
    Lancer les tests
    Lancer le serveur de dev
```

### 5. Exécution des tests

```
  Tests en cours (npm test)...

  PASS  tests/auth.test.ts
  PASS  tests/client.test.ts
  FAIL  tests/invoice.test.ts

    ● InvoiceService › should calculate total TTC correctly

      expect(received).toBe(expected)
      Expected: 240
      Received: 200

  2 test(s) echoue(s)
```

### 6. Correction automatique par agent

```
  2 test(s) echoue(s). Laisser un agent corriger ?
  > Oui

  Quel agent corriger les erreurs ?
  > dev-senior
    tech-lead

  [streaming de la correction...]

  ```typescript
  // src/services/invoice.service.ts
  calculateTotal(lines: InvoiceLine[]) {
    const ht = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
    const tva = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice * l.vatRate / 100, 0)
    return { ht, tva, ttc: ht + tva }
  }
  ```

  Corrige : src/services/invoice.service.ts

  Tests en cours (npm test)...
  Tous les tests passent
```

### 7. Démarrage du serveur

```
  Demarrage du serveur (npm run dev)...
  Serveur pret : http://localhost:3000

  Application disponible : http://localhost:3000
```

---

## Terminal agents — continuer le développement

Après le lancement, une boucle interactive s'ouvre :

```
  Terminal agents — projet en cours
  Serveur : http://localhost:3000
  Agents disponibles : dev-senior, tech-lead, architecte-solution...

  Que faire ?
  > Demander a un agent de continuer le developpement
    Relancer les tests
    Redemarrer le serveur
    Terminer
```

### Exemple — Ajouter une feature

```
  Que faire ?
  > Demander a un agent de continuer le developpement

  Choisir un agent :
  > dev-senior

  Tache a realiser :
  > Ajoute la route GET /invoices/stats qui retourne le CA mensuel
    et le nombre de factures par statut pour le tableau de bord

  [streaming...]

  src/routes/invoices.ts    (mis a jour)
  src/services/stats.service.ts    (nouveau)

  Relancer les tests ?
  > Oui

  Tous les tests passent
```

### Exemple — Corriger un bug signalé

```
  Tache a realiser :
  > Le endpoint POST /auth/login retourne 500 au lieu de 401
    quand le mot de passe est incorrect.
    Voici le log : UnhandledPromiseRejection: Invalid credentials

  [streaming...]
  Corrige : src/services/auth.service.ts
```

---

## Que faire si les tests ne passent pas après 3 tentatives

L'agent abandonne après 3 corrections sans progression. Options :

**1. Corriger manuellement** — le fichier est identifié, l'erreur précise

**2. Demander à un agent via le terminal :**
```
  Que faire ?
  > Demander a un agent de continuer le developpement

  Tache : Le test "should hash password" echoue encore.
          Voici l'erreur : [coller l'erreur]
          Fichier : src/services/auth.service.ts
          Corrige le problème.
```

**3. Utiliser Claude Code avec le contexte KUATE :**
```bash
# Exporter le contexte si pas encore fait
kuate projet --from E
# Exporter vers Claude Code
# Puis :
claude
```

---

## Commandes de la Phase Dev

```bash
kuate dev                    # Lance install + tests + serveur + terminal agents
kuate run --agent dev-senior \
  --task "Ajoute route..."   # Agent direct sans passer par kuate dev
kuate next                   # Suggestions IA basées sur l'état actuel
```

---

## Structure finale après Phase Dev

```
mon-projet/
  src/
    index.ts
    routes/
      auth.ts
      clients.ts
      invoices.ts
    services/
      auth.service.ts
      invoice.service.ts
      pdf.service.ts
      stats.service.ts     ← ajoute en Phase Dev
    middleware/
      auth.ts
      error.ts
  tests/
    auth.test.ts
    invoice.test.ts
    integration/
      invoices.test.ts
  prisma/
    schema.prisma
  docs/
    specs.md
    backlog.md
    architecture.md
    evaluation.md
  .kuate/
    context/
      memory.md            ← journal complet K→U→A→T→E→Dev
```

---

*[Revenir au début : Démarrage](00-DEMARRAGE.md) | [Index](README.md)*
