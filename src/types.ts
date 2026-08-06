import type { Edge, Node } from '@xyflow/react'

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

export type TableNodeType = Node<TableData, 'table'>
export type RelationshipEdgeType = Edge<RelationshipData, 'relationship'>
