import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react'
import type { EdgeChange, NodeChange, XYPosition } from '@xyflow/react'
import { v4 as uuid } from 'uuid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  EnumDef,
  EnumOption,
  RelationCardinality,
  RelationshipData,
  RelationshipEdgeType,
  TableColumn,
  TableConstraint,
  TableData,
  TableNodeType,
} from './types'

const CONSTRAINT_COLORS = [
  'bg-amber-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-fuchsia-500',
]

/** Formatting rules applied to table/column names on blur. */
function formatIdentifier(value: string) {
  return value.trim().replace(/\s+/g, '_').toLowerCase()
}

/** Appends "_2", "_3", ... until `base` no longer collides with `existingNames`. */
function dedupeName(base: string, existingNames: string[]) {
  if (!base || !existingNames.includes(base)) return base
  let i = 2
  while (existingNames.includes(`${base}_${i}`)) i++
  return `${base}_${i}`
}

function newColumn(): TableColumn {
  return {
    id: uuid(),
    name: '',
    type: 'string',
    pk: false,
    fk: false,
    nullable: false,
    unique: false,
  }
}

function newTable(position: XYPosition, name = 'nova_tabela'): TableNodeType {
  return {
    id: uuid(),
    type: 'table',
    position,
    data: {
      name,
      columns: [{ ...newColumn(), name: 'id', type: 'bigint', pk: true }],
      constraints: [],
    },
  }
}

function pickHandles(a: XYPosition, b: XYPosition) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: 'right', targetHandle: 'left' }
      : { sourceHandle: 'left', targetHandle: 'right' }
  }
  return dy >= 0
    ? { sourceHandle: 'bottom', targetHandle: 'top' }
    : { sourceHandle: 'top', targetHandle: 'bottom' }
}

/** Each edge end carries the anchor it attaches to (top/right/bottom/left).
 *  A file written without them — by hand, or by a build from before they were
 *  stored — leaves React Flow to pick anchors on its own, which is what makes
 *  the wires come back attached to the wrong sides. Fill only the gaps, using
 *  the same rule applied when a relationship is first created; edges that
 *  already carry both anchors are left untouched so manual reconnections and
 *  hand-placed wires survive the round trip. */
function withResolvedHandles(
  edges: RelationshipEdgeType[],
  nodes: TableNodeType[],
): RelationshipEdgeType[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return edges.map((e) => {
    if (e.sourceHandle && e.targetHandle) return e
    const source = byId.get(e.source)
    const target = byId.get(e.target)
    if (!source || !target) return e
    return { ...e, ...pickHandles(source.position, target.position) }
  })
}

/** `measured`, `selected` and `dragging` are React Flow runtime state, not
 *  diagram content. Carrying them across a save/load means the anchors get
 *  placed from dimensions that may no longer match the card actually rendered
 *  — the board re-measures on mount, so drop them and let it. */
function stripRuntimeState(nodes: TableNodeType[]): TableNodeType[] {
  return nodes.map(({ measured: _measured, selected: _selected, dragging: _dragging, ...n }) => ({
    ...n,
    data: { ...n.data, constraints: n.data.constraints ?? [] },
  }))
}

function makeRelationshipEdge(
  id: string,
  sourceId: string,
  targetId: string,
  sourcePos: XYPosition,
  targetPos: XYPosition,
  data: RelationshipData,
): RelationshipEdgeType {
  return {
    id,
    type: 'relationship',
    source: sourceId,
    target: targetId,
    ...pickHandles(sourcePos, targetPos),
    data,
  }
}

/** Builds the pivot table (N:N) or FK column (1:1/1:N) + edges for a relationship
 *  between two already-resolved table nodes, without touching the store. */
