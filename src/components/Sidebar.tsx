import { memo, useMemo, useState } from 'react'
import { Panel, useReactFlow } from '@xyflow/react'
import {
  ChevronDown,
  ChevronUp,
  Construction,
  ListTree,
  Maximize2,
  Pencil,
  Plus,
  Search,
  Table2,
  Trash2,
  Waypoints,
} from 'lucide-react'
import { useDiagrammerStore } from '@/store'
import type { EnumDef } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

type TabId = 'tables' | 'enums' | 'relations'

const TABS = [
  { id: 'tables', label: 'Tabelas', icon: Table2 },
  { id: 'enums', label: 'Enums', icon: ListTree },
  { id: 'relations', label: 'Relações', icon: Waypoints },
] as const

const rowClasses =
  'group flex items-center gap-1 rounded-md border px-1 py-0.5 text-left transition-colors'
const nameInputClasses =
  'min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs outline-none focus:border-border focus:bg-background'
const actionClasses = 'size-5 shrink-0 text-muted-foreground'
const counterClasses =
  'px-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase'

/** Shared search box for both listings. */
function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="h-7 pl-6 text-xs"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

/** Case- and accent-insensitive, so "relacao" finds "relação". */
function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

/** Kept memo-thin on primitives: the parent re-renders on every node change
 *  (including drags), but a row only re-renders when its own name or selection
 *  actually changes. */
const TableItem = memo(function TableItem({
  id,
  name,
  selected,
}: {
  id: string
  name: string
  selected: boolean
}) {
  const selectTable = useDiagrammerStore((s) => s.selectTable)
  const updateTableName = useDiagrammerStore((s) => s.updateTableName)
  const formatTableName = useDiagrammerStore((s) => s.formatTableName)
  const startLinking = useDiagrammerStore((s) => s.startLinking)
  const openTableDetail = useDiagrammerStore((s) => s.openTableDetail)
  const requestRemoveTable = useDiagrammerStore((s) => s.requestRemoveTable)
  const rf = useReactFlow()

  // Shift mirrors the board's own multi-selection modifier.
  const handleSelect = (e: React.MouseEvent) => {
    selectTable(id, e.shiftKey)
    // A plain click is the "take me to this table" gesture, so pan the board
    // onto it. Building a multi-selection with Shift leaves the viewport alone
    // — jumping on every added table would be disorienting.
    if (e.shiftKey) return
    const node = rf.getNode(id)
    if (!node) return
    rf.setCenter(
      node.position.x + (node.measured?.width ?? 0) / 2,
      node.position.y + (node.measured?.height ?? 0) / 2,
      {
        // Keeping the current zoom makes it a pure pan, not a zoom-to-fit.
        zoom: rf.getZoom(),
        duration: 800,
        // d3's zoom interpolation arcs the flight — pulling back over long
        // distances and settling in — so it reads as travelling there instead
        // of cutting to it.
        interpolate: 'smooth',
      },
    )
  }

  return (
    <div
      className={`${rowClasses} cursor-pointer ${
        selected ? 'border-primary bg-accent' : 'border-transparent hover:bg-muted'
      }`}
      onClick={handleSelect}
    >
      {/* No stopPropagation here on purpose: the input covers most of the row,
          so clicking the name has to select the table too — it still takes
          focus, so renaming in place keeps working. */}
      <input
        className={nameInputClasses}
        value={name}
        placeholder="nome_da_tabela"
        onChange={(e) => updateTableName(id, e.target.value)}
        onBlur={() => formatTableName(id)}
      />
      <Button
        variant="ghost"
        size="icon"
        className={`${actionClasses} hover:text-primary`}
        title="Criar relação a partir desta tabela"
        onClick={(e) => {
          e.stopPropagation()
          startLinking(id)
        }}
      >
        <Waypoints className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`${actionClasses} hover:text-foreground`}
        title="Visualizar em detalhe"
        onClick={(e) => {
          e.stopPropagation()
          openTableDetail(id)
        }}
      >
        <Maximize2 className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`${actionClasses} hover:text-destructive`}
        title="Excluir tabela"
        onClick={(e) => {
          e.stopPropagation()
          requestRemoveTable(id)
        }}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  )
})

