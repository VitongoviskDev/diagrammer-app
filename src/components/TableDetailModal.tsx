import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useDiagrammerStore } from '@/store'
import { groupConstraintsByColumn, invalidNameClasses, STARTS_WITH_DIGIT } from '@/lib/tableHelpers'
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
import { ColumnRow } from '@/components/ColumnRow'
import { ConstraintsList } from '@/components/ConstraintsList'

export function TableDetailModal() {
  const tableDetailId = useDiagrammerStore((s) => s.tableDetailId)
  const nodes = useDiagrammerStore((s) => s.nodes)
  const edges = useDiagrammerStore((s) => s.edges)
  const closeTableDetail = useDiagrammerStore((s) => s.closeTableDetail)
  const updateTableName = useDiagrammerStore((s) => s.updateTableName)
  const formatTableName = useDiagrammerStore((s) => s.formatTableName)
  const addColumn = useDiagrammerStore((s) => s.addColumn)
  const openConstraintModal = useDiagrammerStore((s) => s.openConstraintModal)
  const requestRemoveTable = useDiagrammerStore((s) => s.requestRemoveTable)
  const requestRelation = useDiagrammerStore((s) => s.requestRelation)
  const requestRemoveEdge = useDiagrammerStore((s) => s.requestRemoveEdge)

  const [addingRelation, setAddingRelation] = useState(false)
  const [targetTableId, setTargetTableId] = useState('')

  const open = tableDetailId !== null
  const table = tableDetailId ? nodes.find((n) => n.id === tableDetailId) : undefined

  useEffect(() => {
    setAddingRelation(false)
    setTargetTableId('')
  }, [tableDetailId])

  if (!open || !table) return null

  const constraintsByColumnId = groupConstraintsByColumn(table.data.constraints)
  const otherTables = nodes.filter((n) => n.id !== table.id)
  const relatedEdges = edges.filter((e) => e.source === table.id || e.target === table.id)

  const handleCreateRelation = () => {
    if (!targetTableId) return
    requestRelation(table.id, targetTableId)
    closeTableDetail()
  }

  const handleDeleteTable = () => {
    closeTableDetail()
    requestRemoveTable(table.id)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeTableDetail()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Detalhes da tabela</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="detail-table-name">Nome</Label>
              <Input
                id="detail-table-name"
                className={invalidNameClasses(STARTS_WITH_DIGIT.test(table.data.name))}
                value={table.data.name}
                onChange={(e) => updateTableName(table.id, e.target.value)}
                onBlur={() => formatTableName(table.id)}
              />
            </div>
            <Button
              variant="outline"
              className="gap-1 text-destructive hover:text-destructive"
              onClick={handleDeleteTable}
            >
              <Trash2 className="size-3.5" /> Excluir tabela
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Colunas</Label>
            <div className="flex flex-col gap-2 rounded-md border border-border p-2">
              {table.data.columns.map((col) => (
                <ColumnRow
                  key={col.id}
                  tableId={table.id}
                  column={col}
                  memberConstraints={constraintsByColumnId.get(col.id) ?? []}
                />
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 justify-start gap-1 text-xs text-muted-foreground"
                onClick={() => addColumn(table.id)}
              >
                <Plus className="size-3" /> coluna
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Constraints</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-xs text-muted-foreground"
                onClick={() => openConstraintModal(table.id)}
              >
                <Plus className="size-3" /> constraint
              </Button>
            </div>
            {table.data.constraints.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma constraint.</p>
            ) : (
              <ConstraintsList
                tableId={table.id}
                constraints={table.data.constraints}
                columns={table.data.columns}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Relações</Label>
              {!addingRelation && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 text-xs text-muted-foreground"
                  disabled={otherTables.length === 0}
                  title={otherTables.length === 0 ? 'Crie outra tabela primeiro' : undefined}
                  onClick={() => setAddingRelation(true)}
                >
                  <Plus className="size-3" /> relação
                </Button>
              )}
            </div>

            {relatedEdges.length === 0 && !addingRelation && (
              <p className="text-xs text-muted-foreground">Nenhuma relação.</p>
            )}

            {relatedEdges.map((e) => {
              const otherId = e.source === table.id ? e.target : e.source
              const otherName = nodes.find((n) => n.id === otherId)?.data.name ?? '?'
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs"
                >
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold">
                    {e.data?.cardinality}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    com "{otherName}"{e.data?.fkName ? ` — ${e.data.fkName}` : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => requestRemoveEdge(e.id)}
                    title="Remover relação"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              )
            })}

            {addingRelation && (
              <div className="flex items-center gap-1.5">
                <Select value={targetTableId} onValueChange={setTargetTableId}>
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue placeholder="Selecione a tabela..." />
                  </SelectTrigger>
                  <SelectContent>
                    {otherTables.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.data.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" disabled={!targetTableId} onClick={handleCreateRelation}>
                  Continuar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAddingRelation(false)
                    setTargetTableId('')
                  }}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeTableDetail}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
