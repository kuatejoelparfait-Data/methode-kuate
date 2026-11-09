# Spec Pack KUATE — design

Date : 2026-11-10 · Statut : proposé, en attente de validation

## Intention

Faire de KUATE un outil de **spécification en phases** : à la sortie des phases K, U, A, le projet contient un paquet de specs **complet, vérifiable et sans ambiguïté**, au point qu'un LLM de code (Claude Code, Copilot, Cursor…) ou la phase T de KUATE puisse coder tout le projet **sans poser de question à l'humain**.

Pourquoi : aujourd'hui les phases produisent de la prose libre (un agent par phase), l'état du cycle est déduit de dates de fichiers, et rien ne garantit que les documents sont assez complets pour coder. Le code généré dérive alors des specs.

Inspirations (d'après la connaissance que j'ai de ces méthodes, non revérifiée en ligne) :
- **BMAD** : personas d'agents par rôle (analyste, PM, architecte, scrum master, dev, QA), PRD puis architecture, **fichiers de story autoportants** qui embarquent tout le contexte nécessaire au dev, checklists de validation.
- **GitHub Spec Kit** : *constitution* (principes non négociables), spec avec marqueurs `[NEEDS CLARIFICATION]`, étape *clarify*, plan, tâches ordonnées avec marqueur de parallélisme `[P]`, *analyze* (cohérence et couverture entre artefacts), contrats et modèle de données, *implement*.

## Objectifs

1. Formats de specs **structurés avec identifiants stables** (US-001, AC-001, T-001…), lisibles par un humain et analysables par un programme.
2. Chaque phase K/U/A suit la boucle **rédiger → relire → réviser → clarifier → porte de complétude**, avec plusieurs agents par phase.
3. Une **porte de complétude déterministe** (sans IA, testable) qui dit précisément ce qui manque. Une phase n'est « complète » que si sa porte passe.
4. Une **matrice de traçabilité** : story → critère d'acceptation → tâche → fichiers.
5. Des **fichiers de tâche autoportants** (`docs/stories/T-001.md`) assemblés automatiquement.
6. Une **passation** : export d'un paquet et d'un fichier d'instructions pour Claude Code, Copilot, Cursor ou un `AGENTS.md` générique.
7. S'appuyer sur la base actuelle : `docs/specs.md`, `backlog.md`, `architecture.md`, agents existants, `kuate cycle`, `kuate build`.

## Non-objectifs

- Que la phase T de KUATE code automatiquement tâche par tâche : **étape suivante**, hors de ce lot.
- Remplacer `kuate projet`, `phase` ou `next` : ils continuent de fonctionner.
- Garantir que le code produit par un LLM externe est correct : on garantit la qualité de l'entrée, pas la sortie.
- Un format de spec propriétaire illisible : tout reste en Markdown.

## Anti-objectifs (échec même si « ça marche »)

- Une porte qui passe alors que des questions restent ouvertes ou qu'une story n'est reliée à aucune tâche.
- Des documents verbeux et génériques qui satisfont les contrôles formels mais restent vagues.
- Imposer des appels IA pour des contrôles qu'un programme sait faire.
- Écraser un document existant sans sauvegarde.

## Le paquet de specs

Tout vit dans `docs/` (**mon choix** : compatible avec `kuate projet` et `kuate cycle` existants) :

| Fichier | Phase | Contenu |
|---|---|---|
| `docs/constitution.md` | K (premier) | Principes non négociables, stack imposée, règles de qualité, conventions. |
| `docs/specs.md` | K | PRD : problème, personas, exigences `FR-/NFR-`, stories `US-`, critères `AC-` (Étant donné / Quand / Alors), hors périmètre. |
| `docs/clarifications.md` | K→A | Journal des questions posées et des réponses. |
| `docs/backlog.md` | U | Tâches `T-` ordonnées, dépendances, parallélisme, couverture, fichiers, définition de terminé. |
| `docs/architecture.md` | A | Stack, arborescence, conventions, variables d'environnement, décisions. |
| `docs/data-model.md` | A | Entités, champs, relations, contraintes. |
| `docs/contracts/` | A | Contrats d'API (endpoints, entrées/sorties, erreurs) ; un fichier par domaine. |
| `docs/stories/T-xxx.md` | généré | Fichier de tâche autoportant (voir plus bas). |
| `docs/analysis.md` | généré | Rapport de la porte : erreurs, avertissements, matrice de traçabilité. |
| `docs/IMPLEMENT.md` | export | Ordre d'exécution des tâches et consignes pour le LLM de code. |

