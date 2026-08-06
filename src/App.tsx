import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  ConnectionMode,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  type Connection,
  type HandleType,
  type Node,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Download, Plus, Upload, Waypoints, X } from 'lucide-react'
import { useDiagrammerStore } from '@/store'
import type { RelationshipEdgeType } from '@/types'
import { TableNode } from '@/components/TableNode'
import { RelationshipEdge } from '@/components/RelationshipEdge'
import { RelationModal } from '@/components/RelationModal'
import { ConfirmColumnDeleteDialog } from '@/components/ConfirmColumnDeleteDialog'
import { ConfirmTableDeleteDialog } from '@/components/ConfirmTableDeleteDialog'
import { ConstraintModal } from '@/components/ConstraintModal'
import { EnumModal } from '@/components/EnumModal'
import { NewTableRelationModal } from '@/components/NewTableRelationModal'
import { TableDetailModal } from '@/components/TableDetailModal'
import {
  PaneContextMenu,
  type PaneContextMenuState,
} from '@/components/PaneContextMenu'
import { Button } from '@/components/ui/button'

const nodeTypes: NodeTypes = { table: TableNode }
const edgeTypes: EdgeTypes = { relationship: RelationshipEdge }

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
}

/** Tracks Space (pan mode) and Ctrl (reconnect/move mode) while held, in the store
 *  so any component (Board, TableNode) can react to them. */
function useGestureKeys() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (isTypingTarget(e.target)) return
        e.preventDefault()
        useDiagrammerStore.getState().setSpaceHeld(true)
      } else if (e.key === 'Control') {
        useDiagrammerStore.getState().setCtrlHeld(true)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') useDiagrammerStore.getState().setSpaceHeld(false)
      else if (e.key === 'Control') useDiagrammerStore.getState().setCtrlHeld(false)
    }
    const onBlur = () => {
      useDiagrammerStore.getState().setSpaceHeld(false)
      useDiagrammerStore.getState().setCtrlHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])
}

