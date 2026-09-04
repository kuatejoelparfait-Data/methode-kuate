/**
 * kuate dev — Phase "Run" : de src/ à une application fonctionnelle
 *
 * Apres la Phase T (code genere) et Phase E (evaluation) :
 *   1. Detecte le package manager et installe les dependances
 *   2. Configure la base de donnees (Prisma migrate si schema present)
 *   3. Lance le serveur de dev en arriere-plan
 *   4. Execute les tests
 *   5. Sur echec : boucle agents — l'IA lit l'erreur et corrige le fichier
 *   6. Relance les tests — repete jusqu'a passage ou abandon
 *   7. Affiche l'URL locale finale
 */

import path from 'node:path'
import fs from 'fs-extra'
import { spawn, execSync, type ChildProcess } from 'node:child_process'
import chalk from 'chalk'
import * as p from '@clack/prompts'
import {
  isKuateProject,
  readConfig,
  readGlobalAiConfig,
  runAgent,
  detectFilesInOutput,
  PROVIDER_LABELS,
} from '@methode-kuate/core'
import { initI18n } from '../i18n/index.js'

// ── Types ──────────────────────────────────────────────────────────────────────

interface TestResult {
  passed: boolean
  output: string
  failures: TestFailure[]
}

interface TestFailure {
  file: string
  testName: string
  error: string
  sourceFile?: string
}

// ── Utilitaires ──────────────────────────────────────────────────────────────

function detectPackageManager(cwd: string): 'npm' | 'yarn' | 'pnpm' {
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

function detectPort(cwd: string): number {
  // Cherche dans .env, package.json scripts, ou src/index.ts
  const envFile = path.join(cwd, '.env')
  if (fs.existsSync(envFile)) {
    const env = fs.readFileSync(envFile, 'utf-8')
    const m = env.match(/PORT\s*=\s*(\d+)/)
    if (m) return parseInt(m[1])
  }
  const envExample = path.join(cwd, '.env.example')
  if (fs.existsSync(envExample)) {
    const env = fs.readFileSync(envExample, 'utf-8')
    const m = env.match(/PORT\s*=\s*(\d+)/)
    if (m) return parseInt(m[1])
  }
  return 3000
}

function detectTestCommand(cwd: string, pm: string): string {
  const pkg = path.join(cwd, 'package.json')
  if (fs.existsSync(pkg)) {
    const json = fs.readJsonSync(pkg) as { scripts?: Record<string, string> }
    if (json.scripts?.test && !json.scripts.test.includes('no test')) {
      return `${pm} test`
    }
    if (json.scripts?.['test:unit']) return `${pm} run test:unit`
  }
  // Fallback
  if (fs.existsSync(path.join(cwd, 'node_modules', '.bin', 'jest'))) return 'npx jest'
  if (fs.existsSync(path.join(cwd, 'node_modules', '.bin', 'vitest'))) return 'npx vitest run'
  if (fs.existsSync(path.join(cwd, 'node_modules', '.bin', 'mocha'))) return 'npx mocha'
  return `${pm} test`
}

function detectDevCommand(cwd: string, pm: string): string {
  const pkg = path.join(cwd, 'package.json')
  if (fs.existsSync(pkg)) {
    const json = fs.readJsonSync(pkg) as { scripts?: Record<string, string> }
    if (json.scripts?.dev) return `${pm} run dev`
    if (json.scripts?.start) return `${pm} start`
    if (json.scripts?.serve) return `${pm} run serve`
  }
  return `${pm} run dev`
}

function parseTestFailures(output: string): TestFailure[] {
  const failures: TestFailure[] = []

  // Jest / Vitest pattern : FAIL src/... + ● test name
  const failFilePattern = /FAIL\s+([\w./\\-]+\.(?:test|spec)\.[tj]sx?)/g
  const failMsgPattern = /●\s+(.+?)\n\n([\s\S]+?)(?=●|\n\n[A-Z]|$)/g

  let fileMatch: RegExpExecArray | null
  const failedFiles: string[] = []
  while ((fileMatch = failFilePattern.exec(output)) !== null) {
    failedFiles.push(fileMatch[1])
  }

  let msgMatch: RegExpExecArray | null
  let i = 0
  while ((msgMatch = failMsgPattern.exec(output)) !== null) {
    const testName = msgMatch[1].trim()
    const errorBlock = msgMatch[2].trim().slice(0, 600)
    failures.push({
      file: failedFiles[i] ?? 'unknown',
      testName,
      error: errorBlock,
      sourceFile: guessSourceFile(testName, errorBlock),
    })
    i++
  }

  // Mocha pattern : passing/failing summary
  if (failures.length === 0) {
    const mochaPattern = /(\d+) failing\n([\s\S]+?)(?=\n\d+ passing|$)/
    const mochaMatch = output.match(mochaPattern)
    if (mochaMatch) {
      const block = mochaMatch[2]
      const items = block.split(/\n\s+\d+\)/)
      for (const item of items.slice(1)) {
        const lines = item.trim().split('\n')
        failures.push({
          file: 'test',
          testName: lines[0]?.trim() ?? 'unknown',
          error: lines.slice(1).join('\n').trim().slice(0, 400),
        })
      }
    }
  }

  return failures
}