function TablesTab() {
  const nodes = useDiagrammerStore((s) => s.nodes)
  const addTable = useDiagrammerStore((s) => s.addTable)
  const [query, setQuery] = useState('')

  // Sorted on a copy — reordering the store's array would change the order
  // React Flow paints the nodes in.
  const visible = useMemo(() => {
    const term = normalize(query.trim())
    return nodes
      .filter((n) => !term || normalize(n.data.name).includes(term))
      .sort((a, b) => a.data.name.localeCompare(b.data.name, 'pt-BR'))
  }, [nodes, query])

  return (
    <>
      <Button size="sm" className="gap-1" onClick={() => addTable()}>
        <Plus className="size-3.5" /> Nova tabela
      </Button>
      <p className={counterClasses}>
        {visible.length < nodes.length
          ? `${visible.length} de ${nodes.length} tabelas`
          : `${nodes.length} ${nodes.length === 1 ? 'tabela' : 'tabelas'}`}
      </p>
      <SearchBox value={query} onChange={setQuery} placeholder="Buscar tabela" />
      {nodes.length === 0 ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">Nenhuma tabela ainda.</p>
      ) : visible.length === 0 ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">Nenhuma tabela encontrada.</p>
      ) : (
        visible.map((n) => (
          <TableItem key={n.id} id={n.id} name={n.data.name} selected={!!n.selected} />
        ))
      )}
    </>
  )
}

function EnumItem({
  enumDef,
  onRequestDelete,
}: {
  enumDef: EnumDef
  onRequestDelete: (enumDef: EnumDef) => void
}) {
  const renameEnum = useDiagrammerStore((s) => s.renameEnum)
  const openEnumEditor = useDiagrammerStore((s) => s.openEnumEditor)

  return (
    <div className={`${rowClasses} border-transparent hover:bg-muted`}>
      <input
        className={nameInputClasses}
        value={enumDef.name}
        placeholder="nome_do_enum"
        onChange={(e) => renameEnum(enumDef.id, e.target.value)}
        onBlur={() => renameEnum(enumDef.id, enumDef.name.trim())}
      />
      <span
        className="shrink-0 text-[10px] text-muted-foreground"
        title={enumDef.options.map((o) => o.value).join(', ')}
      >
        {enumDef.options.length}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={`${actionClasses} hover:text-foreground`}
        title="Ver e editar as opções"
        onClick={() => openEnumEditor(enumDef.id)}
      >
        <Pencil className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`${actionClasses} hover:text-destructive`}
        title="Excluir enum"
        onClick={() => onRequestDelete(enumDef)}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  )
}

function EnumsTab() {
  const enums = useDiagrammerStore((s) => s.enums)
  const openEnumCreator = useDiagrammerStore((s) => s.openEnumCreator)
  const removeEnum = useDiagrammerStore((s) => s.removeEnum)
  const countEnumUsage = useDiagrammerStore((s) => s.countEnumUsage)

  const [pendingDelete, setPendingDelete] = useState<EnumDef | null>(null)
  const [query, setQuery] = useState('')
  const usage = pendingDelete ? countEnumUsage(pendingDelete.id) : 0

  const visible = useMemo(() => {
    const term = normalize(query.trim())
    return enums
      .filter((en) => !term || normalize(en.name).includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [enums, query])

  return (
    <>
      <Button size="sm" className="gap-1" onClick={openEnumCreator}>
        <Plus className="size-3.5" /> Novo enum
      </Button>
      <p className={counterClasses}>
        {visible.length < enums.length
          ? `${visible.length} de ${enums.length} enums`
          : `${enums.length} ${enums.length === 1 ? 'enum' : 'enums'}`}
      </p>
      <SearchBox value={query} onChange={setQuery} placeholder="Buscar enum" />
      {enums.length === 0 ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">Nenhum enum ainda.</p>
      ) : visible.length === 0 ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">Nenhum enum encontrado.</p>
      ) : (
        visible.map((en) => (
          <EnumItem key={en.id} enumDef={en} onRequestDelete={setPendingDelete} />
        ))
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir enum?</AlertDialogTitle>
            <AlertDialogDescription>
              {usage > 0
                ? `"${pendingDelete?.name}" é usado por ${usage} coluna${usage > 1 ? 's' : ''}. Excluir vai deixar essas colunas sem enum selecionado.`
                : `Tem certeza que deseja excluir o enum "${pendingDelete?.name}"? Essa ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) removeEnum(pendingDelete.id)
                setPendingDelete(null)
              }}
            >
              Excluir enum
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function Sidebar() {
  const [tab, setTab] = useState<TabId>('tables')
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Panel position="top-right">
      <div className="flex w-64 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-md">
        <div className="flex items-center gap-0.5 border-b border-border p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors ${
                tab === t.id
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              onClick={() => {
                setTab(t.id)
                setCollapsed(false)
              }}
            >
              <t.icon className="size-3.5" /> {t.label}
            </button>
          ))}
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expandir painel' : 'Recolher painel'}
          >
            {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          </Button>
        </div>

        {!collapsed && (
          <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto p-2">
            {tab === 'tables' && <TablesTab />}
            {tab === 'enums' && <EnumsTab />}
            {tab === 'relations' && (
              <div className="flex flex-col items-center gap-1 px-2 py-6 text-center">
                <Construction className="size-5 text-muted-foreground" />
                <p className="text-xs font-medium">Em desenvolvimento</p>
                <p className="text-[11px] text-muted-foreground">
                  A listagem de relações ainda está sendo construída.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}
