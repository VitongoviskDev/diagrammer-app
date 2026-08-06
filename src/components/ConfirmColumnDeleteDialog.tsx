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

export function ConfirmColumnDeleteDialog() {
  const columnDeleteRequest = useDiagrammerStore((s) => s.columnDeleteRequest)
  const nodes = useDiagrammerStore((s) => s.nodes)
  const edges = useDiagrammerStore((s) => s.edges)
  const confirmRemoveColumn = useDiagrammerStore((s) => s.confirmRemoveColumn)
  const cancelRemoveColumn = useDiagrammerStore((s) => s.cancelRemoveColumn)

  const open = columnDeleteRequest !== null
  const edge = columnDeleteRequest
    ? edges.find((e) => e.id === columnDeleteRequest.edgeId)
    : undefined
  const sourceName = nodes.find((n) => n.id === edge?.source)?.data.name
  const targetName = nodes.find((n) => n.id === edge?.target)?.data.name

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && cancelRemoveColumn()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar coluna da relação?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa coluna faz parte da relação entre "{sourceName}" e "{targetName}
            ". Apagar a coluna também vai remover essa relação do diagrama.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancelRemoveColumn}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirmRemoveColumn}>
            Apagar coluna e relação
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
