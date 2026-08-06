import { useEffect, useRef } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Maximize2, Plus, Trash2, Waypoints } from 'lucide-react'
import { useDiagrammerStore } from '@/store'
import type { TableNodeType } from '@/types'
import { invalidNameClasses, groupConstraintsByColumn, STARTS_WITH_DIGIT } from '@/lib/tableHelpers'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { ColumnRow } from '@/components/ColumnRow'
import { ConstraintsList } from '@/components/ConstraintsList'

const handleStyle = 'h-2! w-2! bg-primary! border-background! border-2! relative'

/** Two staggered rings so a new one appears ~75% into the previous one's cycle. */
function RadarRings({ variant }: { variant: 'in' | 'out' }) {
  const cls = variant === 'in' ? 'radar-ring-in' : 'radar-ring-out'
  return (
    <>
      <span className={cls} style={{ animationDelay: '0s' }} />
      <span className={cls} style={{ animationDelay: '1.05s' }} />
    </>
  )
}

export function TableNode({ id, data, selected }: NodeProps<TableNodeType>) {
  const updateTableName = useDiagrammerStore((s) => s.updateTableName)
  const formatTableName = useDiagrammerStore((s) => s.formatTableName)
  const addColumn = useDiagrammerStore((s) => s.addColumn)
  const requestRemoveTable = useDiagrammerStore((s) => s.requestRemoveTable)
  const startLinking = useDiagrammerStore((s) => s.startLinking)
  const openConstraintModal = useDiagrammerStore((s) => s.openConstraintModal)
  const openTableDetail = useDiagrammerStore((s) => s.openTableDetail)
  const linkingFrom = useDiagrammerStore((s) => s.linkingFrom)
  const isLinkingSource = linkingFrom === id
  const reconnecting = useDiagrammerStore((s) => s.reconnecting)
  const edges = useDiagrammerStore((s) => s.edges)
  const ctrlHeld = useDiagrammerStore((s) => s.ctrlHeld)
  const justCreatedTableId = useDiagrammerStore((s) => s.justCreatedTableId)
  const clearJustCreatedTable = useDiagrammerStore((s) => s.clearJustCreatedTable)

  const nameInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (justCreatedTableId === id) {
      // A same-frame/RAF focus() loses to the click that created this node
      // (button retains it); a short delay past that settles it reliably.
      const timer = window.setTimeout(() => {
        nameInputRef.current?.focus()
        nameInputRef.current?.select()
      }, 60)
      clearJustCreatedTable()
      return () => window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isReconnectTarget = reconnecting?.allowedTableId === id
  const isReconnectDimmed = reconnecting !== null && !isReconnectTarget

  // Before a reconnect drag starts: while Ctrl is held on a single selected
  // edge, show a "grab me" outward ring on the handle it currently uses.
  const selectedEdges = ctrlHeld && !reconnecting ? edges.filter((e) => e.selected) : []
  const selectedEdge = selectedEdges.length === 1 ? selectedEdges[0] : undefined
  const grabbableHandle =
    selectedEdge?.source === id
      ? selectedEdge.sourceHandle
      : selectedEdge?.target === id
        ? selectedEdge.targetHandle
        : undefined

  const constraintsByColumnId = groupConstraintsByColumn(data.constraints)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onContextMenu={(e) => e.stopPropagation()}>
        <div
          className={`w-72 rounded-lg border bg-card text-card-foreground shadow-md transition-[opacity,filter] duration-150 ${
            isReconnectTarget
              ? 'border-primary ring-2 ring-primary/60'
              : isLinkingSource
                ? 'border-primary ring-2 ring-primary/60'
                : selected
                  ? 'border-primary ring-2 ring-primary/40'
                  : 'border-border'
          } ${isReconnectDimmed ? 'pointer-events-none opacity-30 blur-[1.5px]' : ''}`}
        >
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Handle
          key={side}
          id={side}
          type="source"
          position={
            side === 'top'
              ? Position.Top
              : side === 'right'
                ? Position.Right
                : side === 'bottom'
                  ? Position.Bottom
                  : Position.Left
          }
          className={handleStyle}
        >
          {isReconnectTarget && <RadarRings variant="in" />}
          {grabbableHandle === side && <RadarRings variant="out" />}
        </Handle>
      ))}

      <div className="flex items-center gap-1 rounded-t-lg border-b border-border bg-muted/50 px-2 py-1.5">
        <input
          ref={nameInputRef}
          className={`nodrag min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold outline-none focus:bg-background ${invalidNameClasses(STARTS_WITH_DIGIT.test(data.name))}`}
          value={data.name}
          onChange={(e) => updateTableName(id, e.target.value)}
          onBlur={() => formatTableName(id)}
          placeholder="nome_da_tabela"
          title={STARTS_WITH_DIGIT.test(data.name) ? 'Nome não pode começar com número' : undefined}
        />
        <Button
          variant="ghost"
          size="icon"
          className="nodrag size-6 text-muted-foreground hover:text-foreground"
          onClick={() => openTableDetail(id)}
          title="Visualizar em detalhe"
        >
          <Maximize2 className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="nodrag size-6 text-muted-foreground hover:text-destructive"
          onClick={() => requestRemoveTable(id)}
          title="Excluir tabela"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-1 p-2">
        {data.columns.map((col) => (
          <ColumnRow
            key={col.id}
            tableId={id}
            column={col}
            memberConstraints={constraintsByColumnId.get(col.id) ?? []}
          />
        ))}

        <ConstraintsList tableId={id} constraints={data.constraints} columns={data.columns} />

        <div className="mt-1 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="nodrag h-6 flex-1 justify-start gap-1 text-xs text-muted-foreground"
            onClick={() => addColumn(id)}
          >
            <Plus className="size-3" /> coluna
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="nodrag h-6 flex-1 justify-start gap-1 text-xs text-muted-foreground"
            onClick={() => openConstraintModal(id)}
          >
            <Plus className="size-3" /> constraint
          </Button>
        </div>
      </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => openTableDetail(id)}>
          <Maximize2 className="size-3.5" /> Visualizar em detalhe
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => startLinking(id)}>
          <Waypoints className="size-3.5" /> Criar relação...
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onSelect={() => requestRemoveTable(id)}>
          <Trash2 className="size-3.5" /> Excluir tabela
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
