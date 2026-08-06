import { useDiagrammerStore } from '@/store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function ConfirmTableDeleteDialog() {
  const tableDeleteRequest = useDiagrammerStore((s) => s.tableDeleteRequest)
  const nodes = useDiagrammerStore((s) => s.nodes)
  const edges = useDiagrammerStore((s) => s.edges)
  const confirmRemoveTable = useDiagrammerStore((s) => s.confirmRemoveTable)
  const cancelRemoveTable = useDiagrammerStore((s) => s.cancelRemoveTable)

  const open = tableDeleteRequest !== null
  const table = tableDeleteRequest
    ? nodes.find((n) => n.id === tableDeleteRequest.tableId)
    : undefined
  const relatedEdges = tableDeleteRequest
    ? edges.filter((e) => tableDeleteRequest.relatedEdgeIds.includes(e.id))
    : []

  if (!open || !table || !tableDeleteRequest) return null

  const relatedTableNames = [
    ...new Set(
      relatedEdges.map((e) => {
        const otherId = e.source === tableDeleteRequest.tableId ? e.target : e.source
        return nodes.find((n) => n.id === otherId)?.data.name ?? '?'
      }),
    ),
  ]
  const hasRelations = relatedEdges.length > 0

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && cancelRemoveTable()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {hasRelations ? 'Excluir tabela e suas relações?' : 'Excluir tabela?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasRelations
              ? `A tabela "${table.data.name}" tem ${relatedEdges.length} relação(ões) com ${relatedTableNames.join(', ')}. Excluir a tabela também vai remover essas relações do diagrama.`
              : `Tem certeza que deseja excluir a tabela "${table.data.name}"? Essa ação não pode ser desfeita.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancelRemoveTable}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirmRemoveTable}>
            {hasRelations ? 'Excluir tabela e relações' : 'Excluir tabela'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
