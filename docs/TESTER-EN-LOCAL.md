# Tester la Methode KUATE en local avant publication npm

**Auteur : KUATE JOEL PARFAIT**  
**Objectif : valider que tout fonctionne avant `npm publish`**

---

## Prerequis

Verifiez que vous avez les bons outils installes :

```bash
node --version
```
Attendu : `v20.x.x` ou superieur. Si ce n'est pas le cas, telechargez Node.js sur https://nodejs.org

```bash
npm --version
```
Attendu : `v9.x.x` ou superieur.

```bash
git --version
```
Attendu : n'importe quelle version recente.

---

## Etape 1 — Cloner le depot

```bash
git clone https://github.com/kuatejoelparfait-Data/methode-kuate.git
cd methode-kuate
```

Verifiez que vous etes au bon endroit :

```bash
ls
```

Vous devez voir : `packages/`, `templates/`, `docs/`, `README.md`, `LICENSE`, `package.json`

---

## Etape 2 — Installer les dependances

```bash
npm install
```

Cette commande installe les dependances de tous les packages du monorepo en une seule fois (npm workspaces).

Attendu en sortie :

```
added XXX packages in Xs
```

Aucune erreur ne doit apparaitre.

---

## Etape 3 — Compiler tous les packages

```bash
npm run build
```

Cette commande compile dans l'ordre : `core`, `agents-dev`, `agents-business`, `agents-content`, `agents-education`, puis `cli`.

Attendu :

```
@methode-kuate/core       dist/index.js  5.48 KB   Build success
@methode-kuate/agents-dev dist/index.js  2.38 KB   Build success
...
methode-kuate             dist/index.js  XX KB     Build success
```

Si une erreur apparait, verifiez que Node.js est bien en version 20+.

---

## Etape 4 — Tester le build sans installation

Avant de lier la CLI globalement, testez directement avec node :

```bash
node packages/cli/dist/index.js --version
```

Attendu : `1.0.0`

```bash
node packages/cli/dist/index.js --help
```

Attendu : liste de toutes les commandes (init, agent, workflow, memory, build, conseil, doctor, config).

---

## Etape 5 — Lier la CLI globalement (npm link)

Cette commande rend la commande `kuate` disponible partout sur votre machine, exactement comme si vous aviez fait `npm install -g` :

```bash
npm link --workspace=packages/cli
```

Attendu :

```
added 1 package, and audited X packages in Xs
```

Verifiez que ca fonctionne :

```bash
kuate --version
```

Attendu : `1.0.0`

```bash
kuate --help
```

Attendu : le meme affichage que l'etape 4 mais via la commande globale.

---

## Etape 6 — Creer un dossier de test isole

Ne testez jamais dans le dossier du depot lui-meme. Creez un dossier vide a cote :

```bash
cd ..
mkdir mon-projet-kuate
cd mon-projet-kuate
```

---

## Etape 7 — Tester `kuate doctor`

```bash
kuate doctor
```

Attendu avant initialisation :

```
  KUATE DOCTOR — Diagnostic du projet

  Node.js >= 20          v20.x.x
  npm >= 9               v10.x.x
  .kuate/ present        Lancez kuate init pour initialiser
  config.yaml valide     Projet non initialise
  Agents generes         kuate init requis
  Contexte .kuate/...    kuate init requis

  3 avertissement(s)
```

Les avertissements sont normaux — le projet n'est pas encore initialise.

---

## Etape 8 — Tester `kuate init`

```bash
kuate init
```

Le wizard interactif se lance. Repondez comme suit pour ce test :

```
Nom du projet ?
→ ProjetTest

Langue de travail ?
→ Francais

Methodologie ?
→ Agile / Scrum

Domaines d'agents a installer ?
→ [x] Dev Software   (appuyez Espace pour cocher, Entree pour valider)
```

Attendu en sortie :

```
6 agents generes (Agile/Scrum, fr)
Methode KUATE initialisee avec succes
Tapez kuate help pour commencer
```

Verifiez la structure creee :

```bash
ls .kuate/
```

Attendu : `agents/  config.yaml  context/`

```bash
ls .kuate/agents/
```

Attendu : `architecte-solution.md  dev-senior.md  expert-devops.md  expert-securite.md  qa-strategist.md  tech-lead.md`

```bash
cat .kuate/config.yaml
```

Attendu :

```yaml
project: ProjetTest
lang: fr
method: agile
domains:
  - dev
version: 1.0.0
agents:
  - architecte-solution
  - dev-senior
  - expert-devops
  - expert-securite
  - qa-strategist
  - tech-lead
```

---

## Etape 9 — Tester `kuate agent`

```bash
kuate agent list
```

Attendu : liste des 6 agents avec leur phase et description.

```bash
kuate agent info architecte-solution
```

Attendu :

```
  Architecte Solution / Solution Architect
  ID: architecte-solution
  Phase KUATE : A
  Domaine : dev
  FR : Concoit une architecture systeme scalable (TOGAF)
  EN : Designs scalable system architecture (TOGAF-aware)
```

```bash
kuate agent use dev-senior
```

Attendu : confirmation que le prompt est copie dans le presse-papier.

Verifiez le contenu du prompt :

```bash
cat .kuate/agents/dev-senior.md
```

Le fichier doit contenir le nom du projet `ProjetTest`, la methodologie `Agile/Scrum` et le vocabulaire adapte.

---

## Etape 10 — Tester `kuate workflow`

```bash
kuate workflow list
```

Attendu : liste des 27 workflows repartis par phase K, U, A, T, E. Les workflows Agile sont marques avec `v`.

```bash
kuate workflow list --phase T
```

Attendu : uniquement les workflows de la phase Transformer.

```bash
kuate workflow show sprint-planning
```

