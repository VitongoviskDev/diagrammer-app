import { useEffect, useRef, useState } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import { Trash2 } from 'lucide-react'
import { useDiagrammerStore } from '@/store'
import { GROUP_COLORS, type GroupNodeType } from '@/types'
import { GROUP_COLOR_CLASSES } from '@/lib/groupColors'

export function GroupNode({ id, data }: NodeProps<GroupNodeType>) {
  const updateGroup = useDiagrammerStore((s) => s.updateGroup)
  const removeGroup = useDiagrammerStore((s) => s.removeGroup)
  const locked = useDiagrammerStore((s) => s.locked)

  const palette = GROUP_COLOR_CLASSES[data.color] ?? GROUP_COLOR_CLASSES.slate
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [pickerOpen])

  return (
    // The root carries no border of its own — the dashed box below is the only
    // outline on screen.
    <div className="relative size-full">
      {/* The resizer stays functional but draws nothing: the dashed border is
          what you grab. Its lines are 1px by default, which is near impossible
          to hit, so they're padded out to a ~13px transparent strip straddling
          the border — React Flow's own CSS still supplies the resize cursors.
          Handles are widened the same way so the corners take diagonal drags. */}
      <NodeResizer
        minWidth={220}
        minHeight={160}
        isVisible={!locked}
        lineStyle={{ borderWidth: 6, borderColor: 'transparent' }}
        handleStyle={{
          width: 12,
          height: 12,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        }}
      />

      <div className={`size-full rounded-xl rounded-tl-none border-2 border-dashed ${palette.surface}`} />

      {/* Folder-style tab riding on top of the box's left edge. max-w-[80%]
          clamps it to the box, and the name truncates once it fills that. */}
      <div
        ref={pickerRef}
        className={`absolute bottom-full left-0 -mb-0.5 flex max-w-[80%] items-center gap-1 rounded-t-lg border-2 border-b-0 px-1.5 py-0.5 ${palette.tab}`}
      >
        <button
          className={`nodrag size-3 shrink-0 rounded-full ring-1 ring-background/60 ${palette.swatch}`}
          onClick={() => setPickerOpen((open) => !open)}
          title="Trocar a cor do grupo"
        />
        {/* field-sizing-content makes the input grow with what's typed, so the
            tab hugs the name instead of holding a fixed width. */}
        <input
          className={`nodrag min-w-8 field-sizing-content truncate rounded border border-transparent bg-transparent px-1 py-0.5 text-xs font-semibold outline-none focus:border-border focus:bg-background ${palette.title}`}
          value={data.name}
          placeholder="nome_do_modulo"
          onChange={(e) => updateGroup(id, { name: e.target.value })}
        />
        <button
          className="nodrag shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
          onClick={() => removeGroup(id)}
          title="Excluir grupo (as tabelas permanecem)"
        >
          <Trash2 className="size-3" />
        </button>

        {pickerOpen && (
          <div className="nodrag absolute top-full left-0 z-10 mt-1 flex gap-1 rounded-lg border border-border bg-popover p-1 shadow-md">
            {GROUP_COLORS.map((color) => (
              <button
                key={color}
                className={`size-4 rounded-full ${GROUP_COLOR_CLASSES[color].swatch} ${data.color === color ? 'ring-2 ring-foreground ring-offset-1' : ''
                  }`}
                onClick={() => {
                  updateGroup(id, { color })
                  setPickerOpen(false)
                }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
