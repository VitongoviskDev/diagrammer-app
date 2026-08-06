import { useEffect, useState } from 'react'
import { useDiagrammerStore } from '@/store'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function ConstraintModal() {
  const tableId = useDiagrammerStore((s) => s.constraintModalTableId)
  const nodes = useDiagrammerStore((s) => s.nodes)
  const closeConstraintModal = useDiagrammerStore((s) => s.closeConstraintModal)
  const addConstraint = useDiagrammerStore((s) => s.addConstraint)

  const table = nodes.find((n) => n.id === tableId)
  const open = table !== undefined

  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    setName('')
    setSelected([])
  }, [tableId])

  if (!open || !table) return null

  const toggleColumn = (columnId: string) => {
    setSelected((prev) =>
      prev.includes(columnId) ? prev.filter((c) => c !== columnId) : [...prev, columnId],
    )
  }

  const handleSubmit = () => {
    if (selected.length === 0) return
    addConstraint(table.id, name, selected)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeConstraintModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova constraint — {table.data.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="constraint-name">Nome (opcional)</Label>
          <Input
            id="constraint-name"
            value={name}
            placeholder={`uq_${table.data.name}`}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Colunas (UNIQUE composto)</Label>
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border border-border p-2">
            {table.data.columns.map((col) => (
              <label
                key={col.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(col.id)}
                  onChange={() => toggleColumn(col.id)}
                />
                <span className="flex-1">{col.name || '(sem nome)'}</span>
                <span className="text-xs text-muted-foreground">{col.type}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Selecione 2 ou mais colunas para uma unicidade composta.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeConstraintModal}>
            Cancelar
          </Button>
          <Button disabled={selected.length === 0} onClick={handleSubmit}>
            Criar constraint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

