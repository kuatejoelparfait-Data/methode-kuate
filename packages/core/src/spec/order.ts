import type { SpecTask } from './types.js'

export interface TaskOrder {
  /** levels[0] = tâches sans dépendance ; chaque niveau ne dépend que des précédents. */
  levels: string[][]
  /** Ids qui n'ont pu être ordonnés (cycle), sinon null. */
  cycle: string[] | null
}

export function orderTasks(tasks: Pick<SpecTask, 'id' | 'depends'>[]): TaskOrder {
  const known = new Set(tasks.map(t => t.id))
  const remaining = new Map(
    tasks.map(t => [t.id, t.depends.filter(d => known.has(d) && d !== t.id)] as const),
  )
  const placed = new Set<string>()
  const levels: string[][] = []

  while (remaining.size > 0) {
    const level = [...remaining.entries()]
      .filter(([, deps]) => deps.every(d => placed.has(d)))
      .map(([id]) => id)
      .sort()
    if (level.length === 0) return { levels, cycle: [...remaining.keys()].sort() }
    for (const id of level) {
      placed.add(id)
      remaining.delete(id)
    }
    levels.push(level)
  }
  return { levels, cycle: null }
}
