import { Plus, Trash2 } from 'lucide-react'
import { useDiagrammerStore } from '@/store'
import { COLUMN_TYPES, type ColumnType, type TableColumn, type TableConstraint } from '@/types'
import { invalidNameClasses, STARTS_WITH_DIGIT } from '@/lib/tableHelpers'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NEW_ENUM_VALUE = '__new_enum__'

function flagClasses(active: boolean, disabled = false, colorClassOverride?: string) {
  const colorClasses = colorClassOverride
    ? `${colorClassOverride} text-white`
    : active
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
  return `nodrag flex size-5 items-center justify-center rounded text-[9px] font-bold select-none ${
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
  } ${colorClasses}`
}

interface ColumnRowProps {
  tableId: string
  column: TableColumn
  memberConstraints: TableConstraint[]
}

/** One column's editable row (name, type, enum picker, PK/FK/N/U flags, delete).
 *  Shared by the compact TableNode card and the full TableDetailModal. */
export function ColumnRow({ tableId, column: col, memberConstraints }: ColumnRowProps) {
  const updateColumn = useDiagrammerStore((s) => s.updateColumn)
  const formatColumnName = useDiagrammerStore((s) => s.formatColumnName)
  const requestRemoveColumn = useDiagrammerStore((s) => s.requestRemoveColumn)
  const requestFkAction = useDiagrammerStore((s) => s.requestFkAction)
  const enums = useDiagrammerStore((s) => s.enums)
  const openEnumModal = useDiagrammerStore((s) => s.openEnumModal)

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <input
          className={`nodrag min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs outline-none focus:border-border focus:bg-background ${invalidNameClasses(STARTS_WITH_DIGIT.test(col.name))}`}
          value={col.name}
          placeholder="coluna"
          onChange={(e) => updateColumn(tableId, col.id, { name: e.target.value })}
          onBlur={() => formatColumnName(tableId, col.id)}
          title={STARTS_WITH_DIGIT.test(col.name) ? 'Nome não pode começar com número' : undefined}
        />
        <select
          className="nodrag rounded border border-transparent bg-transparent py-0.5 text-[11px] text-muted-foreground outline-none focus:border-border focus:bg-background"
          value={col.type}
          onChange={(e) => {
            const type = e.target.value as ColumnType
            updateColumn(tableId, col.id, {
              type,
              ...(type !== 'enum' ? { enumId: undefined } : {}),
            })
          }}
        >
          {COLUMN_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-0.5">
          <label title="Primary Key" className={flagClasses(col.pk)}>
            <input
              type="checkbox"
              className="hidden"
              checked={col.pk}
              onChange={(e) =>
                updateColumn(
                  tableId,
                  col.id,
                  e.target.checked
                    ? { pk: true, unique: true, nullable: false }
                    : { pk: false },
                )
              }
            />
            PK
          </label>
          <button
            type="button"
            title="Foreign Key — clique para criar ou remover a relação"
            className={flagClasses(col.fk)}
            onClick={() => requestFkAction(tableId, col.id)}
          >
            FK
          </button>
          <label title="Nullable" className={flagClasses(col.nullable, col.pk)}>
            <input
              type="checkbox"
              className="hidden"
              checked={col.nullable}
              disabled={col.pk}
              onChange={(e) =>
                !col.pk && updateColumn(tableId, col.id, { nullable: e.target.checked })
              }
            />
            N
          </label>
          <label
            title={
              memberConstraints.length > 0
                ? `Unique (via constraint: ${memberConstraints
                    .map((c) => c.name || 'unique')
                    .join(', ')})`
                : 'Unique'
            }
            className={flagClasses(col.unique, col.pk, memberConstraints[0]?.color)}
          >
            <input
              type="checkbox"
              className="hidden"
              checked={col.unique}
              disabled={col.pk}
              onChange={(e) =>
                !col.pk && updateColumn(tableId, col.id, { unique: e.target.checked })
              }
            />
            U
          </label>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="nodrag size-5 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => requestRemoveColumn(tableId, col.id)}
          title="Remover coluna"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
      {col.type === 'enum' && (
        <div className="flex items-center gap-1 pl-1">
          <span className="shrink-0 text-[10px] text-muted-foreground">enum:</span>
          <Select
            value={col.enumId}
            onValueChange={(value) => {
              if (value === NEW_ENUM_VALUE) openEnumModal(tableId, col.id)
              else updateColumn(tableId, col.id, { enumId: value })
            }}
          >
            <SelectTrigger size="sm" className="nodrag h-6 flex-1 text-[11px]">
              <SelectValue placeholder="selecionar enum" />
            </SelectTrigger>
            <SelectContent>
              {enums.map((en) => (
                <SelectItem key={en.id} value={en.id}>
                  {en.name}
                </SelectItem>
              ))}
              {enums.length > 0 && <SelectSeparator />}
              <SelectItem value={NEW_ENUM_VALUE} className="text-primary font-medium">
                <Plus className="size-3" /> Adicionar novo
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