### Formats analysables (contrat des prompts et du vérificateur)

`docs/specs.md` :
```
### US-001 — Titre
En tant que <persona>, je veux <action> afin de <bénéfice>.
- AC-001 (US-001) : Étant donné …, quand …, alors …
- AC-002 (US-001) : …
```
Exigences : `- FR-001 : …`, `- NFR-001 : …`.

`docs/backlog.md` :
```
### T-001 [P] — Titre
Covers: US-001, AC-001, AC-002
Depends: T-000
Files: src/auth/login.ts, src/auth/login.test.ts
Done when: <critère vérifiable>
```
`[P]` = parallélisable avec les autres tâches sans dépendance commune. `Depends:` peut être absent.

`docs/architecture.md` : sections obligatoires `## Stack`, `## Structure des dossiers`, `## Conventions`, `## Variables d'environnement`, `## Décisions`. `docs/data-model.md` et `docs/contracts/*.md` sont requis dès que le projet a des données ou une API (le programme ne le devine pas : voir « Laissé au builder »).

Marqueur d'ambiguïté : `[NEEDS CLARIFICATION: question]`, utilisable dans tous les documents.

## Phases et agents

Chaque phase K, U, A suit la même boucle :

1. **Rédiger** : l'agent principal produit le document au format ci-dessus (avec le contrat de format injecté dans le prompt).
2. **Relire** : des agents relecteurs renvoient une liste structurée de problèmes (sévérité, problème, suggestion). Ils ne modifient rien.
3. **Réviser** : l'agent principal révise une fois son document en intégrant les problèmes. Ce qui reste ambigu devient un `[NEEDS CLARIFICATION: …]`.
4. **Clarifier** : l'outil pose chaque question à l'humain, enregistre la réponse dans `clarifications.md` et remplace le marqueur par la réponse.
5. **Porte** : analyse déterministe. La phase est complète si zéro erreur.

Affectation (**mon choix**, avec les agents déjà présents ; un agent absent du projet est sauté avec un avertissement) :

| Phase | Principal | Relecteurs |
|---|---|---|
| K (constitution + PRD) | `business-analyst` | `qa-strategist` (critères testables), `expert-securite` (exigences non fonctionnelles) |
| U (backlog) | `chef-projet` | `tech-lead` (ordre, dépendances, taille des tâches) |
| A (architecture, données, contrats) | `architecte-solution` | `expert-securite`, `expert-devops`, `tech-lead` |

## Porte de complétude (déterministe)

Erreurs (bloquantes) :
- **G1** aucun marqueur `[NEEDS CLARIFICATION` ni `TBD`, `TODO`, `À définir`, `???` restant dans les documents de la phase.
- **G2** chaque `US-` a au moins un `AC-`.
- **G3** chaque `US-` est couverte par au moins une tâche (directement ou via ses `AC-`).
- **G4** chaque `AC-` est couvert par au moins une tâche.
- **G5** chaque tâche a `Covers`, `Files` et `Done when` non vides ; ses références `US-`/`AC-` existent.
- **G6** les `Depends:` pointent vers des tâches existantes, sans cycle.
- **G7** `architecture.md` contient toutes les sections obligatoires.

Avertissements : une tâche dont les fichiers ne sont sous aucun dossier cité dans l'architecture ; `constitution.md` absente ; exigence `NFR-` couverte par aucune tâche.

Mapping par phase : K = G1 (docs K), G2 ; U = G1 (backlog), G3–G6 ; A = G1 (docs A), G7. `kuate cycle` affiche l'état de porte à côté du statut de chaque phase (« complète » / « N erreurs »).

