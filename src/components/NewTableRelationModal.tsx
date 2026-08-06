import { useEffect, useState } from 'react'
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

export function NewTableRelationModal() {
  const request = useDiagrammerStore((s) => s.newTableRelationRequest)
  const nodes = useDiagrammerStore((s) => s.nodes)
  const closeNewTableRelation = useDiagrammerStore((s) => s.closeNewTableRelation)
  const createTableWithRelationship = useDiagrammerStore((s) => s.createTableWithRelationship)

  const [tableName, setTableName] = useState('nova_tabela')
  const [cardinality, setCardinality] = useState<RelationCardinality>('1:N')
  const [fkName, setFkName] = useState('')
  const [pivotName, setPivotName] = useState('')

  const open = request !== null
  const origin = request ? nodes.find((n) => n.id === request.originId) : undefined
  const destinoName = tableName.trim() || 'nova_tabela'

  useEffect(() => {
    if (!request) return
    setTableName('nova_tabela')
    setCardinality('1:N')
  }, [request])

  useEffect(() => {
    if (!origin) return
    setFkName(`${origin.data.name}_id`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.id])

  useEffect(() => {
    if (!origin) return
    setPivotName(`${origin.data.name}_${destinoName}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.id, destinoName])

  if (!open || !origin || !request) return null

  const handleSubmit = () => {
    createTableWithRelationship({
      originId: origin.id,
      position: request.position,
      tableName,
      cardinality,
      fkName,
      pivotName,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeNewTableRelation()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova tabela relacionada</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2">
          <span className="rounded-md border border-border bg-muted px-2 py-1 text-sm font-medium">
            {origin.data.name}
          </span>
          <span className="text-muted-foreground">→</span>
          <Input
            className="h-8 max-w-[12rem] text-center font-medium"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="nome_da_tabela"
            autoFocus
          />
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
            {CARDINALITY_SENTENCE[cardinality](origin.data.name, destinoName)}
          </p>
        </div>

        {cardinality === 'N:N' ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-table-pivot-name">Nome da tabela de relação</Label>
            <Input
              id="new-table-pivot-name"
              value={pivotName}
              onChange={(e) => setPivotName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Será criada com FKs para "{origin.data.name}" e "{destinoName}".
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-table-fk-name">Nome da FK (em "{destinoName}")</Label>
            <Input
              id="new-table-fk-name"
              value={fkName}
              onChange={(e) => setFkName(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={closeNewTableRelation}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Criar tabela e relação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
