# Phase U — Unifier : Backlog & Planification

**Auteur : KUATE JOEL PARFAIT**

> Tutoriel 2/5 — Phase U : l'agent chef-projet transforme les specs en backlog actionnable.
> Précédent : [Phase K — Spécifications](01-PHASE-K.md) | Suivant : [Phase A — Architecture](03-PHASE-A.md)

---

## Rôle de la Phase U

**U = Unifier** — Structurer et prioriser le travail en sprints réalisables.

L'agent lit `docs/specs.md` et produit un plan de développement concret
avec priorités, MVP et risques identifiés.

**Livrable :** `docs/backlog.md`

---

## Prérequis

- `docs/specs.md` généré (Phase K terminée)
- Agent `chef-projet` installé

---

## Lancer la Phase U

### Option 1 — Depuis le pipeline

```bash
kuate projet
# Le pipeline propose "Continuer — générer docs/backlog.md"
```

### Option 2 — Phase U seule

```bash
kuate phase U
```

---

## Ce que génère l'agent

Le `chef-projet` lit `docs/specs.md` et produit `docs/backlog.md` :

```markdown
# Backlog — MonSaaS

## Priorités MoSCoW

### Must Have (MVP)
| # | User Story | Effort | Sprint |
|---|-----------|--------|--------|
| US-001 | Créer une facture PDF | L | 1 |
| US-002 | Gestion des clients | M | 1 |
| US-003 | Suivi des paiements | M | 2 |
| US-004 | Authentification | S | 1 |

### Should Have
| # | User Story | Effort | Sprint |
|---|-----------|--------|--------|
| US-005 | Tableau de bord | M | 2 |
| US-006 | Export CSV | S | 3 |

### Could Have (post-MVP)
- US-007 : Rappels automatiques de paiement
- US-008 : Templates de factures personnalisés

### Won't Have (v1)
- Application mobile
- Multi-devises

## Définition of Done MVP
- Toutes les Must Have livrées et testées
- Déployé en staging
- Audit sécurité de base passé

## Sprint 1 (2 semaines) — Fondations
Objectif : utilisateur peut se connecter et créer sa première facture PDF

- Auth (inscription, connexion, JWT)
- CRUD clients
- Création facture + génération PDF
- Déploiement staging

## Sprint 2 (2 semaines) — Paiements
Objectif : suivi complet du cycle de facturation

- Statuts facture (brouillon / envoyée / payée / en retard)
- Tableau de bord résumé
- Envoi email avec facture en pièce jointe

## Sprint 3 (2 semaines) — Qualité & Lancement
Objectif : prod-ready

- Export CSV/PDF pour comptable
- Tests de charge
- Onboarding utilisateur

## Top 3 Risques
| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Génération PDF complexe | Haut | Utiliser une lib éprouvée (PDFKit, Puppeteer) |
| Conformité RGPD | Haut | Hébergement EU, politique cookie dès Sprint 1 |
| Intégration paiement | Moyen | Stripe — SDK bien documenté, sandbox disponible |
```

---

## Suite

Une fois le backlog validé, l'architecture peut être définie.

```bash
kuate projet          # continue vers Phase A
# ou
kuate phase A
```

**Prochain tutoriel :** [Phase A — Architecture](03-PHASE-A.md)

---

*[Index des tutoriels](README.md)*
