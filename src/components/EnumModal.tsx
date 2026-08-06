import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
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

interface DraftOption {
  key: number
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
  const closeEnumModal = useDiagrammerStore((s) => s.closeEnumModal)
  const createEnum = useDiagrammerStore((s) => s.createEnum)

  const open = enumModalRequest !== null

  const [name, setName] = useState('')
  const [options, setOptions] = useState<DraftOption[]>([newDraftOption(), newDraftOption()])

  useEffect(() => {
    setName('')
    setOptions([newDraftOption(), newDraftOption()])
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
    createEnum(
      name.trim(),
      options
        .filter((o) => o.label.trim() && o.value.trim())
        .map((o) => ({ label: o.label.trim(), value: o.value.trim() })),
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeEnumModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo enum</DialogTitle>
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
            Criar enum
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
