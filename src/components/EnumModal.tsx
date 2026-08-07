import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useDiagrammerStore } from '@/store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface DraftOption {
  /** Local-only key so rows stay stable while typing. */
  key: number
  /** Set for options that already exist in the stored enum. */
  id?: string
  label: string
  value: string
}

let nextKey = 1
function newDraftOption(): DraftOption {
  return { key: nextKey++, label: '', value: '' }
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

export function EnumModal() {
  const enumModalRequest = useDiagrammerStore((s) => s.enumModalRequest)
  const enums = useDiagrammerStore((s) => s.enums)
  const closeEnumModal = useDiagrammerStore((s) => s.closeEnumModal)
  const createEnum = useDiagrammerStore((s) => s.createEnum)
  const updateEnum = useDiagrammerStore((s) => s.updateEnum)

  const open = enumModalRequest !== null
  const editingId = enumModalRequest?.mode === 'edit' ? enumModalRequest.enumId : null
  const editing = editingId ? enums.find((en) => en.id === editingId) : undefined

  // A number selector, so editing table positions doesn't re-render the modal.
  const usageCount = useDiagrammerStore((s) =>
    editingId
      ? s.nodes.reduce(
          (total, node) =>
            total + node.data.columns.filter((c) => c.enumId === editingId).length,
          0,
        )
      : 0,
  )

  const [name, setName] = useState('')
  const [options, setOptions] = useState<DraftOption[]>([newDraftOption(), newDraftOption()])

  // Reloads the form whenever the modal is (re)opened. Reads the enum through
  // getState() so that saving — which changes `enums` — can't reset the form
  // out from under the user mid-edit.
  useEffect(() => {
    if (!enumModalRequest) return
    if (enumModalRequest.mode === 'edit') {
      const target = useDiagrammerStore
        .getState()
        .enums.find((en) => en.id === enumModalRequest.enumId)
      setName(target?.name ?? '')
      setOptions(
        target?.options.length
          ? target.options.map((o) => ({ key: nextKey++, id: o.id, label: o.label, value: o.value }))
          : [newDraftOption()],
      )
    } else {
      setName('')
      setOptions([newDraftOption(), newDraftOption()])
    }
  }, [enumModalRequest])

  if (!open) return null

  const updateOption = (key: number, patch: Partial<DraftOption>) => {
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, ...patch } : o)))
  }

  const removeOption = (key: number) => {
    setOptions((prev) => prev.filter((o) => o.key !== key))
  }

  const canSubmit =
    name.trim().length > 0 && options.some((o) => o.label.trim() && o.value.trim())

  const handleSubmit = () => {
    if (!canSubmit) return
    const cleaned = options
      .filter((o) => o.label.trim() && o.value.trim())
      .map((o) => ({ id: o.id, label: o.label.trim(), value: o.value.trim() }))
    if (editingId) updateEnum(editingId, name.trim(), cleaned)
    else createEnum(name.trim(), cleaned.map(({ label, value }) => ({ label, value })))
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeEnumModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingId ? `Editar enum — ${editing?.name ?? ''}` : 'Novo enum'}
          </DialogTitle>
          {editingId && (
            <DialogDescription>
              {usageCount === 0
                ? 'Nenhuma coluna usa este enum no momento.'
                : `Usado por ${usageCount} coluna${usageCount > 1 ? 's' : ''} — as alterações valem para todas.`}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="enum-name">Nome</Label>
          <Input
            id="enum-name"
            value={name}
            placeholder="status_pedido"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Opções</Label>
          <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
            {options.map((o) => (
              <div key={o.key} className="flex items-center gap-1.5">
                <Input
                  className="h-8 flex-1"
                  placeholder="Rótulo (ex: Pendente)"
                  value={o.label}
                  onChange={(e) => {
                    const label = e.target.value
                    updateOption(o.key, {
                      label,
                      value: o.value ? o.value : slugify(label),
                    })
                  }}
                />
                <Input
                  className="h-8 flex-1"
                  placeholder="Valor (ex: pending)"
                  value={o.value}
                  onChange={(e) => updateOption(o.key, { value: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeOption(o.key)}
                  title="Remover opção"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-1 text-xs text-muted-foreground"
            onClick={() => setOptions((prev) => [...prev, newDraftOption()])}
          >
            <Plus className="size-3" /> opção
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeEnumModal}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {editingId ? 'Salvar alterações' : 'Criar enum'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
