# Phase E — Evaluator : Qualité & Évaluation

**Auteur : KUATE JOEL PARFAIT**

> Tutoriel 5/5 — Phase E : l'agent tech-lead évalue la qualité du projet et produit le plan de tests.
> Précédent : [Phase T — Génération de code](04-PHASE-T.md)

---

## Rôle de la Phase E

**E = Evaluator** — Évaluer ce qui a été construit, identifier les risques, planifier les tests.

L'agent relit les specs et le code produit, puis génère un rapport de qualité complet
avec un plan de tests actionnable.

**Livrable :** `docs/evaluation.md`

---

## Prérequis

- `docs/specs.md`, `docs/backlog.md`, `docs/architecture.md` présents (Phase K, U, A)
- Code source généré en Phase T (ou partiellement)
- Agent `tech-lead` installé (fallback : `expert-securite`, `coach-agile`)

---

## Lancer la Phase E

```bash
kuate projet          # propose automatiquement après Phase T
# ou
kuate projet --from E # directement si T déjà fait
# ou
kuate phase E         # phase seule interactive
```

---

## Ce que génère l'agent

Le `tech-lead` produit `docs/evaluation.md` :

```markdown
# Evaluation — MonSaaS

## 1. Critères d'acceptation

| US | Description | Statut | Notes |
|----|-------------|--------|-------|
| US-001 | Créer une facture PDF | OK | src/services/pdf.service.ts |
| US-002 | Gestion des clients | OK | CRUD complet |
| US-003 | Suivi des paiements | A TESTER | Logique présente, tests manquants |
| US-004 | Authentification | OK | JWT + bcrypt implémentés |
| US-005 | Tableau de bord | NON COUVERT | Non implémenté en Phase T |

## 2. Plan de tests

### Tests unitaires prioritaires

```typescript
// tests/auth.test.ts
describe('AuthService', () => {
  it('should hash password on register', async () => {
    const { user } = await authService.register('test@example.com', 'password123')
    expect(user.password).not.toBe('password123')
    expect(await bcrypt.compare('password123', user.password)).toBe(true)
  })

  it('should return JWT on valid login', async () => {
    const { token } = await authService.login('test@example.com', 'password123')
    expect(token).toBeDefined()
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    expect(decoded).toHaveProperty('userId')
  })

  it('should throw on wrong password', async () => {
    await expect(authService.login('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials')
  })
})
```

```typescript
// tests/invoice.test.ts
describe('InvoiceService', () => {
  it('should calculate total TTC correctly', () => {
    const lines = [{ quantity: 2, unitPrice: 100, vatRate: 20 }]
    const total = invoiceService.calculateTotal(lines)
    expect(total.ht).toBe(200)
    expect(total.tva).toBe(40)
    expect(total.ttc).toBe(240)
  })

  it('should auto-increment invoice number', async () => {
    const inv1 = await invoiceService.create({ ... })
    const inv2 = await invoiceService.create({ ... })
    expect(parseInt(inv2.number)).toBe(parseInt(inv1.number) + 1)
  })
})
```

### Tests d'intégration

```typescript
// tests/integration/invoices.test.ts
describe('POST /invoices', () => {
  it('should create invoice and return 201', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId: client.id, lines: [...], dueDate: '2025-12-31' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.status).toBe('DRAFT')
  })

  it('should return 401 without token', async () => {
    const res = await request(app).post('/invoices').send({})
    expect(res.status).toBe(401)
  })
})
```

### Commande pour lancer les tests

```bash
npm test
# ou pour coverage
npx jest --coverage
```

## 3. Audit sécurité OWASP

| Risque | Statut | Action requise |
|--------|--------|----------------|
| A01 — Contrôle d'accès | OK | Middleware JWT sur toutes les routes |
| A02 — Cryptographie | OK | bcrypt cost 12, JWT signé |
| A03 — Injection | OK | Prisma paramétré, pas de SQL brut |
| A04 — Design insécurisé | Attention | Pas de rate limiting sur /auth |
| A05 — Mauvaise config | Attention | Vérifier CORS en production |
| A06 — Composants vulnérables | A vérifier | Lancer `npm audit` |

**Actions prioritaires :**
1. Ajouter `express-rate-limit` sur `/auth/login` (max 10 req/15min)
2. Vérifier CORS origin en production (pas de `*`)
3. `npm audit fix` avant déploiement

## 4. Dette technique identifiée

| Fichier | Problème | Priorité |
|---------|----------|----------|
| src/services/pdf.service.ts | Puppeteer non fermé si erreur | Haute |
| src/routes/invoices.ts | Pagination manquante sur GET /invoices | Moyenne |
| prisma/schema.prisma | Index manquant sur Invoice.status | Moyenne |
| Général | Pas de logger (Winston/Pino) | Faible |

## 5. Rétrospective

**Points forts :**
- Architecture modulaire claire (routes / services / middleware)
- Types TypeScript stricts — peu d'erreurs runtime attendues
- Prisma facilite les migrations et les relations

**Points d'amélioration :**
- Phase T aurait dû inclure les tests d'emblée (TDD)
- PDF service à isoler dans un microservice si volume > 1000 PDF/j
- Pas d'observabilité (pas de logs structurés, pas de métriques)

## 6. Recommandations v2

- Rappels automatiques (email J+7 si facture non payée)
- Application mobile (React Native — API déjà prête)
- Intégration Stripe pour paiement en ligne direct
- Dashboard analytics (CA mensuel, taux de recouvrement)
- Multi-devises (EUR, USD, XAF)
```

---

## Pipeline terminé

```
  [ K ] ── [ U ] ── [ A ] ── [ T ] ── [ E ]

  Livrables generes :
    docs/specs.md
    docs/backlog.md
    docs/architecture.md
    docs/evaluation.md

  Pipeline complet K U A T E termine.
```

---

## Reprendre après correction

Après avoir corrigé les points identifiés en Phase E :

```bash
# Regénérer l'évaluation
kuate projet --from E

# Ou session interactive
kuate phase E
# "Réévalue la sécurité après ajout du rate limiting"
```

---

## Index des commandes utiles

```bash
kuate projet              # pipeline complet depuis le début
kuate projet --from T     # reprendre depuis Phase T
kuate projet --from E     # reprendre depuis Phase E
kuate phase K             # phase seule interactive
kuate run --agent tech-lead --task "Revois la sécurité de src/routes/auth.ts"
kuate next                # suggestions IA pour la prochaine action
kuate memory show         # voir le journal du projet
```

---

*[Revenir au début : Démarrage](00-DEMARRAGE.md) | [Index des tutoriels](README.md)*
