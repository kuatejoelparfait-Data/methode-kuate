# KUATE — Démarrage : Installation & Configuration

**Auteur : KUATE JOEL PARFAIT**

> Tutoriel 0/5 — Prerequis avant de lancer votre premier projet.
> Suivant : [Phase K — Spécifications](01-PHASE-K.md)

---

## Ce que vous allez faire

Installer KUATE, configurer votre clé IA, et initialiser votre projet.
Durée : **5 minutes**.

---

## 1. Installer KUATE

```bash
git clone https://github.com/kuatejoelparfait-Data/methode-kuate.git
cd methode-kuate
npm install
```

Vérifiez :

```bash
kuate --version
# 1.3.0

kuate doctor
# Affiche : Node OK, config, agents
```

---

## 2. Configurer l'IA

KUATE appelle Claude (Anthropic) ou GPT-4 (OpenAI). La clé est stockée localement dans `~/.kuate/global.json` — jamais dans votre projet, jamais dans git.

```bash
kuate config ai
```

```
Provider IA ?
  > Anthropic — Claude (recommande)
    OpenAI — GPT-4

Cle API Anthropic :
  > sk-ant-...  (collez votre cle)

Modele ?
  > claude-opus-4-5  (recommande)
    claude-sonnet-4-5
```

---

## 3. Créer et initialiser votre projet

```bash
mkdir mon-projet
cd mon-projet
git init

kuate init
```

Le wizard en 6 étapes :

```
Etape 1/6  Nom du projet
           > MonSaaS

Etape 2/6  Methodologie
           > Agile

Etape 3/6  Domaine
           > Developpement logiciel

Etape 4/6  Description
           > SaaS de facturation pour PME

Etape 5/6  Agents IA
           > Decrire le projet (IA choisit les agents)

Etape 6/6  Configurer l'IA ?
           > Non (deja fait)
```

Résultat :

```
mon-projet/
  KUATE.md           ← contexte maitre
  .kuate/
    config.json      ← methodologie, domaine
    agents/          ← prompts des agents selectionnes
      business-analyst.md
      chef-projet.md
      architecte-solution.md
      dev-senior.md
      tech-lead.md
    context/
      business.md
      memory.md
```

---

## 4. Lancer le pipeline

```bash
kuate projet
```

Cette commande enchaîne automatiquement toutes les phases K→U→A→T→E.
Vous pouvez aussi lancer chaque phase séparément (voir les tutoriels suivants).

---

## Suite

**Prochain tutoriel :** [Phase K — Spécifications](01-PHASE-K.md)

---

*[Index des tutoriels](README.md)*