function guessSourceFile(testName: string, error: string): string | undefined {
  // Cherche "at src/..." dans la stack trace
  const m = error.match(/at\s+[\w.]+\s+\((src\/[\w./\\-]+\.[tj]sx?):\d+:\d+\)/)
  if (m) return m[1]
  // Ou un import dans le test
  const imp = error.match(/Cannot find module '([^']+)'/)
  if (imp) return imp[1]
  return undefined
}

// ── Install ───────────────────────────────────────────────────────────────────

async function runInstall(cwd: string, pm: string): Promise<boolean> {
  const spin = p.spinner()
  spin.start(`Installation des dependances (${pm} install)...`)
  try {
    execSync(`${pm} install`, { cwd, stdio: 'pipe', timeout: 120_000 })
    spin.stop(chalk.green('Dependances installees'))
    return true
  } catch (err) {
    const msg = (err as { stderr?: Buffer }).stderr?.toString().slice(0, 300) ?? String(err)
    spin.stop(chalk.red(`Erreur install : ${msg}`))
    return false
  }
}

// ── Prisma ────────────────────────────────────────────────────────────────────

async function runPrismaMigrate(cwd: string): Promise<void> {
  const schemaPath = path.join(cwd, 'prisma', 'schema.prisma')
  if (!fs.existsSync(schemaPath)) return

  const spin = p.spinner()
  spin.start('Prisma schema detecte — migration dev...')
  try {
    execSync('npx prisma generate', { cwd, stdio: 'pipe', timeout: 60_000 })
    execSync('npx prisma migrate dev --name init --skip-seed', {
      cwd, stdio: 'pipe', timeout: 60_000,
    })
    spin.stop(chalk.green('Prisma : client genere + migration appliquee'))
  } catch {
    spin.stop(chalk.yellow('Prisma migrate : verifiez DATABASE_URL dans .env'))
  }
}

// ── Dev server ────────────────────────────────────────────────────────────────