function buildRelationshipParts(
  origin: TableNodeType,
  destino: TableNodeType,
  cardinality: RelationCardinality,
  fkName: string,
  pivotName: string,
): { destino: TableNodeType; extraNodes: TableNodeType[]; edges: RelationshipEdgeType[] } {
  if (cardinality === 'N:N') {
    const originPk = origin.data.columns.find((c) => c.pk)
    const destinoPk = destino.data.columns.find((c) => c.pk)
    const originFk = `${origin.data.name}_id`
    const destinoFk = `${destino.data.name}_id`
    const edgeToOriginId = uuid()
    const edgeToDestinoId = uuid()

    const pivotPosition: XYPosition = {
      x: (origin.position.x + destino.position.x) / 2,
      y: Math.max(origin.position.y, destino.position.y) + 300,
    }
    const pivot = newTable(pivotPosition, pivotName)
    pivot.data = {
      ...pivot.data,
      columns: [
        ...pivot.data.columns,
        {
          ...newColumn(),
          name: originFk,
          type: originPk?.type ?? 'bigint',
          fk: true,
          linkedEdgeId: edgeToOriginId,
        },
        {
          ...newColumn(),
          name: destinoFk,
          type: destinoPk?.type ?? 'bigint',
          fk: true,
          linkedEdgeId: edgeToDestinoId,
        },
      ],
    }

    const edgeToOrigin = makeRelationshipEdge(
      edgeToOriginId,
      origin.id,
      pivot.id,
      origin.position,
      pivot.position,
      { cardinality: '1:N', fkName: originFk },
    )
    const edgeToDestino = makeRelationshipEdge(
      edgeToDestinoId,
      destino.id,
      pivot.id,
      destino.position,
      pivot.position,
      { cardinality: '1:N', fkName: destinoFk },
    )

    return { destino, extraNodes: [pivot], edges: [edgeToOrigin, edgeToDestino] }
  }

  const originPk = origin.data.columns.find((c) => c.pk)
  const edgeId = uuid()
  const newFkColumn: TableColumn = {
    ...newColumn(),
    name: fkName,
    type: originPk?.type ?? 'bigint',
    fk: true,
    unique: cardinality === '1:1',
    linkedEdgeId: edgeId,
  }
  const updatedDestino: TableNodeType = {
    ...destino,
    data: { ...destino.data, columns: [...destino.data.columns, newFkColumn] },
  }
  const edge = makeRelationshipEdge(
    edgeId,
    origin.id,
    destino.id,
    origin.position,
    destino.position,
    { cardinality, fkName },
  )
  return { destino: updatedDestino, extraNodes: [], edges: [edge] }
}

export interface RelationRequest {
  originId: string
  destinoId: string
}

export interface NewTableRelationRequest {
  originId: string
  position: XYPosition
}

export interface ColumnDeleteRequest {
  tableId: string
  columnId: string
  edgeId: string
}

export interface TableDeleteRequest {
  tableId: string
  relatedEdgeIds: string[]
}

export interface ReconnectingState {
  edgeId: string
  /** The table whose handles are valid drop targets — same table the dragged end started on. */
  allowedTableId: string
  /** Handle currently used by the dragged end, excluded from the "eligible" ring highlight. */
  excludeHandleId?: string | null
}

/** The enum modal is either creating a new enum — assigned to the column that
 *  asked for it, when there is one — or editing an existing one in place. */
export type EnumModalRequest =
  | { mode: 'create'; target?: { tableId: string; columnId: string } }
  | { mode: 'edit'; enumId: string }

/** An option being saved: existing ones keep their id, new ones get one. */
export interface EnumOptionDraft {
  id?: string
  label: string
  value: string
}

export interface CreateRelationshipParams {
  originId: string
  destinoId: string
  cardinality: RelationCardinality
  fkName: string
  pivotName: string
}

export interface CreateTableWithRelationshipParams {
  originId: string
  position: XYPosition
  tableName: string
  cardinality: RelationCardinality
  fkName: string
  pivotName: string
}

