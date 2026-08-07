import { Panel, useReactFlow, useViewport } from '@xyflow/react'
import { Focus, Lock, LockOpen, Minus, Plus } from 'lucide-react'
import { useDiagrammerStore } from '@/store'
import { MAX_ZOOM, MIN_ZOOM, sliderToZoom, zoomToSlider } from '@/lib/zoom'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

const cardClasses =
  'flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-md'

export function BoardControls() {
  const rf = useReactFlow()
  const { zoom } = useViewport()
  const locked = useDiagrammerStore((s) => s.locked)
  const setLocked = useDiagrammerStore((s) => s.setLocked)

  // Float comparisons: React Flow lands a hair off the bound after a
  // zoom step, which would leave the button enabled with nothing to do.
  const atMin = zoom <= MIN_ZOOM + 1e-4
  const atMax = zoom >= MAX_ZOOM - 1e-4

  return (
    <Panel position="bottom-left" className="flex items-center gap-2">
      <div className={cardClasses}>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={atMin}
          onClick={() => rf.zoomOut({ duration: 150 })}
          title="Diminuir zoom"
        >
          <Minus className="size-3.5" />
        </Button>
        <Slider
          className="w-24"
          min={0}
          max={100}
          step={0.5}
          value={[zoomToSlider(zoom)]}
          // No duration while dragging: an animation here fights the pointer.
          onValueChange={([value]) => rf.zoomTo(sliderToZoom(value))}
          aria-label="Zoom"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={atMax}
          onClick={() => rf.zoomIn({ duration: 150 })}
          title="Aumentar zoom"
        >
          <Plus className="size-3.5" />
        </Button>
        <button
          className="min-w-13 rounded-md px-1 text-center text-[11px] font-medium text-muted-foreground tabular-nums hover:bg-muted hover:text-foreground"
          onClick={() => rf.zoomTo(1, { duration: 200 })}
          title="Voltar para 100%"
        >
          {Math.round(zoom * 100)}%
        </button>
      </div>

      <div className={cardClasses}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => rf.fitView({ duration: 400 })}
          title="Centralizar o diagrama"
        >
          <Focus className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className={locked ? 'text-primary' : undefined}
          onClick={() => setLocked(!locked)}
          title={
            locked
              ? 'Board bloqueado — clique para voltar a editar'
              : 'Bloquear edição (navegação continua liberada)'
          }
        >
          {locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
        </Button>
      </div>
    </Panel>
  )
}
