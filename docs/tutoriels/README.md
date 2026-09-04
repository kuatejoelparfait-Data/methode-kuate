# Tutoriels KUATE — Guide par phase

**Auteur : KUATE JOEL PARFAIT**

> 5 tutoriels connectés, un par phase. Suivez-les dans l'ordre ou sautez directement à la phase qui vous intéresse.

---

## Parcours complet

```
Démarrage  →  Phase K  →  Phase U  →  Phase A  →  Phase T  →  Phase E
   5 min       specs      backlog    architecture    code       qualité
```

| # | Tutoriel | Durée | Livrable |
|---|----------|-------|---------|
| 0 | [Démarrage — Installation & init](00-DEMARRAGE.md) | 5 min | Projet initialisé |
| 1 | [Phase K — Spécifications](01-PHASE-K.md) | 3 min | `docs/specs.md` |
| 2 | [Phase U — Backlog](02-PHASE-U.md) | 3 min | `docs/backlog.md` |
| 3 | [Phase A — Architecture](03-PHASE-A.md) | 3 min | `docs/architecture.md` |
| 4 | [Phase T — Génération de code](04-PHASE-T.md) | 5 min | `src/` code source |
| 5 | [Phase E — Évaluation](05-PHASE-E.md) | 3 min | `docs/evaluation.md` |

---

## Commande rapide — tout en une fois

```bash
kuate projet
```

Lance le pipeline K→U→A→T→E complet avec suivi de phase.

---

## Reprendre depuis une phase

```bash
kuate projet --from K   # specs
kuate projet --from U   # backlog
kuate projet --from A   # architecture
kuate projet --from T   # code
kuate projet --from E   # evaluation
```

---

*Pour le tutoriel complet (toutes les commandes) : [../TUTORIEL.md](../TUTORIEL.md)*
