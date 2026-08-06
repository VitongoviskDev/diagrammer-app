import { useEffect, useRef } from 'react'
import { Plus, Waypoints, Focus } from 'lucide-react'

export interface PaneContextMenuState {
  screenX: number
  screenY: number
  flowX: number
  flowY: number
}

interface PaneContextMenuProps {
  state: PaneContextMenuState
  canCreateRelation: boolean
  onCreateTable: () => void
  onCreateRelation: () => void
  onFitView: () => void
  onClose: () => void
}

export function PaneContextMenu({
  state,
  canCreateRelation,
  onCreateTable,
  onCreateRelation,
  onFitView,
  onClose,
}: PaneContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 flex w-56 flex-col gap-0.5 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: state.screenX, top: state.screenY }}
    >
      <button
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
        onClick={onCreateTable}
      >
        <Plus className="size-3.5" /> Criar tabela
      </button>
      <button
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
        disabled={!canCreateRelation}
        title={
          canCreateRelation
            ? undefined
            : 'Selecione 2 tabelas (shift+clique) para habilitar'
        }
        onClick={onCreateRelation}
      >
        <Waypoints className="size-3.5" /> Criar relação
      </button>
      <button
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
        onClick={onFitView}
      >
        <Focus className="size-3.5" /> Centralizar visualização
      </button>
    </div>
  )
}
