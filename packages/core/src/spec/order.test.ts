import { describe, it, expect } from 'vitest'
import { orderTasks } from './order.js'

const t = (id: string, depends: string[] = []) => ({ id, depends })

describe('orderTasks', () => {
  it('ordonne une chaîne en niveaux successifs', () => {
    const r = orderTasks([t('T-003', ['T-002']), t('T-002', ['T-001']), t('T-001')])
    expect(r.levels).toEqual([['T-001'], ['T-002'], ['T-003']])
    expect(r.cycle).toBeNull()
  })

  it('regroupe les tâches indépendantes dans le même niveau, par id', () => {
    const r = orderTasks([t('T-003', ['T-001']), t('T-002', ['T-001']), t('T-001')])
    expect(r.levels).toEqual([['T-001'], ['T-002', 'T-003']])
  })

  it('détecte un cycle', () => {
    const r = orderTasks([t('T-001', ['T-002']), t('T-002', ['T-001'])])
    expect(r.cycle).toEqual(['T-001', 'T-002'])
  })

  it('ignore une dépendance vers un id inconnu', () => {
    const r = orderTasks([t('T-001', ['T-999'])])
    expect(r.levels).toEqual([['T-001']])
    expect(r.cycle).toBeNull()
  })
})