async function startDevServer(
  cwd: string,
  devCmd: string,
  port: number,
): Promise<ChildProcess | null> {
  return new Promise((resolve) => {
    const spin = p.spinner()
    spin.start(`Demarrage du serveur (${devCmd})...`)

    const [cmd, ...args] = devCmd.split(' ')
    const child = spawn(cmd, args, {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: String(port) },
    })

    let started = false
    const timeout = setTimeout(() => {
      if (!started) {
        started = true
        spin.stop(chalk.yellow(`Serveur lance (timeout — verifiez localhost:${port})`))
        resolve(child)
      }
    }, 15_000)

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      if (!started && (
        text.includes('listen') || text.includes('running') ||
        text.includes('started') || text.includes('ready') ||
        text.includes(String(port))
      )) {
        started = true
        clearTimeout(timeout)
        spin.stop(chalk.green(`Serveur pret : http://localhost:${port}`))
        resolve(child)
      }
    })

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      if (!started && text.includes(String(port))) {
        started = true
        clearTimeout(timeout)
        spin.stop(chalk.green(`Serveur pret : http://localhost:${port}`))
        resolve(child)
      }
    })

    child.on('error', () => {
      clearTimeout(timeout)
      spin.stop(chalk.red('Serveur ne demarre pas — verifiez les logs'))
      resolve(null)
    })
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function runTests(cwd: string, testCmd: string): Promise<TestResult> {
  const spin = p.spinner()
  spin.start(`Tests en cours (${testCmd})...`)

  return new Promise((resolve) => {
    let output = ''
    const [cmd, ...args] = testCmd.split(' ')
    const child = spawn(cmd, args, {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1', NODE_ENV: 'test' },
    })

    child.stdout?.on('data', (d: Buffer) => { output += d.toString() })
    child.stderr?.on('data', (d: Buffer) => { output += d.toString() })

    child.on('close', (code) => {
      const passed = code === 0
      const failures = passed ? [] : parseTestFailures(output)

      if (passed) {
        spin.stop(chalk.green('Tous les tests passent'))
      } else {
        spin.stop(chalk.red(`${failures.length > 0 ? failures.length : 'Certains'} test(s) echoue(s)`))
      }

      resolve({ passed, output, failures })
    })

    child.on('error', () => {
      spin.stop(chalk.yellow('Impossible de lancer les tests'))
      resolve({ passed: false, output: '', failures: [] })
    })
  })
}

// ── Boucle agents de correction ────────────────────────────────────────────────

async function agentFixLoop(
  cwd: string,
  failures: TestFailure[],
  testOutput: string,
  aiConfig: NonNullable<Awaited<ReturnType<typeof readGlobalAiConfig>>>,
  testCmd: string,
  attempt: number,
): Promise<boolean> {
  const MAX_ATTEMPTS = 3

  if (attempt > MAX_ATTEMPTS) {
    p.log.warn(`${MAX_ATTEMPTS} tentatives epuisees. Corrections manuelles requises.`)
    return false
  }

  console.log()
  console.log(chalk.bold.red(`  Echecs detectes (tentative ${attempt}/${MAX_ATTEMPTS}) :`))
  console.log()

  for (let i = 0; i < Math.min(failures.length, 5); i++) {
    const f = failures[i]
    console.log(`  ${chalk.bold.red(`${i + 1}.`)} ${chalk.bold(f.testName)}`)
    if (f.file !== 'unknown') console.log(chalk.dim(`     Fichier test : ${f.file}`))
    if (f.sourceFile) console.log(chalk.dim(`     Fichier source : ${f.sourceFile}`))
    console.log(chalk.red(`     ${f.error.split('\n')[0]}`))
    console.log()
  }

  if (failures.length > 5) {
    console.log(chalk.dim(`  ... et ${failures.length - 5} autres echecs`))
    console.log()
  }

  // Lire les fichiers sources concernés pour contexte
  const sourceFiles: Record<string, string> = {}
  for (const f of failures) {
    if (f.sourceFile) {
      const fullPath = path.join(cwd, f.sourceFile)
      if (fs.existsSync(fullPath)) {
        sourceFiles[f.sourceFile] = (await fs.readFile(fullPath, 'utf-8')).slice(0, 2000)
      }
    }
    if (f.file !== 'unknown') {
      const fullPath = path.join(cwd, f.file)
      if (fs.existsSync(fullPath)) {
        sourceFiles[f.file] = (await fs.readFile(fullPath, 'utf-8')).slice(0, 2000)
      }
    }
  }

  // Choisir le mode de correction
  const agentsDir = path.join(cwd, '.kuate', 'agents')
  const fixAgents = ['dev-senior', 'tech-lead', 'expert-securite'].filter(id =>
    fs.existsSync(path.join(agentsDir, `${id}.md`))
  )

  const agentChoice = fixAgents.length > 0
    ? await p.select<{ value: string; label: string }[], string>({
        message: 'Quel agent corriger les erreurs ?',
        options: [
          ...fixAgents.map(id => ({ value: id, label: id })),
          { value: '__SKIP__', label: chalk.dim('Ignorer — continuer sans corriger') },
          { value: '__BACK__', label: chalk.dim('Arreter') },
        ],
      })
    : '__SKIP__'

  if (p.isCancel(agentChoice) || agentChoice === '__BACK__') return false
  if (agentChoice === '__SKIP__') return false

  // Construire le prompt de correction
  const failureSummary = failures.slice(0, 5).map((f, i) =>
    `${i + 1}. Test : "${f.testName}"\n   Erreur : ${f.error.slice(0, 300)}`
  ).join('\n\n')

  const fileContext = Object.entries(sourceFiles).map(([name, content]) =>
    `### ${name}\n\`\`\`typescript\n${content}\n\`\`\``
  ).join('\n\n')

  const fixTask = `Tu dois corriger les erreurs de tests suivantes.

## Erreurs de tests

${failureSummary}

## Fichiers sources concernés

${fileContext}

## Sortie complète des tests

\`\`\`
${testOutput.slice(-2000)}
\`\`\`

Analyse les erreurs et génère les fichiers corrigés.
Pour CHAQUE fichier modifié, utilise ce format exact :

\`\`\`typescript
// chemin/exact/du/fichier.ts
...code complet corrige...
\`\`\`

Un bloc par fichier. Ne génère que les fichiers qui ont besoin d'être corrigés.`

  let fixOutput = ''
  console.log()
  console.log(chalk.dim('  ─'.repeat(28)))
  console.log()

  try {
    const result = await runAgent({
      agentId: agentChoice,
      task: fixTask,
      cwd,
      aiConfig,
      onChunk: (chunk) => {
        process.stdout.write(chunk)
        fixOutput += chunk
      },
    })
    fixOutput = result.content
  } catch (err) {
    console.error(chalk.red(`\n  Erreur agent : ${(err as Error).message}`))
    return false
  }

  console.log('\n')

  // Appliquer les corrections
  const fixedFiles = detectFilesInOutput(fixOutput)
  if (fixedFiles.length === 0) {
    p.log.warn('Aucun fichier corrige detecte dans la reponse.')
    return false
  }

  for (const f of fixedFiles) {
    const fullPath = path.join(cwd, f.filename)
    await fs.ensureDir(path.dirname(fullPath))
    await fs.writeFile(fullPath, f.content, 'utf-8')
    console.log(chalk.green(`  Corrige : ${f.filename}`))
  }

  console.log()

  // Relancer les tests
  const newResult = await runTests(cwd, testCmd)

  if (newResult.passed) {
    return true
  }

  if (newResult.failures.length >= failures.length && attempt >= 2) {
    p.log.warn('Pas de progression. Corrections manuelles recommandees.')
    return false
  }

  // Recurse
  return agentFixLoop(cwd, newResult.failures, newResult.output, aiConfig, testCmd, attempt + 1)
}

