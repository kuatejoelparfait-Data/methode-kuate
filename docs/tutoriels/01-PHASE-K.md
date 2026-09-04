# Phase K — Knower : Spécifications du projet

**Auteur : KUATE JOEL PARFAIT**

> Tutoriel 1/5 — Phase K : l'agent business-analyst génère les specs complètes.
> Précédent : [Démarrage](00-DEMARRAGE.md) | Suivant : [Phase U — Backlog](02-PHASE-U.md)

---

## Rôle de la Phase K

**K = Knower** — Comprendre et formaliser ce que le projet doit faire.

L'agent analyse votre description et produit un document de référence utilisé
par toutes les phases suivantes.

**Livrable :** `docs/specs.md`

---

## Prérequis

- Projet initialisé (`kuate init` fait)
- Agent `business-analyst` installé (vérifié par `kuate agent list`)
- IA configurée (`kuate config ai`)

---

## Lancer la Phase K

### Option 1 — Dans le pipeline complet (recommandé)

```bash
kuate projet
```

Le pipeline détecte que `docs/specs.md` n'existe pas et démarre automatiquement en Phase K.

### Option 2 — Phase K seule

```bash
kuate phase K
```

Vous entrez en mode interactif avec l'agent business-analyst.
Décrivez votre projet et l'agent génère les specs.

---

## Ce que génère l'agent

Le `business-analyst` produit `docs/specs.md` structuré ainsi :

```markdown
# Spécifications — MonSaaS

## 1. Objectif du projet
SaaS de gestion de factures pour PME. Problème résolu : facturation manuelle
chronophage, erreurs fréquentes, pas de suivi des paiements.

## 2. Utilisateurs cibles
- Gérant PME (5-50 salariés) : crée et envoie les factures
- Comptable : exporte les données, génère les rapports fiscaux

## 3. User Stories

### US-001 — Créer une facture
En tant que gérant, je veux créer une facture en 3 clics
afin d'envoyer une facture professionnelle sans erreur.

Critères d'acceptation :
- [ ] Formulaire avec client, lignes, TVA, remise
- [ ] Aperçu PDF avant envoi
- [ ] Numérotation automatique conforme

### US-002 — Suivre les paiements
...

## 4. Contraintes techniques
- Stack : Node.js + TypeScript (équipe existante)
- Base de données : PostgreSQL
- Hébergement : cloud (AWS ou GCP)
- RGPD : données clients hébergées en Europe

## 5. Hors scope MVP
- Application mobile (v2)
- Multi-devises (v2)
- Intégration comptabilité (v3)

## 6. Découpage KUATE
- K : cette spec
- U : backlog priorisé + sprints
- A : architecture API REST + modèle de données
- T : génération du code (auth, factures, PDF, paiements)
- E : tests, audit sécurité, rétrospective
```

---

## Exemple de session interactive

```bash
kuate phase K

  Agent business-analyst pret.
  Decrivez votre projet ou posez une question :
  > Je veux créer un SaaS de facturation pour PME, avec gestion
    des clients, création de factures PDF, et suivi des paiements.

  [streaming de la reponse...]

  Entree vide = revenir au menu.
```

---

## Vérifier le résultat

```bash
cat docs/specs.md
# ou
kuate memory show
```

---

## Modifier ou compléter

Si les specs sont incomplètes, relancez une session :

```bash
kuate phase K
# Puis : "Ajoute une US pour l'export comptable"
```

Ou éditez `docs/specs.md` directement — c'est un fichier Markdown standard.

---

## Suite

Une fois `docs/specs.md` généré, la Phase U peut commencer.

```bash
kuate projet          # continue automatiquement vers Phase U
# ou
kuate phase U         # Phase U seule
```

**Prochain tutoriel :** [Phase U — Backlog](02-PHASE-U.md)

---

*[Index des tutoriels](README.md)*
