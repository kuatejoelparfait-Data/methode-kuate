# Tutoriels KUATE — Guide par phase

**Auteur : KUATE JOEL PARFAIT**

> 6 tutoriels connectés, un par phase. Suivez-les dans l'ordre ou sautez directement à la phase qui vous intéresse.

---

## Parcours complet

```
Demarrage → Phase K → Phase U → Phase A → Phase T → Phase E → Phase Dev
  5 min      specs    backlog   archi      code      qualite   appli locale
```

| # | Tutoriel | Durée | Livrable |
|---|----------|-------|---------|
| 0 | [Démarrage — Installation & init](00-DEMARRAGE.md) | 5 min | Projet initialisé |
| 1 | [Phase K — Spécifications](01-PHASE-K.md) | 3 min | `docs/specs.md` |
| 2 | [Phase U — Backlog](02-PHASE-U.md) | 3 min | `docs/backlog.md` |
| 3 | [Phase A — Architecture](03-PHASE-A.md) | 3 min | `docs/architecture.md` |
| 4 | [Phase T — Génération de code](04-PHASE-T.md) | 5 min | `src/` code source |
| 5 | [Phase E — Évaluation](05-PHASE-E.md) | 3 min | `docs/evaluation.md` |
| 6 | [Phase Dev — Application locale](06-PHASE-DEV.md) | 5 min | Appli sur localhost |

---

## Commande rapide — tout en une fois

```bash
kuate projet
# Pipeline K→U→A→T→E complet, puis propose kuate dev
```

---

## Reprendre depuis une phase

```bash
kuate projet --from K   # specs
kuate projet --from U   # backlog
kuate projet --from A   # architecture
kuate projet --from T   # code
kuate projet --from E   # evaluation
kuate dev               # application locale (apres Phase T)
```

---

## Référence complète

Pour toutes les commandes, workflows et analyse de navigation :
[docs/REFERENCE-COMPLETE.md](../REFERENCE-COMPLETE.md)

---

*Pour le tutoriel complet (toutes les commandes) : [../TUTORIEL.md](../TUTORIEL.md)*
