import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react'
import { X } from 'lucide-react'
import { useDiagrammerStore } from '@/store'
import type { RelationshipEdgeType } from '@/types'

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  selected,
}: EdgeProps<RelationshipEdgeType>) {
  const requestRemoveEdge = useDiagrammerStore((s) => s.requestRemoveEdge)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ strokeWidth: selected ? 2.5 : 1.5 }}
      />
      <EdgeLabelRenderer>
        <div
          className="relationship-edge-label nodrag nopan pointer-events-auto absolute flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs shadow-sm"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold">
            {data?.cardinality ?? '1:N'}
          </span>
          {data?.fkName && (
            <span className="text-[11px] text-muted-foreground">{data.fkName}</span>
          )}
          <button
            className="text-muted-foreground hover:text-destructive"
            onClick={() => requestRemoveEdge(id)}
            title="Remover relação"
          >
            <X className="size-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