function Board() {
  const nodes = useDiagrammerStore((s) => s.nodes)
  const edges = useDiagrammerStore((s) => s.edges)
  const onNodesChange = useDiagrammerStore((s) => s.onNodesChange)
  const onEdgesChange = useDiagrammerStore((s) => s.onEdgesChange)
  const onConnect = useDiagrammerStore((s) => s.onConnect)
  const addTable = useDiagrammerStore((s) => s.addTable)
  const moveNodesTo = useDiagrammerStore((s) => s.moveNodesTo)
  const linkingFrom = useDiagrammerStore((s) => s.linkingFrom)
  const cancelLinking = useDiagrammerStore((s) => s.cancelLinking)
  const requestRelation = useDiagrammerStore((s) => s.requestRelation)
  const requestNewTableRelation = useDiagrammerStore((s) => s.requestNewTableRelation)
  const startReconnecting = useDiagrammerStore((s) => s.startReconnecting)
  const stopReconnecting = useDiagrammerStore((s) => s.stopReconnecting)
  const reconnectEdge = useDiagrammerStore((s) => s.reconnectEdge)
  const isReconnectValid = useDiagrammerStore((s) => s.isReconnectValid)
  const spaceHeld = useDiagrammerStore((s) => s.spaceHeld)
  const ctrlHeld = useDiagrammerStore((s) => s.ctrlHeld)

  useGestureKeys()
  const rf = useReactFlow()
  const [paneMenu, setPaneMenu] = useState<PaneContextMenuState | null>(null)

  const handleAddTable = useCallback(() => addTable(), [addTable])

  const handleExport = useCallback(() => {
    const { nodes: currentNodes, edges: currentEdges, enums: currentEnums } =
      useDiagrammerStore.getState()
    const json = JSON.stringify(
      { nodes: currentNodes, edges: currentEdges, enums: currentEnums },
      null,
      2,
    )
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', 'h')
    a.href = url
    a.download = `diagrama-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const importDiagram = useDiagrammerStore((s) => s.importDiagram)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      if (
        useDiagrammerStore.getState().nodes.length > 0 &&
        !window.confirm('Importar vai substituir o diagrama atual. Continuar?')
      ) {
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string)
          importDiagram(data)
        } catch {
          window.alert('Arquivo inválido. Selecione um JSON exportado pelo Diagrammer.')
        }
      }
      reader.readAsText(file)
    },
    [importDiagram],
  )

  const selectedNodes = useMemo(() => nodes.filter((n) => n.selected), [nodes])
  const hasSelectedEdge = useMemo(() => edges.some((e) => e.selected), [edges])
  // Reconnect anchors only become draggable while Ctrl is held on a selected edge.
  const displayEdges = useMemo(
    () => edges.map((e) => ({ ...e, reconnectable: ctrlHeld && !!e.selected })),
    [edges, ctrlHeld],
  )
  const linkingFromNode = linkingFrom
    ? nodes.find((n) => n.id === linkingFrom)
    : undefined

  const handleCreateRelationFromSelection = useCallback(() => {
    if (selectedNodes.length !== 2) return
    requestRelation(selectedNodes[0].id, selectedNodes[1].id)
  }, [selectedNodes, requestRelation])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (linkingFrom && node.id !== linkingFrom) {
        requestRelation(linkingFrom, node.id)
      }
    },
    [linkingFrom, requestRelation],
  )

  useEffect(() => {
    if (!linkingFrom) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelLinking()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [linkingFrom, cancelLinking])

  // Ctrl+drag (from anywhere) moves the current selection.
  const moveDragRef = useRef<{
    startFlowX: number
    startFlowY: number
    startPositions: { id: string; position: { x: number; y: number } }[]
  } | null>(null)

  const handleWindowMouseMove = useCallback(
    (e: MouseEvent) => {
      const drag = moveDragRef.current
      if (!drag) return
      const current = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const dx = current.x - drag.startFlowX
      const dy = current.y - drag.startFlowY
      moveNodesTo(
        drag.startPositions.map((p) => ({
          id: p.id,
          position: { x: p.position.x + dx, y: p.position.y + dy },
        })),
      )
    },
    [rf, moveNodesTo],
  )

  const handleWindowMouseUp = useCallback(() => {
    moveDragRef.current = null
    window.removeEventListener('mousemove', handleWindowMouseMove)
    window.removeEventListener('mouseup', handleWindowMouseUp)

    // The browser fires a synthetic "click" right after this mouseup, which
    // React Flow's pane treats as "click empty space -> deselect all". Since
    // this was a drag (not a click), swallow that one click before it reaches
    // the pane so the current selection survives releasing the drag.
    const swallowNextClick = (e: MouseEvent) => e.stopPropagation()
    window.addEventListener('click', swallowNextClick, { capture: true, once: true })
    window.setTimeout(
      () => window.removeEventListener('click', swallowNextClick, { capture: true }),
      0,
    )
  }, [handleWindowMouseMove])

  const handleWrapperMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!ctrlHeld || e.button !== 0) return
      // While an edge is selected, Ctrl+drag is reserved for reconnecting its
      // endpoints (via React Flow's own anchors) — not for moving tables.
      const hasSelectedEdge = useDiagrammerStore.getState().edges.some((ed) => ed.selected)
      if (hasSelectedEdge) return
      const selected = useDiagrammerStore.getState().nodes.filter((n) => n.selected)
      if (selected.length === 0) return
      e.preventDefault()
      const startFlow = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      moveDragRef.current = {
        startFlowX: startFlow.x,
        startFlowY: startFlow.y,
        startPositions: selected.map((n) => ({ id: n.id, position: { ...n.position } })),
      }
      window.addEventListener('mousemove', handleWindowMouseMove)
      window.addEventListener('mouseup', handleWindowMouseUp)
    },
    [ctrlHeld, rf, handleWindowMouseMove, handleWindowMouseUp],
  )

  useEffect(
    () => () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
    },
    [handleWindowMouseMove, handleWindowMouseUp],
  )

  const handlePaneContextMenu = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      e.preventDefault()
      const flow = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      setPaneMenu({ screenX: e.clientX, screenY: e.clientY, flowX: flow.x, flowY: flow.y })
    },
    [rf],
  )

  // Reconnecting an existing relationship edge: only handles on the same
  // table the dragged end started on are valid drop targets.
  const reconnectActiveRef = useRef(false)

  const handleReconnectStart = useCallback(
    (_event: React.MouseEvent, edge: RelationshipEdgeType, handleType: HandleType) => {
      reconnectActiveRef.current = true
      const allowedTableId = handleType === 'target' ? edge.source : edge.target
      const excludeHandleId =
        handleType === 'target' ? edge.sourceHandle : edge.targetHandle
      startReconnecting({ edgeId: edge.id, allowedTableId, excludeHandleId })
    },
    [startReconnecting],
  )

  const handleReconnect = useCallback(
    (oldEdge: RelationshipEdgeType, connection: Connection) => {
      reconnectEdge(oldEdge.id, connection)
    },
    [reconnectEdge],
  )

  const handleReconnectEnd = useCallback(() => {
    stopReconnecting()
    // onConnectEnd fires for the same gesture right around this callback;
    // defer clearing so it still sees the "this was a reconnect" signal.
    window.setTimeout(() => {
      reconnectActiveRef.current = false
    }, 0)
  }, [stopReconnecting])

  // Dragging a connection from a handle and releasing it on empty canvas
  // (not onto another handle) opens a modal to name the new table and set
  // up the relationship in one step — nothing is created until confirmed.
  const handleConnectEnd = useCallback(
    (
      event: MouseEvent | TouchEvent,
      connectionState: { isValid: boolean | null; fromHandle: { nodeId: string } | null },
    ) => {
      if (reconnectActiveRef.current) return
      if (connectionState.isValid) return
      const originId = connectionState.fromHandle?.nodeId
      if (!originId) return
      const point = 'changedTouches' in event ? event.changedTouches[0] : event
      const flowPosition = rf.screenToFlowPosition({ x: point.clientX, y: point.clientY })
      requestNewTableRelation(originId, flowPosition)
    },
    [rf, requestNewTableRelation],
  )

  const handleIsValidConnection = useCallback(
    (connection: Connection | RelationshipEdgeType) =>
      isReconnectValid({ source: connection.source, target: connection.target }),
    [isReconnectValid],
  )

  // Locking node pointer-events is only for the "Space pans" / "Ctrl moves
  // tables" gestures — while reconnecting an edge (Ctrl + selected edge),
  // nodes must stay interactive so the drag can drop onto a handle.
  const moveTablesLockActive = ctrlHeld && !hasSelectedEdge
  const gestureLocked = spaceHeld || moveTablesLockActive

  return (
    <div
      className={gestureLocked ? 'gesture-lock h-full w-full' : 'h-full w-full'}
      style={spaceHeld ? { cursor: 'grab' } : moveTablesLockActive ? { cursor: 'move' } : undefined}
      onMouseDown={handleWrapperMouseDown}
    >
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={handleConnectEnd}
        onNodeClick={handleNodeClick}
        onPaneClick={cancelLinking}
        onPaneContextMenu={handlePaneContextMenu}
        onReconnectStart={handleReconnectStart}
        onReconnect={handleReconnect}
        onReconnectEnd={handleReconnectEnd}
        isValidConnection={handleIsValidConnection}
        reconnectRadius={18}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        multiSelectionKeyCode="Shift"
        selectionOnDrag={!spaceHeld && !ctrlHeld}
        selectionMode={SelectionMode.Full}
        panOnDrag={spaceHeld}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{ type: 'relationship' }}
        fitView
      >
        <Background />
        <Controls />
        <Panel position="top-left">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-md">
            <h1 className="px-1 text-sm font-semibold">Diagrammer</h1>
            <Button size="sm" className="gap-1" onClick={handleAddTable}>
              <Plus className="size-4" /> Nova tabela
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1"
              disabled={selectedNodes.length !== 2}
              onClick={handleCreateRelationFromSelection}
              title="Selecione 2 tabelas (shift+clique) para habilitar"
            >
              <Waypoints className="size-4" /> Criar relação
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1"
              onClick={handleExport}
              title="Baixar o diagrama como JSON"
            >
              <Download className="size-4" /> Salvar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1"
              onClick={handleImportClick}
              title="Importar um diagrama de um arquivo JSON"
            >
              <Upload className="size-4" /> Importar
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>
        </Panel>
        {linkingFromNode && (
          <Panel position="top-center">
            <div className="flex items-center gap-2 rounded-lg border border-primary bg-card px-3 py-1.5 text-sm shadow-md">
              <Waypoints className="size-4 text-primary" />
              Selecione a tabela para relacionar com{' '}
              <strong>{linkingFromNode.data.name}</strong>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={cancelLinking}
                title="Cancelar (Esc)"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </Panel>
        )}
        <RelationModal />
        <NewTableRelationModal />
        <ConfirmColumnDeleteDialog />
        <ConfirmTableDeleteDialog />
        <ConstraintModal />
        <EnumModal />
        <TableDetailModal />
      </ReactFlow>
      {paneMenu && (
        <PaneContextMenu
          state={paneMenu}
          canCreateRelation={selectedNodes.length === 2}
          onCreateTable={() => {
            addTable({ x: paneMenu.flowX, y: paneMenu.flowY })
            setPaneMenu(null)
          }}
          onCreateRelation={() => {
            handleCreateRelationFromSelection()
            setPaneMenu(null)
          }}
          onFitView={() => {
            rf.fitView()
            setPaneMenu(null)
          }}
          onClose={() => setPaneMenu(null)}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <div className="h-screen w-screen">
      <ReactFlowProvider>
        <Board />
      </ReactFlowProvider>
    </div>
  )
}