Attendu :

```
  Planification du sprint / Sprint planning
  ID      : sprint-planning
  Phase   : U — Unifier
```

---

## Etape 11 — Tester `kuate memory`

Ajoutez une decision dans la memoire du projet :

```bash
kuate memory add --section architecture
```

Saisissez par exemple :

```
Next.js 14 choisi — SSR natif, App Router stable
```

Appuyez sur Entree pour valider.

Verifiez que la decision est enregistree :

```bash
kuate memory show --section architecture
```

Attendu : votre texte avec la date du jour.

Verifiez la vue d'ensemble :

```bash
kuate memory show
```

Attendu : liste des sections avec nombre de lignes et apercu.

Generez le bloc contexte pour vos sessions IA :

```bash
kuate memory inject
```

Attendu :

```
[CONTEXTE KUATE — ProjetTest]
Methode: agile | Langue: FR | Agents: 6

ARCHITECTURE: Next.js 14 choisi — SSR natif, App Router stable

[FIN CONTEXTE]
```

---

## Etape 12 — Tester `kuate build`

```bash
kuate build --target claude
```

Attendu : `Export claude → CLAUDE.md`

Verifiez le fichier genere :

```bash
cat CLAUDE.md | head -20
```

Attendu : en-tete avec le nom du projet, la methodologie, suivi des prompts d'agents.

Testez les autres cibles :

```bash
kuate build --target cursor
cat .cursorrules | head -5

kuate build --target chatgpt
cat chatgpt-instructions.json | head -5
```

---

## Etape 13 — Tester `kuate conseil`

```bash
kuate conseil \
  --agents "architecte-solution,expert-securite" \
  --topic "Comment structurer une API REST securisee ?"
```

Attendu : un bloc de prompt multi-experts s'affiche dans le terminal, pret a etre colle dans Claude ou ChatGPT.

Avec sauvegarde dans la memoire :

```bash
kuate conseil \
  --agents "architecte-solution,tech-lead" \
  --topic "Microservices ou monolithe pour V1 ?" \
  --save
```

Attendu : meme affichage + confirmation de sauvegarde dans `.kuate/context/architecture.md`.

---

## Etape 14 — Tester `kuate config show`

```bash
kuate config show
```

Attendu :

```
  CONFIGURATION KUATE
  ----------------------------------------
  project   ProjetTest
  lang      fr
  method    agile
  domains   dev
  version   1.0.0
  agents    6 installes
```

---

## Etape 15 — Relancer `kuate doctor` (validation finale)

```bash
kuate doctor
```

Attendu apres initialisation complete :

```
  KUATE DOCTOR — Diagnostic du projet

  Node.js >= 20          v20.x.x
  npm >= 9               v10.x.x
  .kuate/ present
  config.yaml valide     projet: ProjetTest, methode: agile
  Agents generes         6 agent(s)
  Contexte .kuate/...

  Tout est en ordre.
```

---

## Etape 16 — Tester avec une autre methodologie

Creez un second dossier de test pour valider une autre methodologie :

```bash
cd ..
mkdir test-pmbok
cd test-pmbok
kuate init
```

Cette fois, choisissez :

```
Nom du projet ?
→ ProjetPMBOK

Methodologie ?
→ PMBOK (Gestion de Projet)

Domaines ?
→ [x] Dev Software
→ [x] Business & Strategie
```

Verifiez que les agents generes sont differents :

```bash
kuate agent list
```

Les agents business (`chef-projet`, `business-analyst`, etc.) doivent apparaitre en plus des agents dev.

---

## Etape 17 — Nettoyer le lien global (optionnel)

Si vous souhaitez retirer la commande `kuate` de votre machine apres les tests :

```bash
npm unlink --global methode-kuate
```

---

## Tout fonctionne ? Publication sur npm

Une fois tous les tests passes, voici les etapes pour publier :

### 1. Verifier que vous etes connecte a npm

```bash
npm whoami
```

Si non connecte :

```bash
npm login
```

### 2. Verifier la version dans package.json

```bash
cat packages/cli/package.json | grep version
```

Pour une premiere publication : `"version": "1.0.0"` est correct.

### 3. Publier le package CLI

```bash
npm publish --workspace=packages/cli --access public
```

Attendu :

```
npm notice Publishing to https://registry.npmjs.org/
+ methode-kuate@1.0.0
```

### 4. Tester l'installation depuis npm

Dans un dossier vide sur n'importe quelle machine :

```bash
npx methode-kuate init
```

Ou en installation globale :

```bash
npm install -g methode-kuate
kuate --version
```

---

## Problemes courants

### "kuate: command not found" apres npm link

Le dossier global de npm n'est pas dans votre PATH. Verifiez avec :

```bash
npm config get prefix
```

Ajoutez le chemin retourne suivi de `/bin` a votre variable PATH.

### "Cannot find module" au demarrage

Le build est incomplet. Relancez depuis la racine du depot :

```bash
npm run build
npm link --workspace=packages/cli
```

### "Aucun projet KUATE trouve"

Vous lancez `kuate agent list` ou une autre commande depuis un dossier qui n'a pas ete initialise. Faites `kuate init` d'abord, ou deplacez-vous dans le bon dossier.

### Erreur de permission sur npm publish

```bash
npm login
npm publish --workspace=packages/cli --access public
```

Si le nom `methode-kuate` est deja pris sur npm, changez le champ `name` dans `packages/cli/package.json` (ex: `@kuatejoelparfait/kuate`) puis relancez.

---

**KUATE JOEL PARFAIT — Methode KUATE v1.0.0 — 2026**  
[linkedin.com/in/joelparfaitkuate](https://www.linkedin.com/in/joelparfaitkuate/)
