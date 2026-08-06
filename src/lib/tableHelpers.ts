import type { TableConstraint } from '@/types'

export const STARTS_WITH_DIGIT = /^[0-9]/

export function invalidNameClasses(invalid: boolean) {
  return invalid ? 'border-destructive! text-destructive focus:border-destructive!' : ''
}

export function groupConstraintsByColumn(constraints: TableConstraint[]) {
  const map = new Map<string, TableConstraint[]>()
  for (const c of constraints) {
    for (const colId of c.columnIds) {
      map.set(colId, [...(map.get(colId) ?? []), c])
    }
  }
  return map
}
