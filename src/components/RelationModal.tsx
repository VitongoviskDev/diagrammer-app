import { useEffect, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { useDiagrammerStore } from '@/store'
import { RELATION_CARDINALITIES, type RelationCardinality } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const CARDINALITY_SENTENCE: Record<
  RelationCardinality,
  (origin: string, destino: string) => string
> = {
  '1:1': (o, d) => `Uma "${o}" está relacionada a exatamente uma "${d}".`,
  '1:N': (o, d) => `Uma "${o}" pode ter várias "${d}".`,
  'N:N': (o, d) => `Várias "${o}" se relacionam com várias "${d}".`,
}

export function RelationModal() {
  const relationRequest = useDiagrammerStore((s) => s.relationRequest)
  const nodes = useDiagrammerStore((s) => s.nodes)
  const closeRelationModal = useDiagrammerStore((s) => s.closeRelationModal)
  const createRelationship = useDiagrammerStore((s) => s.createRelationship)

  const [swapped, setSwapped] = useState(false)
  const [cardinality, setCardinality] = useState<RelationCardinality>('1:N')
  const [fkName, setFkName] = useState('')
  const [pivotName, setPivotName] = useState('')

  const open = relationRequest !== null

  const originId = swapped ? relationRequest?.destinoId : relationRequest?.originId
  const destinoId = swapped ? relationRequest?.originId : relationRequest?.destinoId
  const origin = nodes.find((n) => n.id === originId)
  const destino = nodes.find((n) => n.id === destinoId)

  useEffect(() => {
    if (!relationRequest) return
    setSwapped(false)
    setCardinality('1:N')
  }, [relationRequest])

  useEffect(() => {
    if (!origin || !destino) return
    setFkName(`${origin.data.name}_id`)
    setPivotName(`${origin.data.name}_${destino.data.name}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.id, destino?.id])

  if (!open || !origin || !destino || !relationRequest) return null

  const handleSubmit = () => {
    createRelationship({
      originId: origin.id,
      destinoId: destino.id,
      cardinality,
      fkName,
      pivotName,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeRelationModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova relação</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2">
          <span className="rounded-md border border-border bg-muted px-2 py-1 text-sm font-medium">
            {origin.data.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            title="Trocar direção"
            onClick={() => setSwapped((s) => !s)}
          >
            <ArrowLeftRight className="size-3.5" />
          </Button>
          <span className="rounded-md border border-border bg-muted px-2 py-1 text-sm font-medium">
            {destino.data.name}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Cardinalidade</Label>
          <Select
            value={cardinality}
            onValueChange={(v) => setCardinality(v as RelationCardinality)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATION_CARDINALITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {CARDINALITY_SENTENCE[cardinality](origin.data.name, destino.data.name)}
          </p>
        </div>

        {cardinality === 'N:N' ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pivot-name">Nome da tabela de relação</Label>
            <Input
              id="pivot-name"
              value={pivotName}
              onChange={(e) => setPivotName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Será criada com FKs para "{origin.data.name}" e "{destino.data.name}".
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fk-name">Nome da FK (em "{destino.data.name}")</Label>
            <Input
              id="fk-name"
              value={fkName}
              onChange={(e) => setFkName(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={closeRelationModal}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Criar relação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
