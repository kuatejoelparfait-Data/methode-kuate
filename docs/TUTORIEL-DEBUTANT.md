# Tutoriel débutant — Votre premier projet avec KUATE

> **Durée** : environ 45 minutes · **Niveau** : débutant · **Version** : 1.3.0  
> **Vous allez** : partir d'une idée, produire des specs complètes et vérifiées avec des agents IA, puis les transmettre à un outil de code (Claude Code, Copilot ou Cursor) qui construit l'application.

Ce tutoriel suit un cas concret du début à la fin. Chaque étape dit **quoi taper**, **ce que vous devez voir** et **pourquoi**.

> **À savoir avant de commencer**
> - Les réponses de l'IA changent à chaque exécution. Les extraits de documents ci-dessous sont des **exemples** : les vôtres seront différents, mais auront la même forme.
> - Les commandes qui appellent l'IA consomment des crédits sur votre compte. Le coût dépend du modèle choisi : prenez un modèle économique (Claude Haiku, GPT-4o mini) pour vos premiers essais.
> - Ne copiez **jamais** votre clé API dans un fichier du projet ni dans un message : KUATE la range lui-même dans `~/.kuate/global.json`.

---

## Le cas d'usage : FactureFacile

**Camille** est graphiste freelance. Elle perd du temps à faire ses factures dans un tableur : numéros qui se répètent, clients à ressaisir, PDF faits à la main.

Elle veut une petite application web, **FactureFacile**, qui permet de :

- se connecter à son espace ;
- enregistrer ses clients ;
- créer une facture avec un **numéro unique automatique** ;
- plus tard : envoyer des **relances** aux clients en retard.

Camille n'est pas développeuse. Elle va utiliser KUATE pour écrire des specs précises, puis laisser un outil de code construire l'application à partir de ces specs.

```
Idée  →  Specs complètes (K, U, A)  →  Vérification  →  Passation à Claude Code  →  Application
          kuate spec                  kuate spec analyze  kuate spec export
```

---

## Étape 1 — Installer KUATE (5 min)

Il vous faut **Node.js 20 ou plus** et **Git**. Vérifiez :

```bash
node --version
```

Vous devez lire `v20.` ou plus. Sinon, installez la version LTS depuis nodejs.org.

Installez KUATE :

```bash
git clone https://github.com/kuatejoelparfait-Data/methode-kuate.git
cd methode-kuate
npm install
```

`npm install` compile tout et rend la commande `kuate` disponible partout. Vérifiez :

```bash
kuate --version
```

Résultat attendu : `1.3.0`.

---

## Étape 2 — Enregistrer votre clé API (3 min)

KUATE a besoin d'une clé pour parler à une IA : **Claude** (console.anthropic.com) ou **OpenAI** (platform.openai.com). Créez une clé sur le site du fournisseur, puis :

```bash
kuate config ai
```

Dans le menu :

1. Choisissez **« Ajouter ou modifier une clé API »**, puis votre provider.
2. Collez la clé quand elle est demandée (elle n'est pas affichée). KUATE la **teste par un vrai appel** : vous devez voir « Clé valide ✓ ».
3. Choisissez **« Changer le provider / modèle actif »** et prenez un modèle économique (par exemple `claude-haiku-4-5-20251001` ou `gpt-4o-mini`).
4. **Quitter.**

Contrôle :

```bash
kuate config show
```

Vous voyez le provider actif et la clé **masquée** (`sk-ant-…a1b2`), avec son origine. Si une clé est fausse, relancez `kuate config ai` : vous pouvez la modifier à tout moment sans rien perdre d'autre.

---

## Étape 3 — Créer le projet (5 min)

Créez un dossier vide pour FactureFacile et placez-vous dedans :

```bash
mkdir facture-facile
cd facture-facile
kuate init
```

Le wizard pose 6 questions. Réponses pour ce tutoriel :

| Étape | Question | Réponse |
|---|---|---|
| 1/6 | Nom du projet | `FactureFacile` |
| 2/6 | Langue de travail | Français |
| 3/6 | Méthodologie | `agile` |
| 4/6 | Description | voir ci-dessous |
| 5/6 | Configurer un provider IA ? | Oui (votre clé est déjà détectée : choisissez « Garder cette clé ») |
| 6/6 | Comment sélectionner les agents ? | **Sélection manuelle par domaine** → **Dev + Business & Stratégie** (14 agents) |

Description à l'étape 4 (une ou deux phrases suffisent, mais **plus c'est précis, meilleures sont les specs**) :