interface DiagrammerState {
  nodes: TableNodeType[]
  edges: RelationshipEdgeType[]
  enums: EnumDef[]
  relationRequest: RelationRequest | null
  newTableRelationRequest: NewTableRelationRequest | null
  linkingFrom: string | null
  columnDeleteRequest: ColumnDeleteRequest | null
  tableDeleteRequest: TableDeleteRequest | null
  reconnecting: ReconnectingState | null
  constraintModalTableId: string | null
  enumModalRequest: EnumModalRequest | null
  tableDetailId: string | null
  spaceHeld: boolean
  modHeld: boolean
  /** null = trust platform detection; true/false = corrected from the shortcuts panel. */
  macModifierOverride: boolean | null
  /** Whether relationship edges show their cardinality badge. */
  showCardinality: boolean
  /** Board editing frozen: tables can't be moved, connected or selected by
   *  clicking. Navigation (pan/zoom) stays free. Session-only, on purpose —
   *  reopening a board you can't edit reads as broken. */
  locked: boolean
  justCreatedTableId: string | null
  onNodesChange: (changes: NodeChange<TableNodeType>[]) => void
  onEdgesChange: (changes: EdgeChange<RelationshipEdgeType>[]) => void
  onConnect: (connection: { source: string | null; target: string | null }) => void
  addTable: (position?: XYPosition) => string
  clearJustCreatedTable: () => void
  moveNodesTo: (updates: { id: string; position: XYPosition }[]) => void
  removeTable: (id: string) => void
  selectTable: (tableId: string, additive?: boolean) => void
  requestRemoveTable: (tableId: string) => void
  confirmRemoveTable: () => void
  cancelRemoveTable: () => void
  openTableDetail: (tableId: string) => void
  closeTableDetail: () => void
  updateTableName: (id: string, name: string) => void
  formatTableName: (tableId: string) => void
  addColumn: (tableId: string) => void
  updateColumn: (
    tableId: string,
    columnId: string,
    patch: Partial<TableColumn>,
  ) => void
  formatColumnName: (tableId: string, columnId: string) => void
  removeColumn: (tableId: string, columnId: string) => void
  requestRemoveColumn: (tableId: string, columnId: string) => void
  confirmRemoveColumn: () => void
  cancelRemoveColumn: () => void
  requestFkAction: (tableId: string, columnId: string) => void
  openConstraintModal: (tableId: string) => void
  closeConstraintModal: () => void
  addConstraint: (tableId: string, name: string, columnIds: string[]) => void
  removeConstraint: (tableId: string, constraintId: string) => void
  openEnumModal: (tableId: string, columnId: string) => void
  openEnumCreator: () => void
  openEnumEditor: (enumId: string) => void
  closeEnumModal: () => void
  createEnum: (name: string, options: Omit<EnumOption, 'id'>[]) => void
  updateEnum: (enumId: string, name: string, options: EnumOptionDraft[]) => void
  renameEnum: (enumId: string, name: string) => void
  removeEnum: (enumId: string) => void
  countEnumUsage: (enumId: string) => number
  setSpaceHeld: (held: boolean) => void
  setModHeld: (held: boolean) => void
  setMacModifierOverride: (value: boolean | null) => void
  setShowCardinality: (value: boolean) => void
  setLocked: (value: boolean) => void
  removeEdgeById: (edgeId: string) => void
  requestRemoveEdge: (edgeId: string) => void
  startReconnecting: (state: ReconnectingState) => void
  stopReconnecting: () => void
  reconnectEdge: (
    edgeId: string,
    connection: {
      source: string
      target: string
      sourceHandle: string | null
      targetHandle: string | null
    },
  ) => void
  isReconnectValid: (connection: { source: string; target: string }) => boolean
  startLinking: (fromId: string) => void
  cancelLinking: () => void
  requestRelation: (originId: string, destinoId: string) => void
  closeRelationModal: () => void
  createRelationship: (params: CreateRelationshipParams) => void
  requestNewTableRelation: (originId: string, position: XYPosition) => void
  closeNewTableRelation: () => void
  createTableWithRelationship: (params: CreateTableWithRelationshipParams) => void
  /** The diagram as it should be written to a file: runtime-only node state
   *  dropped and every edge's anchors resolved, so reopening it puts the wires
   *  back on the same sides. */
  getExportData: () => {
    nodes: TableNodeType[]
    edges: RelationshipEdgeType[]
    enums: EnumDef[]
  }
  importDiagram: (data: {
    nodes?: TableNodeType[]
    edges?: RelationshipEdgeType[]
    enums?: EnumDef[]
  }) => void
}

