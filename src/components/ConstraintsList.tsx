import { Trash2 } from 'lucide-react'
import { useDiagrammerStore } from '@/store'
import type { TableColumn, TableConstraint } from '@/types'
import { Button } from '@/components/ui/button'

interface ConstraintsListProps {
  tableId: string
  constraints: TableConstraint[]
  columns: TableColumn[]
}

/** Shared by the compact TableNode card and the full TableDetailModal. */
export function ConstraintsList({ tableId, constraints, columns }: ConstraintsListProps) {
  const removeConstraint = useDiagrammerStore((s) => s.removeConstraint)

  if (constraints.length === 0) return null

  return (
    <div className="mt-1 flex flex-col gap-1 border-t border-border pt-1">
      {constraints.map((c) => (
        <div key={c.id} className="flex items-center gap-1.5">
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold text-white ${c.color}`}
          >
            {c.name || 'unique'}
          </span>
          <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
            {c.columnIds
              .map((cid) => columns.find((col) => col.id === cid)?.name || '?')
              .join(', ')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="nodrag size-4 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removeConstraint(tableId, c.id)}
            title="Remover constraint"
          >
            <Trash2 className="size-2.5" />
          </Button>
        </div>
      ))}
    </div>
  )
}