Une revue IA optionnelle (`--ai`) vient en plus : « un développeur extérieur pourrait-il coder sans poser de question ? ». Elle liste des questions ouvertes ; elle ne remplace pas la porte.

## Fichier de tâche autoportant (inspiré BMAD)

`kuate spec stories` génère, **sans IA**, un fichier par tâche : bloc de la tâche, texte complet des US et AC qu'elle couvre, extraits d'architecture utiles (stack, conventions, variables d'environnement), entités du modèle de données et contrats cités, définition de terminé, consigne « n'implémente que cette tâche ; si ambigu, ajoute une question dans `docs/clarifications.md` et arrête ».

## Commandes

- `kuate spec` : exécute la boucle pour la prochaine phase K/U/A non complète (reprise possible, `--phase K|U|A`).
- `kuate spec constitution` : crée ou met à jour la constitution.
- `kuate spec clarify` : traite les marqueurs ouverts.
- `kuate spec analyze [--ai]` : exécute la porte, écrit `docs/analysis.md`, code de sortie non nul s'il reste des erreurs (utilisable en CI).
- `kuate spec stories` : génère les fichiers de tâche.
- `kuate spec export --target claude|copilot|cursor|agents` : passation (voir ci-dessous).
- Toutes les commandes qui appellent l'IA acceptent `--choose-ai`, `--provider`, `--model`.

## Passation

`kuate spec export` refuse de s'exécuter si la porte n'est pas passée (sauf `--force`). Il écrit `docs/IMPLEMENT.md` (tâches dans l'ordre topologique, groupes `[P]`, consignes) et le fichier d'instructions de l'outil cible : `CLAUDE.md`, `.github/copilot-instructions.md`, règles Cursor, ou `AGENTS.md`. Le fichier d'instructions contient la constitution, la règle « suivre les specs, ne pas dévier, signaler toute ambiguïté » et le pointeur vers `docs/stories/`. Les fichiers existants sont sauvegardés avant remplacement.

## Intégration avec l'existant

- `kuate cycle` : lit l'état de porte (calculé, non stocké) ; la validation manuelle d'une phase reste possible mais n'est pas une porte passée.
- `kuate projet` : inchangé. Les documents qu'il génère n'ont pas le format structuré : `kuate spec analyze` les signalera comme incomplets, et `kuate spec` les remplacera après sauvegarde.
- `kuate next` : reçoit les erreurs de porte dans son contexte pour prioriser.
- `kuate build` : inchangé ; `spec export` est le chemin recommandé pour la passation.

## Décisions que j'ai prises (à valider)

1. Le paquet vit dans `docs/`, pas dans un nouveau dossier `specs/`.
2. Identifiants et formats de la section « Formats analysables ».
3. Une seule passe de révision automatique par phase, puis clarification humaine.
4. Affectation des agents du tableau.
5. Porte et fichiers de tâche **sans IA** ; l'IA n'intervient que pour rédiger, relire, réviser et pour la revue optionnelle.
6. La phase T intégrée vient après ce lot.

## Laissé au builder

- Les prompts exacts de chaque agent (ils doivent imposer les formats et exiger du concret propre au projet, pas du générique).
- Le format précis de sortie des relecteurs (JSON) et la gestion d'un JSON invalide.
- Comment décider qu'un projet « a des données ou une API » pour exiger `data-model.md` et `contracts/` (proposition : question posée à l'étape K et enregistrée dans la constitution).
- Les noms exacts des fichiers d'instructions par outil, en s'alignant sur `kuate build`.
- Le découpage en modules : logique pure (analyse, traçabilité, génération des fichiers de tâche) dans `packages/core`, orchestration interactive dans `packages/cli`.

## Vérification

- Tests unitaires du vérificateur sur des paquets valides et sur chaque règle G1–G7 violée, de la génération des fichiers de tâche et de l'ordre topologique.
- Test de bout en bout sur un projet de démonstration avec un paquet complet (porte passée, export produit) et un paquet cassé (erreurs listées avec les bons identifiants).
- Les appels IA ne sont pas testés en automatique : vérification manuelle avec une vraie clé.