// ── Boucle interactive post-lancement ─────────────────────────────────────────

async function interactiveDevLoop(
  cwd: string,
  aiConfig: NonNullable<Awaited<ReturnType<typeof readGlobalAiConfig>>>,
  port: number,
  testCmd: string,
  serverProcess: ChildProcess | null,
): Promise<void> {
  const agentsDir = path.join(cwd, '.kuate', 'agents')
  const available = fs.existsSync(agentsDir)
    ? (await fs.readdir(agentsDir))
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace('.md', ''))
    : []

  console.log()
  console.log(chalk.bold.hex('#C04800')('  Terminal agents — projet en cours'))
  console.log(chalk.dim(`  Serveur : http://localhost:${port}`))
  console.log(chalk.dim('  Agents disponibles : ' + available.slice(0, 5).join(', ') + (available.length > 5 ? '...' : '')))
  console.log(chalk.dim('  Entree vide = quitter le terminal agents'))
  console.log()

  while (true) {
    const action = await p.select<{ value: string; label: string; hint?: string }[], string>({
      message: 'Que faire ?',
      options: [
        {
          value: 'agent',
          label: 'Demander a un agent de continuer le developpement',
          hint: 'Nouvelles features, corrections, refactoring',
        },
        {
          value: 'tests',
          label: 'Relancer les tests',
        },
        {
          value: 'server',
          label: serverProcess ? 'Redemarrer le serveur' : 'Lancer le serveur',
        },
        {
          value: '__QUIT__',
          label: chalk.dim('Terminer'),
        },
      ],
    })

    if (p.isCancel(action) || action === '__QUIT__') break

    if (action === 'tests') {
      const result = await runTests(cwd, testCmd)
      if (!result.passed && result.failures.length > 0) {
        const fix = await p.confirm({ message: 'Corriger avec un agent ?', initialValue: true })
        if (!p.isCancel(fix) && fix) {
          await agentFixLoop(cwd, result.failures, result.output, aiConfig, testCmd, 1)
        }
      }
      continue
    }

    if (action === 'server') {
      if (serverProcess) {
        serverProcess.kill()
        p.log.info('Serveur arrete.')
      }
      const devCmd = detectDevCommand(cwd, detectPackageManager(cwd))
      await startDevServer(cwd, devCmd, port)
      continue
    }

    if (action === 'agent') {
      if (available.length === 0) {
        p.log.warn('Aucun agent installe.')
        continue
      }

      const agentOpts = available.map(id => ({ value: id, label: id }))
      agentOpts.push({ value: '__BACK__', label: chalk.dim('Retour') })

      const selectedAgent = await p.select<{ value: string; label: string }[], string>({
        message: 'Choisir un agent :',
        options: agentOpts,
      })

      if (p.isCancel(selectedAgent) || selectedAgent === '__BACK__') continue

      const task = await p.text({
        message: 'Tache a realiser :',
        placeholder: 'ex: Ajoute la route GET /stats avec le CA mensuel',
      })

      if (p.isCancel(task) || !task.trim()) continue

      const FILE_FORMAT = `\n\nFormat obligatoire pour chaque fichier :\n\`\`\`typescript\n// chemin/exact/fichier.ts\n...code complet...\n\`\`\`\nUn bloc par fichier.`

      let output = ''
      console.log()
      console.log(chalk.dim('  ' + '-'.repeat(55)))
      console.log()

      try {
        const result = await runAgent({
          agentId: selectedAgent,
          task: task + FILE_FORMAT,
          cwd,
          aiConfig,
          onChunk: (chunk) => {
            process.stdout.write(chunk)
            output += chunk
          },
        })
        output = result.content
      } catch (err) {
        console.error(chalk.red(`\n  Erreur : ${(err as Error).message}`))
        continue
      }

      console.log('\n')

      const files = detectFilesInOutput(output)
      for (const f of files) {
        const fullPath = path.join(cwd, f.filename)
        await fs.ensureDir(path.dirname(fullPath))
        await fs.writeFile(fullPath, f.content, 'utf-8')
        console.log(chalk.green(`  ${f.filename}`))
      }

      if (files.length > 0) {
        const retest = await p.confirm({ message: 'Relancer les tests ?', initialValue: true })
        if (!p.isCancel(retest) && retest) {
          const result = await runTests(cwd, testCmd)
          if (!result.passed && result.failures.length > 0) {
            const fix = await p.confirm({ message: 'Corriger les echecs avec un agent ?', initialValue: true })
            if (!p.isCancel(fix) && fix) {
              await agentFixLoop(cwd, result.failures, result.output, aiConfig, testCmd, 1)
            }
          }
        }
      }
    }
  }

  if (serverProcess) {
    serverProcess.kill()
    console.log(chalk.dim('\n  Serveur arrete.'))
  }
}