export const useDiagrammerStore = create<DiagrammerState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      enums: [],
      relationRequest: null,
      newTableRelationRequest: null,
      linkingFrom: null,
      columnDeleteRequest: null,
      tableDeleteRequest: null,
      reconnecting: null,
      constraintModalTableId: null,
      enumModalRequest: null,
      tableDetailId: null,
      spaceHeld: false,
      modHeld: false,
      macModifierOverride: null,
      showCardinality: true,
      locked: false,
      justCreatedTableId: null,

      onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) })
      },

      onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) })
      },

      onConnect: (connection) => {
        if (!connection.source || !connection.target) return
        if (connection.source === connection.target) return
        get().requestRelation(connection.source, connection.target)
      },

      addTable: (position) => {
        const count = get().nodes.length
        const finalPosition = position ?? {
          x: 80 + (count % 4) * 340,
          y: 80 + Math.floor(count / 4) * 280,
        }
        const table = newTable(finalPosition)
        set({ nodes: [...get().nodes, table], justCreatedTableId: table.id })
        return table.id
      },

      clearJustCreatedTable: () => set({ justCreatedTableId: null }),

      moveNodesTo: (updates) => {
        const byId = new Map(updates.map((u) => [u.id, u.position]))
        set({
          nodes: get().nodes.map((n) => {
            const position = byId.get(n.id)
            return position ? { ...n, position } : n
          }),
        })
      },

      removeTable: (id) => {
        set({
          nodes: get().nodes.filter((n) => n.id !== id),
          edges: get().edges.filter((e) => e.source !== id && e.target !== id),
        })
      },

      /** Board selection driven from outside the canvas (the sidebar list).
       *  Nodes whose flag doesn't change keep their identity, so picking one
       *  table doesn't re-render every other one. */
      selectTable: (tableId, additive = false) => {
        set({
          nodes: get().nodes.map((n) => {
            const selected = additive
              ? n.id === tableId
                ? !n.selected
                : !!n.selected
              : n.id === tableId
            return selected === !!n.selected ? n : { ...n, selected }
          }),
          edges: additive
            ? get().edges
            : get().edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
        })
      },

      requestRemoveTable: (tableId) => {
        const relatedEdgeIds = get()
          .edges.filter((e) => e.source === tableId || e.target === tableId)
          .map((e) => e.id)
        set({ tableDeleteRequest: { tableId, relatedEdgeIds } })
      },

      confirmRemoveTable: () => {
        const request = get().tableDeleteRequest
        if (!request) return
        get().removeTable(request.tableId)
        set({ tableDeleteRequest: null })
      },

      cancelRemoveTable: () => set({ tableDeleteRequest: null }),

      openTableDetail: (tableId) => set({ tableDetailId: tableId }),
      closeTableDetail: () => set({ tableDetailId: null }),

      updateTableName: (id, name) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, name } } : n,
          ),
        })
      },

      formatTableName: (tableId) => {
        const table = get().nodes.find((n) => n.id === tableId)
        if (!table) return
        const formatted = formatIdentifier(table.data.name)
        const others = get()
          .nodes.filter((n) => n.id !== tableId)
          .map((n) => n.data.name)
        get().updateTableName(tableId, dedupeName(formatted, others))
      },

      addColumn: (tableId) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === tableId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    columns: [...n.data.columns, newColumn()],
                  },
                }
              : n,
          ),
        })
      },

      updateColumn: (tableId, columnId, patch) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === tableId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    columns: n.data.columns.map((c) =>
                      c.id === columnId ? { ...c, ...patch } : c,
                    ),
                  },
                }
              : n,
          ),
        })
      },

      formatColumnName: (tableId, columnId) => {
        const table = get().nodes.find((n) => n.id === tableId)
        const column = table?.data.columns.find((c) => c.id === columnId)
        if (!table || !column) return
        const formatted = formatIdentifier(column.name)
        const others = table.data.columns
          .filter((c) => c.id !== columnId)
          .map((c) => c.name)
        get().updateColumn(tableId, columnId, { name: dedupeName(formatted, others) })
      },

      removeColumn: (tableId, columnId) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === tableId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    columns: n.data.columns.filter((c) => c.id !== columnId),
                  },
                }
              : n,
          ),
        })
      },

      requestRemoveColumn: (tableId, columnId) => {
        const table = get().nodes.find((n) => n.id === tableId)
        const column = table?.data.columns.find((c) => c.id === columnId)
        const linkedEdge =
          column?.linkedEdgeId &&
          get().edges.find((e) => e.id === column.linkedEdgeId)

        if (linkedEdge) {
          set({
            columnDeleteRequest: { tableId, columnId, edgeId: linkedEdge.id },
          })
          return
        }
        get().removeColumn(tableId, columnId)
      },

      confirmRemoveColumn: () => {
        const request = get().columnDeleteRequest
        if (!request) return
        get().removeColumn(request.tableId, request.columnId)
        get().removeEdgeById(request.edgeId)
        set({ columnDeleteRequest: null })
      },

      cancelRemoveColumn: () => set({ columnDeleteRequest: null }),

      requestFkAction: (tableId, columnId) => {
        const table = get().nodes.find((n) => n.id === tableId)
        const column = table?.data.columns.find((c) => c.id === columnId)
        const linkedEdge =
          column?.linkedEdgeId &&
          get().edges.find((e) => e.id === column.linkedEdgeId)

        if (linkedEdge) {
          set({
            columnDeleteRequest: { tableId, columnId, edgeId: linkedEdge.id },
          })
          return
        }
        get().startLinking(tableId)
      },

      openConstraintModal: (tableId) => set({ constraintModalTableId: tableId }),
      closeConstraintModal: () => set({ constraintModalTableId: null }),

      addConstraint: (tableId, name, columnIds) => {
        if (columnIds.length === 0) return
        const table = get().nodes.find((n) => n.id === tableId)
        const color =
          CONSTRAINT_COLORS[(table?.data.constraints.length ?? 0) % CONSTRAINT_COLORS.length]
        const constraint: TableConstraint = { id: uuid(), name, columnIds, color }
        set({
          nodes: get().nodes.map((n) =>
            n.id === tableId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    constraints: [...n.data.constraints, constraint],
                  },
                }
              : n,
          ),
          constraintModalTableId: null,
        })
      },

      removeConstraint: (tableId, constraintId) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === tableId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    constraints: n.data.constraints.filter((c) => c.id !== constraintId),
                  },
                }
              : n,
          ),
        })
      },

      openEnumModal: (tableId, columnId) =>
        set({ enumModalRequest: { mode: 'create', target: { tableId, columnId } } }),
      openEnumCreator: () => set({ enumModalRequest: { mode: 'create' } }),
      openEnumEditor: (enumId) => set({ enumModalRequest: { mode: 'edit', enumId } }),
      closeEnumModal: () => set({ enumModalRequest: null }),

      createEnum: (name, options) => {
        const request = get().enumModalRequest
        const validOptions = options.filter((o) => o.label && o.value)
        if (!name || validOptions.length === 0) return
        const enumDef: EnumDef = {
          id: uuid(),
          name,
          options: validOptions.map((o) => ({ ...o, id: uuid() })),
        }
        set({ enums: [...get().enums, enumDef], enumModalRequest: null })
        // Only assign the new enum when a column asked for it; created from the
        // sidebar there is no target and the enum just joins the list.
        if (request?.mode === 'create' && request.target) {
          get().updateColumn(request.target.tableId, request.target.columnId, {
            enumId: enumDef.id,
          })
        }
      },

      updateEnum: (enumId, name, options) => {
        const validOptions = options.filter((o) => o.label && o.value)
        if (!name || validOptions.length === 0) return
        set({
          enums: get().enums.map((en) =>
            en.id === enumId
              ? {
                  ...en,
                  name,
                  // Options keep their id when they already existed, so columns
                  // and diagrams referencing them stay stable across an edit.
                  options: validOptions.map((o) => ({
                    id: o.id ?? uuid(),
                    label: o.label,
                    value: o.value,
                  })),
                }
              : en,
          ),
          enumModalRequest: null,
        })
      },

      renameEnum: (enumId, name) => {
        set({
          enums: get().enums.map((en) => (en.id === enumId ? { ...en, name } : en)),
        })
      },

      removeEnum: (enumId) => {
        const request = get().enumModalRequest
        set({
          enums: get().enums.filter((en) => en.id !== enumId),
          // Columns pointing at the removed enum fall back to "no enum chosen"
          // rather than holding a dangling id.
          nodes: get().nodes.map((n) =>
            n.data.columns.some((c) => c.enumId === enumId)
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    columns: n.data.columns.map((c) =>
                      c.enumId === enumId ? { ...c, enumId: undefined } : c,
                    ),
                  },
                }
              : n,
          ),
          ...(request?.mode === 'edit' && request.enumId === enumId
            ? { enumModalRequest: null }
            : {}),
        })
      },

      countEnumUsage: (enumId) =>
        get().nodes.reduce(
          (total, node) => total + node.data.columns.filter((c) => c.enumId === enumId).length,
          0,
        ),

      setSpaceHeld: (held) => set({ spaceHeld: held }),
      setModHeld: (held) => set({ modHeld: held }),
      setMacModifierOverride: (value) => set({ macModifierOverride: value }),
      setShowCardinality: (value) => set({ showCardinality: value }),
      setLocked: (value) => set({ locked: value }),

      removeEdgeById: (edgeId) => {
        set({ edges: get().edges.filter((e) => e.id !== edgeId) })
      },

      requestRemoveEdge: (edgeId) => {
        for (const table of get().nodes) {
          const column = table.data.columns.find((c) => c.linkedEdgeId === edgeId)
          if (column) {
            set({
              columnDeleteRequest: { tableId: table.id, columnId: column.id, edgeId },
            })
            return
          }
        }
        get().removeEdgeById(edgeId)
      },

      startReconnecting: (state) => set({ reconnecting: state }),
      stopReconnecting: () => set({ reconnecting: null }),

      reconnectEdge: (edgeId, connection) => {
        set({
          edges: get().edges.map((e) =>
            e.id === edgeId
              ? {
                  ...e,
                  source: connection.source,
                  target: connection.target,
                  sourceHandle: connection.sourceHandle,
                  targetHandle: connection.targetHandle,
                }
              : e,
          ),
        })
      },

      isReconnectValid: (connection) => {
        const reconnecting = get().reconnecting
        if (!reconnecting) return true
        return (
          connection.source === reconnecting.allowedTableId ||
          connection.target === reconnecting.allowedTableId
        )
      },

      startLinking: (fromId) => set({ linkingFrom: fromId }),
      cancelLinking: () => set({ linkingFrom: null }),

      requestRelation: (originId, destinoId) => {
        set({ relationRequest: { originId, destinoId }, linkingFrom: null })
      },

      closeRelationModal: () => set({ relationRequest: null }),

      createRelationship: ({ originId, destinoId, cardinality, fkName, pivotName }) => {
        const origin = get().nodes.find((n) => n.id === originId)
        const destino = get().nodes.find((n) => n.id === destinoId)
        if (!origin || !destino) return

        const result = buildRelationshipParts(origin, destino, cardinality, fkName, pivotName)
        set({
          nodes: get()
            .nodes.map((n) => (n.id === destinoId ? result.destino : n))
            .concat(result.extraNodes),
          edges: [...get().edges, ...result.edges],
          relationRequest: null,
        })
      },

      requestNewTableRelation: (originId, position) =>
        set({ newTableRelationRequest: { originId, position } }),
      closeNewTableRelation: () => set({ newTableRelationRequest: null }),

      createTableWithRelationship: ({
        originId,
        position,
        tableName,
        cardinality,
        fkName,
        pivotName,
      }) => {
        const origin = get().nodes.find((n) => n.id === originId)
        if (!origin) return

        const others = get().nodes.map((n) => n.data.name)
        const finalName = dedupeName(formatIdentifier(tableName) || 'nova_tabela', others)
        const destinoDraft = newTable(position, finalName)

        const result = buildRelationshipParts(origin, destinoDraft, cardinality, fkName, pivotName)
        set({
          nodes: [...get().nodes, result.destino, ...result.extraNodes],
          edges: [...get().edges, ...result.edges],
          newTableRelationRequest: null,
        })
      },

      getExportData: () => {
        const { nodes, edges, enums } = get()
        const clean = stripRuntimeState(nodes)
        return { nodes: clean, edges: withResolvedHandles(edges, clean), enums }
      },

      importDiagram: (data) => {
        const nodes = stripRuntimeState(data.nodes ?? [])
        set({
          nodes,
          edges: withResolvedHandles(data.edges ?? [], nodes),
          enums: data.enums ?? [],
          relationRequest: null,
          newTableRelationRequest: null,
          linkingFrom: null,
          columnDeleteRequest: null,
          tableDeleteRequest: null,
          reconnecting: null,
          constraintModalTableId: null,
          enumModalRequest: null,
          justCreatedTableId: null,
        })
      },
    }),
    {
      name: 'diagrammer-der-storage',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        enums: state.enums,
        macModifierOverride: state.macModifierOverride,
        showCardinality: state.showCardinality,
      }),
      // Normalize diagrams saved before fields like `constraints`/`enums` existed.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<DiagrammerState>
        // Same repair as importing a file: a diagram saved before edge anchors
        // were stored would otherwise come back with its wires on whatever
        // sides React Flow picks.
        const nodes = stripRuntimeState(persisted.nodes ?? [])
        return {
          ...currentState,
          ...persisted,
          nodes,
          edges: withResolvedHandles(persisted.edges ?? [], nodes),
          enums: persisted.enums ?? [],
        }
      },
    },
  ),
)

export type { TableData }
