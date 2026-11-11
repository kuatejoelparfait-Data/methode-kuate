import chalk from 'chalk'
import { statusLabel } from '@methode-kuate/core'
import type { CycleStatus, PhaseStatus, PhaseStatusKind } from '@methode-kuate/core'

export const PHASE_COLORS: Record<string, string> = {
  K: '#FFB300', U: '#FF8C00', A: '#E06000', T: '#C04800', E: '#8B3500',
}

const SYMBOLS: Record<PhaseStatusKind, (s: string) => string> = {
  done: s => chalk.green(`✓ ${s}`),
  validated: s => chalk.cyan(`◆ ${s}`),
  stale: s => chalk.yellow(`⚠ ${s}`),
  skipped: s => chalk.dim(`⤼ ${s}`),
  todo: s => chalk.dim(`○ ${s}`),
}

/** Ligne compacte : K ✓  U ⚠  A ○ ... avec la prochaine phase en gras. */
export function renderTracker(status: CycleStatus): string {
  return status.phases.map(ps => {
    const color = PHASE_COLORS[ps.phase] ?? '#888'
    const label = SYMBOLS[ps.status](ps.phase)
    return ps.phase === status.next ? chalk.bold.hex(color)(`[${label}]`) : ` ${label} `
  }).join(chalk.dim('─'))
}

function shortStatus(ps: PhaseStatus): string {
  switch (ps.status) {
    case 'done': return chalk.green('produite')
    case 'validated': return chalk.cyan('validée')
    case 'stale': return chalk.yellow(`périmée (${ps.staleBecause} modifiée après)`)
    case 'skipped': return chalk.dim('sautée')
    default: return chalk.dim(statusLabel('todo'))
  }
}

function ago(iso?: string): string {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `il y a ${hours} h`
  return `il y a ${Math.round(hours / 24)} j`
}

/** Tableau détaillé des 5 phases + incohérences. */
export function renderCycleTable(status: CycleStatus): string {
  const lines: string[] = []
  for (const ps of status.phases) {
    const color = PHASE_COLORS[ps.phase] ?? '#888'
    const badge = chalk.bold.hex(color)(ps.phase)
    const name = ps.name.padEnd(12)
    const where = ps.artifact ? chalk.dim(`${ps.artifact}  ${ago(ps.modifiedAt)}`) : ''
    const gate = ps.gate
      ? ps.gate.errors === 0
        ? chalk.green('  porte : complète')
        : chalk.yellow(`  porte : ${ps.gate.errors} erreur(s)`)
      : ''
    lines.push(`  ${badge}  ${name} ${shortStatus(ps).padEnd(40)} ${where}${gate}`)
  }
  if (status.issues.length > 0) {
    lines.push('', chalk.yellow('  Incohérences :'))
    for (const issue of status.issues) lines.push(chalk.dim(`    · ${issue}`))
  }
  if (status.next) {
    lines.push('', `  Prochaine phase : ${chalk.bold(status.next)}`)
  } else {
    lines.push('', chalk.green('  Cycle à jour.'))
  }
  return lines.join('\n')
}