```
Application web pour une graphiste freelance : elle enregistre ses clients, crée des factures
numérotées automatiquement et les exporte en PDF. Stack souhaitée : TypeScript, Node.js,
PostgreSQL. Données hébergées en Europe.
```

Pourquoi « Dev + Business » ? Les specs sont écrites par des agents business (`business-analyst`, `chef-projet`), relues par des agents dev et qualité (`qa-strategist`, `tech-lead`, `expert-securite`…). Ces 14 agents couvrent tout.

Quand le wizard demande **« Que voulez-vous faire maintenant ? »**, choisissez **« Continuer plus tard »**. Vous allez spécifier avec une commande plus précise à l'étape suivante.

Regardez ce qui a été créé :

```
KUATE.md              le contexte du projet, à partager avec une IA
.kuate/config.yaml    votre configuration
.kuate/agents/        un fichier par agent
.kuate/context/       la mémoire du projet (5 fichiers)
```

Vérifiez l'installation :

```bash
kuate doctor
```

Toutes les lignes doivent être vertes (✓).

---

## Étape 4 — Phase K : écrire les specs (10 min)

C'est le cœur de la méthode. Lancez :

```bash
kuate spec
```

> **Astuce** : pour choisir un modèle moins cher ou différent juste pour cette fois, ajoutez `--choose-ai`.

### 4.1 La constitution

La première fois, KUATE vous pose deux questions. Elles décident quels documents seront exigés plus tard :

- **« Le projet a-t-il des données persistantes (base de données) ? »** → **Oui** (clients, factures).
- **« Le projet expose-t-il une API ? »** → **Oui** (le navigateur parle au serveur).

L'agent `business-analyst` rédige alors `docs/constitution.md` : les règles non négociables du projet (stack, qualité, conventions). Ouvrez le fichier et lisez-le : c'est le « règlement » que l'outil de code devra respecter.

### 4.2 La boucle en 5 étapes

KUATE enchaîne ensuite, pour la phase K :

| Étape | Ce qui se passe |
|---|---|
| **1/5 Rédaction** | `business-analyst` écrit `docs/specs.md` (vous voyez le texte défiler). |
| **2/5 Relecture** | `qa-strategist` et `expert-securite` relisent et listent des remarques (« critère non testable », « exigence de sécurité manquante »…). |
| **3/5 Révision** | L'agent corrige le document en tenant compte des remarques. |
| **4/5 Clarification** | KUATE vous pose les **questions ouvertes** : ce que l'IA n'a pas voulu inventer. |
| **5/5 Porte** | Vérification automatique : le document est-il complet ? |

### 4.3 Répondre aux questions

À l'étape 4/5, vous verrez par exemple :

```
◆  docs/specs.md — Les factures doivent-elles pouvoir être modifiées après envoi ?
│  non, une facture envoyée est figée ; on crée un avoir à la place
```

Répondez comme Camille le ferait, en une phrase claire. Votre réponse remplace le point d'interrogation dans le document **et** est enregistrée dans `docs/clarifications.md`. Si vous ne savez pas, `Ctrl+C` arrête les questions : vous pourrez y revenir avec `kuate spec clarify`.

### 4.4 Lire le résultat

Ouvrez `docs/specs.md`. Vous y trouvez des **stories** et des **critères d'acceptation** numérotés. Exemple de forme (votre texte sera différent) :

```
### US-001 — Connexion
En tant que graphiste, je veux me connecter afin d'accéder à mes factures.
- AC-001 (US-001) : Étant donné un compte valide, quand je saisis mes identifiants, alors j'accède à mon tableau de bord
- AC-002 (US-001) : Étant donné un mot de passe erroné, quand je valide, alors je vois un message d'erreur

### US-002 — Création de facture
En tant que graphiste, je veux créer une facture afin de l'envoyer à un client.
- AC-003 (US-002) : Étant donné un client existant, quand je valide le formulaire, alors la facture est enregistrée avec un numéro unique

- FR-001 : Le système numérote les factures de façon séquentielle
- NFR-001 : Chaque page répond en moins de 2 secondes
```

Comment lire ce format :

| Code | Signification |
|---|---|
| `US-001` | **User story** : ce que l'utilisateur veut faire |
| `AC-001` | **Critère d'acceptation** : comment vérifier que c'est réussi (Étant donné… quand… alors…) |
| `FR-001` / `NFR-001` | Exigence fonctionnelle / non fonctionnelle (chiffrée) |

