import type { Edge, Node, XYPosition } from '@xyflow/react'

export const COLUMN_TYPES = [
  'string',
  'integer',
  'bigint',
  'decimal',
  'boolean',
  'date',
  'datetime',
  'uuid',
  'text',
  'enum',
] as const

export type ColumnType = (typeof COLUMN_TYPES)[number]

export interface TableColumn {
  id: string
  name: string
  type: ColumnType
  pk: boolean
  fk: boolean
  nullable: boolean
  unique: boolean
  /** Id of the relationship edge that created this FK column, if any. */
  linkedEdgeId?: string
  /** Id of the EnumDef this column uses, when type === 'enum'. */
  enumId?: string
}

export interface EnumOption {
  id: string
  label: string
  value: string
}

export interface EnumDef {
  id: string
  name: string
  options: EnumOption[]
}

export interface TableConstraint {
  id: string
  name: string
  columnIds: string[]
  /** Tailwind background color class, e.g. "bg-amber-500". */
  color: string
}

export interface TableData extends Record<string, unknown> {
  name: string
  columns: TableColumn[]
  constraints: TableConstraint[]
}

export const RELATION_CARDINALITIES = ['1:1', '1:N', 'N:N'] as const

export type RelationCardinality = (typeof RELATION_CARDINALITIES)[number]

export interface RelationshipData extends Record<string, unknown> {
  cardinality: RelationCardinality
  fkName: string
}

export const GROUP_COLORS = ['slate', 'amber', 'sky', 'violet', 'rose', 'emerald'] as const

export type GroupColor = (typeof GROUP_COLORS)[number]

/** A purely visual box used to separate entities into modules. It holds no
 *  membership list: whichever tables sit inside its bounds belong to it, the
 *  same way they'd sit anywhere else on the board. */
export interface GroupDef {
  id: string
  name: string
  position: XYPosition
  width: number
  height: number
  color: GroupColor
}

export interface GroupData extends Record<string, unknown> {
  name: string
  color: GroupColor
}

export type TableNodeType = Node<TableData, 'table'>
export type GroupNodeType = Node<GroupData, 'moduleBox'>
/** What the board actually renders: tables plus the group boxes behind them. */
export type BoardNode = TableNodeType | GroupNodeType
export type RelationshipEdgeType = Edge<RelationshipData, 'relationship'>