// ── Entrée principale ─────────────────────────────────────────────────────────

export async function devCommand(cwd: string): Promise<void> {
  if (!isKuateProject(cwd)) {
    console.error(chalk.red("Aucun projet KUATE trouve. Lancez kuate init d'abord."))
    process.exit(1)
  }

  const config = await readConfig(cwd)
  initI18n(config.lang)

  const aiConfig = await readGlobalAiConfig()
  if (!aiConfig) {
    console.error(chalk.red('IA non configuree. Lancez kuate config ai.'))
    process.exit(1)
  }

  // Verifier qu'il y a du code
  const hasSrc = fs.existsSync(path.join(cwd, 'src')) ||
                 fs.existsSync(path.join(cwd, 'app')) ||
                 fs.existsSync(path.join(cwd, 'lib'))

  if (!hasSrc) {
    p.log.warn('Aucun dossier src/ detecte. Lancez kuate projet (Phase T) pour generer le code.')
    return
  }

  console.log()
  console.log(chalk.bold.hex('#C04800')(`  kuate dev — ${config.project}`))
  console.log(chalk.dim(`  ${PROVIDER_LABELS[aiConfig.provider]} / ${aiConfig.model}`))
  console.log()

  const pm = detectPackageManager(cwd)
  const port = detectPort(cwd)
  const testCmd = detectTestCommand(cwd, pm)
  const devCmd = detectDevCommand(cwd, pm)

  console.log(chalk.dim(`  Package manager : ${pm}`))
  console.log(chalk.dim(`  Port detecte    : ${port}`))
  console.log(chalk.dim(`  Commande tests  : ${testCmd}`))
  console.log(chalk.dim(`  Commande dev    : ${devCmd}`))
  console.log()

  // Verifier .env
  const hasEnv = fs.existsSync(path.join(cwd, '.env'))
  if (!hasEnv) {
    const hasEnvExample = fs.existsSync(path.join(cwd, '.env.example'))
    if (hasEnvExample) {
      p.log.warn('.env manquant. Creez-le depuis .env.example :')
      console.log(chalk.cyan(`  cp .env.example .env`))
      console.log(chalk.dim('  Puis remplissez DATABASE_URL, JWT_SECRET, etc.'))
      const cont = await p.confirm({ message: 'Continuer quand meme ?', initialValue: false })
      if (p.isCancel(cont) || !cont) return
    }
  }

  // Verifier package.json
  const hasPkg = fs.existsSync(path.join(cwd, 'package.json'))
  if (!hasPkg) {
    p.log.warn('Pas de package.json. Le code genere est peut-etre incomplet.')
    return
  }

  // 1. Install
  const installed = await runInstall(cwd, pm)
  if (!installed) {
    const cont = await p.confirm({ message: 'Installation echouee. Continuer quand meme ?', initialValue: false })
    if (p.isCancel(cont) || !cont) return
  }

  // 2. Prisma
  await runPrismaMigrate(cwd)

  // 3. Lancer les tests d'abord
  console.log()
  const startChoice = await p.select<{ value: string; label: string }[], string>({
    message: 'Par ou commencer ?',
    options: [
      { value: 'tests', label: chalk.green('Lancer les tests') },
      { value: 'server', label: 'Lancer le serveur de dev' },
      { value: 'both', label: chalk.bold('Tests puis serveur') },
      { value: '__BACK__', label: chalk.dim('Annuler') },
    ],
  })

  if (p.isCancel(startChoice) || startChoice === '__BACK__') return

  let testsPassed = false
  let serverProcess: ChildProcess | null = null

  if (startChoice === 'tests' || startChoice === 'both') {
    const result = await runTests(cwd, testCmd)
    testsPassed = result.passed

    if (!result.passed) {
      if (result.failures.length > 0) {
        const fix = await p.confirm({
          message: `${result.failures.length} test(s) echoue(s). Laisser un agent corriger ?`,
          initialValue: true,
        })
        if (!p.isCancel(fix) && fix) {
          testsPassed = await agentFixLoop(cwd, result.failures, result.output, aiConfig, testCmd, 1)
        }
      } else {
        // Pas de failures parsees — afficher la sortie brute
        console.log()
        console.log(chalk.dim(result.output.slice(-1000)))
      }
    }
  }

  if (startChoice === 'server' || startChoice === 'both') {
    console.log()
    serverProcess = await startDevServer(cwd, devCmd, port)
    if (serverProcess) {
      console.log()
      console.log(chalk.bold.green(`  Application disponible : http://localhost:${port}`))
    }
  }

  // 4. Boucle interactive
  console.log()
  if (testsPassed) {
    console.log(chalk.bold.green('  Tests : OK'))
  }

  await interactiveDevLoop(cwd, aiConfig, port, testCmd, serverProcess)

  // Résumé
  console.log()
  console.log(chalk.dim('  Session dev terminee.'))
  console.log(chalk.dim('  Pour reprendre : ') + chalk.cyan('kuate dev'))
  console.log()
}