> **Pourquoi ces numéros ?** Ils permettent à KUATE de vérifier automatiquement que **chaque critère est bien couvert par une tâche** plus tard. Sans eux, impossible de prouver que rien n'a été oublié.

### 4.5 Le résultat de la porte

À la fin, vous voyez soit :

```
  Phase K complète.
```

soit une liste d'erreurs avec leur code (`[G2] US-002 — US-002 n'a aucun critère d'acceptation.`). Dans ce cas, relancez simplement `kuate spec` : l'outil propose de **réviser** le document existant. Choisissez « Réviser le document actuel » : vos réponses sont conservées.

---

## Étape 5 — Phases U et A : backlog et architecture (10 min)

Relancez **la même commande**. KUATE sait que K est complète et passe à la phase suivante :

```bash
kuate spec
```

### Phase U — le backlog (agent `chef-projet`, relecteur `tech-lead`)

Résultat : `docs/backlog.md`, une liste de **tâches** ordonnées. Forme d'une tâche :

```
### T-002 [P] — Création de facture
Covers: US-002, AC-003, FR-001
Depends: T-001
Files: src/invoices/create.ts, src/invoices/create.test.ts
Done when: deux créations successives produisent deux numéros distincts
```

| Champ | Rôle |
|---|---|
| `[P]` | La tâche peut être faite **en parallèle** d'autres |
| `Covers` | Quelles stories et quels critères cette tâche réalise |
| `Depends` | Tâches à terminer avant |
| `Files` | Fichiers exacts à créer |
| `Done when` | Comment savoir que c'est fini (vérifiable par un test) |

### Phase A — l'architecture (agent `architecte-solution`, relecteurs `expert-securite`, `expert-devops`, `tech-lead`)

Relancez encore :

```bash
kuate spec
```

Résultat : `docs/architecture.md` (stack, dossiers, conventions, variables d'environnement, décisions), `docs/data-model.md` (les tables : clients, factures) et `docs/contracts/` (les routes de l'API). Les deux derniers existent parce que vous avez répondu « oui » à la constitution.

Quand vous relancez une dernière fois, KUATE répond :

```
  Paquet de specs complet : porte passée pour K, U et A.
```

---

## Étape 6 — Vérifier : la porte de complétude (3 min)

Même si chaque phase a sa porte, faites un contrôle global :

```bash
kuate spec analyze
```

Résultat attendu :

```
  Porte de complétude — FactureFacile

  K  Knower     complète
  U  Unifier    complète
  A  Architect  complète

  Porte passée (0 avertissement(s)). Rapport : docs/analysis.md
```

Cette vérification **n'utilise pas l'IA** : c'est un programme qui contrôle que chaque story a ses critères, que chaque critère est couvert par une tâche, qu'il ne reste aucun « TBD », et que les dépendances ne tournent pas en rond. Ouvrez `docs/analysis.md` : la **matrice de traçabilité** relie chaque story à ses critères, ses tâches et ses fichiers.

### Et si la porte n'est pas passée ?

Chaque erreur dit quoi corriger. Exemple :

```
  U  Unifier    1 erreur(s)
      [G4] AC-003 — AC-003 n'est couvert par aucune tâche.
```

Signification : un critère d'acceptation n'est réalisé par aucune tâche. Relancez `kuate spec --phase U`, choisissez « Réviser le document actuel » : l'agent reçoit l'erreur et corrige le backlog. Vous pouvez aussi corriger le fichier à la main, puis relancer `kuate spec analyze`.

### Voir l'état global : `kuate cycle`

```bash
kuate cycle
```

```
  Cycle KUATE — FactureFacile

   ✓ K ─ ✓ U ─ ✓ A ─[○ T]─ ○ E

  K  Knower       produite     docs/specs.md           il y a 15 min   porte : complète
  U  Unifier      produite     docs/backlog.md         il y a 8 min    porte : complète
  A  Architect    produite     docs/architecture.md    il y a 2 min    porte : complète
  T  Transformer  à faire
  E  Evaluator    à faire

  Prochaine phase : T
```

Les phases K, U, A sont faites, avec leur porte « complète ». T (le code) et E (l'évaluation) restent à faire : c'est l'étape suivante.

---

## Étape 7 — Passer la main à un outil de code (5 min)

Les specs sont complètes. Transmettez-les :

```bash
kuate spec export --target claude
```

Cibles possibles : `claude` (Claude Code), `copilot` (GitHub Copilot), `cursor`, `agents` (fichier générique `AGENTS.md`).

Résultat :

```
  Passation prête (claude) :
    docs/stories/  3 tâche(s)
    docs/IMPLEMENT.md
    CLAUDE.md
```

Ce que contient chaque fichier :

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | Consignes permanentes pour l'outil de code : la constitution, la règle « suis les specs sans dévier », la marche à suivre |
| `docs/IMPLEMENT.md` | L'**ordre d'exécution** : tâches par groupes (`Groupe 1`, `Groupe 2`…), les tâches parallélisables sont marquées |
| `docs/stories/T-001.md`… | Un fichier **autoportant** par tâche : la tâche, les stories et critères concernés, l'architecture utile, le modèle de données, les contrats. Il suffit à lui seul |

> **Pourquoi des fichiers de tâche autoportants ?** Un outil de code travaille bien quand il a *tout* le contexte d'une tâche sous les yeux. Chaque fichier contient la consigne : « N'implémente que cette tâche. Si une information manque ou est ambiguë, ajoute une question dans `docs/clarifications.md` et arrête-toi. » L'outil ne devine donc pas.

### Lancer l'outil de code

Ouvrez le dossier `facture-facile` avec votre outil (Claude Code, VS Code avec Copilot, Cursor). Il lit automatiquement `CLAUDE.md` (ou le fichier d'instructions de sa cible). Demandez-lui par exemple :

```
Lis docs/IMPLEMENT.md puis implémente le Groupe 1 en suivant docs/stories/T-001.md.
Lance les tests, puis passe au groupe suivant.
```

Pour chaque tâche terminée, le critère « Done when » est un test qui passe : c'est votre preuve que la tâche est réalisée.

> **Alternative** : KUATE peut aussi générer le code lui-même (`kuate projet --from T`, puis `kuate dev` pour installer, lancer et tester). Pour un projet de cette taille, préférez la passation ci-dessus : la phase T intégrée ne lit qu'un extrait de chaque document, alors que les fichiers de tâche contiennent tout.

---

## Étape 8 — Un changement de dernière minute (7 min)

Deux semaines plus tard, Camille veut aussi des **relances automatiques** pour les clients en retard. Les specs doivent suivre.

### 8.1 Ajouter la story

Ouvrez `docs/specs.md` et ajoutez, **avant** les lignes `FR-`/`NFR-` :

```
### US-003 — Relance des impayés
En tant que graphiste, je veux relancer automatiquement les clients en retard afin d'être payée plus vite.
- AC-004 (US-003) : Étant donné une facture impayée depuis plus de 15 jours, quand le contrôle quotidien s'exécute, alors un email de relance est envoyé au client
```

Respectez le format : `### US-003 — Titre` et `- AC-004 (US-003) : …` (même numérotation continue).

### 8.2 Voir l'impact

```bash
kuate cycle
```

```
   ✓ K ─[⚠ U]─ ⚠ A ─ ○ T ─ ○ E

  K  Knower       produite                    docs/specs.md          il y a 1 min    porte : complète
  U  Unifier      périmée (K modifiée après)  docs/backlog.md        il y a 40 min   porte : 2 erreur(s)
  A  Architect    périmée (K modifiée après)  docs/architecture.md   il y a 35 min   porte : complète
  T  Transformer  à faire
  E  Evaluator    à faire

  Incohérences :
    · Phase U périmée : la phase K a été modifiée après.
    · Phase A périmée : la phase K a été modifiée après.

  Prochaine phase : U
```

KUATE a détecté que vous avez modifié les specs **après** le backlog et l'architecture : ils sont **périmés**. Et la porte de U signale 2 erreurs, que `kuate spec analyze` détaille :

```
  U  Unifier    2 erreur(s)
      [G3] US-003 — US-003 n'est couverte par aucune tâche.
      [G4] AC-004 — AC-004 n'est couvert par aucune tâche.
```

La nouvelle story et son critère ne sont réalisés par aucune tâche.

### 8.3 Mettre à jour

```bash
kuate spec --phase U
```

Choisissez **« Réviser le document actuel »** : l'agent ajoute les tâches manquantes sans toucher au reste. Faites de même pour la phase A si nécessaire (`kuate spec --phase A`), puis :

```bash
kuate spec analyze
kuate spec export --target claude
```

L'export remplace `CLAUDE.md` et `IMPLEMENT.md` ; **les anciennes versions sont sauvegardées** dans `.kuate/backups/`. Les fichiers de `docs/stories/` sont régénérés pour toutes les tâches : dites à votre outil de code de ne traiter que les tâches **nouvelles ou modifiées** (par exemple « implémente uniquement la tâche T-004 »).

> Vous pouvez aussi, à tout moment, **valider** une phase que vous jugez bonne (elle n'est alors plus considérée périmée), la **sauter**, ou ajouter une **note d'ajustement** transmise à tous les agents : tout se fait dans le menu de `kuate cycle`.

---

## Étape 9 — Les commandes du quotidien

| Besoin | Commande |
|---|---|
| « Que faire maintenant ? » | `kuate next` (suggestions selon l'état du cycle) |
| Voir l'état et ajuster | `kuate cycle` · `kuate cycle --analyse` (audit de cohérence par IA) |
| Faire relire tout le paquet par une IA | `kuate spec analyze --ai` |
| Répondre aux questions restées ouvertes | `kuate spec clarify` |
| Une tâche précise pour un agent | `kuate run --agent dev-senior --task "…"` |
| Un avis de plusieurs experts | `kuate conseil --agents "architecte-solution,expert-securite" --topic "…"` |
| Garder une décision en mémoire | `kuate memory add --section architecture` |
| Changer de modèle pour un essai | `kuate spec --choose-ai` · `kuate next --provider openai --model gpt-4o` |
| Changer ou tester une clé | `kuate config ai` |

---

## Dépannage

| Message | Cause | Solution |
|---|---|---|
| `Aucun projet KUATE trouvé. Lancez kuate init d'abord.` | Vous n'êtes pas dans le dossier du projet | `cd` dans le dossier qui contient `.kuate/` |
| `Agent business-analyst introuvable dans .kuate/agents/` | Domaine Business non installé à l'init | `kuate init` puis réinstaller avec « Dev + Business » |
| `Clé manquante pour Claude (Anthropic)…` | Pas de clé pour le provider choisi | `kuate config ai` → ajouter une clé |
| `Erreur IA : … 401 …` | Clé refusée par le fournisseur | `kuate config ai` → modifier la clé, puis la tester |
| `Passation refusée : N erreur(s)…` | La porte n'est pas passée | Corrigez les erreurs listées, relancez `kuate spec analyze` |
| `[G9] Ligne N : « … » ressemble à une définition d'identifiant mais n'a pas le format attendu` | Une story, un critère ou une tâche n'est pas écrit au bon format | Corrigez la ligne : `### US-003 — Titre`, `- AC-004 (US-003) : …`, `### T-004 — Titre` |
| `[G1] … à la ligne N` | Un `TBD`, `TODO`, « à définir » ou `???` reste dans le document | Remplacez-le par la vraie valeur, ou `kuate spec clarify` pour un marqueur `[NEEDS CLARIFICATION]` |
| `[G7] Section « ## Décisions » manquante` | Le document d'architecture est incomplet (réponse IA coupée) | `kuate spec --phase A` → « Réviser » |
| `Aucun fichier attendu détecté dans la réponse` | L'IA n'a pas renvoyé le fichier au format demandé | Relancez `kuate spec` (c'est ponctuel) |

Une commande se comporte bizarrement ? `kuate doctor` donne un diagnostic de l'installation et du projet.

---

## Ce que vous avez appris

- **K·U·A·T·E** : cinq phases, de la découverte à l'évaluation. Ici vous avez fait K, U et A.
- **Des specs en format numéroté** (`US`, `AC`, `T`) qu'un programme peut vérifier.
- **La porte de complétude** : une vérification sans IA qui prouve que rien n'est oublié.
- **La boucle d'une phase** : rédiger, relire, réviser, clarifier, porte.
- **La passation** : des fichiers de tâche autoportants pour qu'un outil de code construise sans deviner.
- **Le cycle** : détecter ce que vos changements rendent périmé, et le remettre à jour sans tout refaire.

### Pour aller plus loin

- [README](../README.md) — toutes les commandes en un coup d'œil
- [Scénario LexiFlow](SCENARIO.md) — un projet plus gros, du début à la fin
- [Tutoriels par phase](tutoriels/README.md) — le détail de chaque phase
- [Référence complète](REFERENCE-COMPLETE.md)
