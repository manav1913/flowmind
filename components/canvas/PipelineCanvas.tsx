"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { usePipelineStore } from "@/lib/store"
import { NODE_COLORS, NODE_ICONS, STATUS_COLORS } from "@/lib/utils"
import type { NodeType, PipelineEdge, PipelineNode, Position } from "@/types"
import { Cpu, Database, GitFork, Merge, Minus, Plus, RotateCcw, Shuffle, Wrench } from "lucide-react"

const NODE_W = 140
const NODE_H = 52
const MIN_ZOOM = 0.45
const MAX_ZOOM = 2.25
const ZOOM_STEP = 0.12

const NODE_TYPE_LIST: { type: NodeType; label: string; icon: ReactNode }[] = [
  { type: "llm", label: "LLM Agent", icon: <Cpu size={12} /> },
  { type: "tool", label: "Tool Call", icon: <Wrench size={12} /> },
  { type: "router", label: "Router", icon: <GitFork size={12} /> },
  { type: "aggregator", label: "Aggregator", icon: <Merge size={12} /> },
  { type: "retriever", label: "Retriever", icon: <Database size={12} /> },
  { type: "transformer", label: "Transformer", icon: <Shuffle size={12} /> }
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getEdgePath(source: PipelineNode, target: PipelineNode): string {
  const sx = source.position.x + NODE_W
  const sy = source.position.y + NODE_H / 2
  const tx = target.position.x
  const ty = target.position.y + NODE_H / 2
  const dx = Math.max(Math.abs(tx - sx) * 0.5, 42)
  return `M${sx},${sy} C${sx + dx},${sy} ${tx - dx},${ty} ${tx},${ty}`
}

function getTempEdgePath(source: PipelineNode, pointer: Position): string {
  const sx = source.position.x + NODE_W
  const sy = source.position.y + NODE_H / 2
  const dx = Math.max(Math.abs(pointer.x - sx) * 0.5, 42)
  return `M${sx},${sy} C${sx + dx},${sy} ${pointer.x - dx},${pointer.y} ${pointer.x},${pointer.y}`
}

function findNodeAtPosition(nodes: PipelineNode[], point: Position, sourceId?: string): string | null {
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const node = nodes[i]
    if (sourceId && node.id === sourceId) continue
    if (
      point.x >= node.position.x &&
      point.x <= node.position.x + NODE_W &&
      point.y >= node.position.y &&
      point.y <= node.position.y + NODE_H
    ) {
      return node.id
    }
  }
  return null
}

export function PipelineCanvas() {
  const svgRef = useRef<SVGSVGElement>(null)
  const pointerCaptureRef = useRef<number | null>(null)

  const { getActivePipeline, addNode, updateNode, setSelectedNode, addEdge, removeEdge, selectedNodeId } = usePipelineStore()
  const pipeline = getActivePipeline()

  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
  const [tempConnection, setTempConnection] = useState<{ sourceId: string; pointer: Position } | null>(null)
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null)
  const [showNodeMenu, setShowNodeMenu] = useState(false)
  const [menuPos, setMenuPos] = useState<Position>({ x: 0, y: 0 })
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [panning, setPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const nodeMap = useMemo(() => new Map(pipeline?.nodes.map((node) => [node.id, node]) ?? []), [pipeline])

  const screenToWorld = useCallback((clientX: number, clientY: number): Position => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom }
  }, [pan.x, pan.y, zoom])

  const setPointerCapture = useCallback((pointerId: number) => {
    pointerCaptureRef.current = pointerId
    svgRef.current?.setPointerCapture(pointerId)
  }, [])

  const releasePointerCapture = useCallback(() => {
    if (pointerCaptureRef.current !== null && svgRef.current?.hasPointerCapture(pointerCaptureRef.current)) {
      svgRef.current.releasePointerCapture(pointerCaptureRef.current)
    }
    pointerCaptureRef.current = null
  }, [])

  const resetInteraction = useCallback(() => {
    setDragging(null)
    setPanning(false)
    setTempConnection(null)
    setHoverTargetId(null)
    releasePointerCapture()
  }, [releasePointerCapture])

  const finishConnection = useCallback((targetId: string | null) => {
    if (!pipeline || !tempConnection || !targetId || tempConnection.sourceId === targetId) {
      setTempConnection(null)
      setHoverTargetId(null)
      return
    }
    const exists = pipeline.edges.some((edge) => edge.source === tempConnection.sourceId && edge.target === targetId)
    if (!exists) addEdge({ source: tempConnection.sourceId, target: targetId, type: "default" })
    setTempConnection(null)
    setHoverTargetId(null)
  }, [addEdge, pipeline, tempConnection])

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).tagName !== "svg") return
    setShowNodeMenu(false)
    setSelectedNode(null)
    if (e.button === 1 || e.altKey || e.button === 2) {
      e.preventDefault()
      setPointerCapture(e.pointerId)
      setPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    }
  }, [pan.x, pan.y, setPointerCapture, setSelectedNode])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (tempConnection) {
      const pointer = screenToWorld(e.clientX, e.clientY)
      setTempConnection({ sourceId: tempConnection.sourceId, pointer })
      setHoverTargetId(findNodeAtPosition(pipeline?.nodes ?? [], pointer, tempConnection.sourceId))
      return
    }
    if (panning) {
      setPan({ x: panStart.current.panX + e.clientX - panStart.current.x, y: panStart.current.panY + e.clientY - panStart.current.y })
      return
    }
    if (!dragging) return
    const pointer = screenToWorld(e.clientX, e.clientY)
    updateNode(dragging.nodeId, { position: { x: Math.max(0, pointer.x - dragging.offsetX), y: Math.max(0, pointer.y - dragging.offsetY) } })
  }, [dragging, panning, pipeline, screenToWorld, tempConnection, updateNode])

  const handlePointerUp = useCallback(() => {
    if (tempConnection) finishConnection(hoverTargetId)
    setDragging(null)
    setPanning(false)
    releasePointerCapture()
  }, [finishConnection, hoverTargetId, releasePointerCapture, tempConnection])

  const handleNodePointerDown = useCallback((e: React.PointerEvent<SVGGElement>, node: PipelineNode) => {
    if (e.button !== 0 || tempConnection) return
    e.stopPropagation()
    setShowNodeMenu(false)
    setPointerCapture(e.pointerId)
    const pointer = screenToWorld(e.clientX, e.clientY)
    setDragging({ nodeId: node.id, offsetX: pointer.x - node.position.x, offsetY: pointer.y - node.position.y })
  }, [screenToWorld, setPointerCapture, tempConnection])

  const handleOutputHandlePointerDown = useCallback((e: React.PointerEvent<SVGCircleElement>, nodeId: string) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setDragging(null)
    setShowNodeMenu(false)
    setSelectedNode(null)
    setPointerCapture(e.pointerId)
    setTempConnection({ sourceId: nodeId, pointer: screenToWorld(e.clientX, e.clientY) })
  }, [screenToWorld, setPointerCapture, setSelectedNode])

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).tagName !== "svg") return
    const world = screenToWorld(e.clientX, e.clientY)
    setMenuPos(world)
    setShowNodeMenu(true)
  }, [screenToWorld])

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const worldX = (mouseX - pan.x) / zoom
    const worldY = (mouseY - pan.y) / zoom
    const nextZoom = clamp(zoom + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP), MIN_ZOOM, MAX_ZOOM)
    setZoom(nextZoom)
    setPan({ x: mouseX - worldX * nextZoom, y: mouseY - worldY * nextZoom })
  }, [pan.x, pan.y, zoom])

  const zoomBy = useCallback((delta: number) => setZoom((current) => clamp(current + delta, MIN_ZOOM, MAX_ZOOM)), [])
  const resetViewport = useCallback(() => { setPan({ x: 0, y: 0 }); setZoom(1) }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowNodeMenu(false)
        resetInteraction()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [resetInteraction])

  if (!pipeline) return null

  return (
    <div className="w-full h-full relative overflow-hidden grid-bg bg-[var(--void)]">
      <svg ref={svgRef} className="w-full h-full touch-none select-none" onContextMenu={(e) => e.preventDefault()} onPointerDown={handleCanvasPointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={resetInteraction} onDoubleClick={handleCanvasDoubleClick} onWheel={handleWheel}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="rgba(140,140,180,0.85)" /></marker>
          <marker id="arrow-plasma" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="var(--plasma)" /></marker>
          <marker id="arrow-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="var(--signal-green)" /></marker>
          <marker id="arrow-amber" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="var(--signal-amber)" /></marker>
          <filter id="glow-plasma"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {pipeline.edges.map((edge: PipelineEdge) => {
            const source = nodeMap.get(edge.source)
            const target = nodeMap.get(edge.target)
            if (!source || !target) return null
            const isParallel = edge.type === "parallel"
            const isConditional = edge.type === "conditional"
            const sourceStatus = source.status
            const isActive = sourceStatus === "success" || sourceStatus === "running"
            const color = isActive ? (sourceStatus === "running" ? "var(--signal-amber)" : "var(--signal-green)") : isParallel ? "rgba(124,110,244,0.78)" : "rgba(140,140,180,0.72)"
            const markerId = isActive ? (sourceStatus === "running" ? "arrow-amber" : "arrow-green") : "arrow"
            const path = getEdgePath(source, target)
            return (
              <g key={edge.id} className="group cursor-pointer" onDoubleClick={(event) => { event.stopPropagation(); removeEdge(edge.id) }}>
                <path d={path} fill="none" stroke={color} strokeWidth={isActive ? 2.2 : 1.75} strokeDasharray={isParallel ? "7 5" : isConditional ? "4 3" : "none"} markerEnd={`url(#${markerId})`} className={isActive && sourceStatus === "running" ? "animate-flow" : ""} opacity={0.95} vectorEffect="non-scaling-stroke" />
                <path d={path} fill="none" stroke="transparent" strokeWidth={12} vectorEffect="non-scaling-stroke" />
                {edge.label && <text x={(source.position.x + NODE_W + target.position.x) / 2} y={(source.position.y + target.position.y) / 2 + NODE_H / 2 - 6} fill="var(--ghost)" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono" pointerEvents="none">{edge.label}</text>}
              </g>
            )
          })}

          {tempConnection && (() => {
            const source = nodeMap.get(tempConnection.sourceId)
            if (!source) return null
            return <path d={getTempEdgePath(source, tempConnection.pointer)} fill="none" stroke="var(--plasma)" strokeWidth={2} strokeDasharray="7 5" markerEnd="url(#arrow-plasma)" opacity={0.95} vectorEffect="non-scaling-stroke" />
          })()}

          {pipeline.nodes.map((node) => {
            const color = NODE_COLORS[node.type]
            const statusColor = STATUS_COLORS[node.status]
            const isSelected = node.id === selectedNodeId
            const isConnectionSource = tempConnection?.sourceId === node.id
            const isConnectionTarget = Boolean(tempConnection && tempConnection.sourceId !== node.id)
            const isHoveredTarget = hoverTargetId === node.id
            return (
              <g key={node.id} transform={`translate(${node.position.x}, ${node.position.y})`} onPointerDown={(e) => handleNodePointerDown(e, node)} onDoubleClick={(e) => { e.stopPropagation(); setSelectedNode(node.id) }} className="cursor-grab active:cursor-grabbing">
                <rect width={NODE_W} height={NODE_H} rx={7} fill="var(--raised)" stroke={isConnectionSource ? "var(--signal-amber)" : isHoveredTarget || isConnectionTarget ? "var(--plasma)" : isSelected ? "var(--plasma)" : node.status === "running" ? "var(--signal-amber)" : node.status === "success" ? "var(--signal-green)" : node.status === "error" ? "var(--signal-red)" : "rgba(140,140,180,0.42)"} strokeWidth={isSelected || isConnectionSource || isConnectionTarget || node.status !== "idle" ? 1.8 : 1} className={node.status === "running" ? "animate-node-running" : ""} filter={isSelected ? "url(#glow-plasma)" : "none"} vectorEffect="non-scaling-stroke" />
                <rect width={3} height={NODE_H} rx="1.5" fill={color} opacity={0.95} pointerEvents="none" />
                <text x={16} y={18} fill={color} fontSize="9" fontFamily="JetBrains Mono" fontWeight="500" textAnchor="start" pointerEvents="none">{NODE_ICONS[node.type]} {node.type.toUpperCase()}</text>
                <text x={16} y={35} fill="var(--bright)" fontSize="11" fontFamily="DM Sans" fontWeight="500" pointerEvents="none">{node.label.length > 16 ? `${node.label.slice(0, 15)}…` : node.label}</text>
                <circle cx={0} cy={NODE_H / 2} r={7} fill="var(--void)" stroke={isHoveredTarget ? "var(--plasma)" : "rgba(140,140,180,0.6)"} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
                <circle cx={0} cy={NODE_H / 2} r={3.2} fill={isHoveredTarget ? "var(--plasma)" : "rgba(140,140,180,0.7)"} pointerEvents="none" />
                <circle cx={NODE_W - 8} cy={NODE_H / 2} r={3} fill={statusColor} opacity={node.status === "idle" ? 0.35 : 1} pointerEvents="none" />
                <circle cx={NODE_W} cy={NODE_H / 2} r={8} fill="var(--void)" stroke={isConnectionSource ? "var(--signal-amber)" : color} strokeWidth={1.8} className="cursor-crosshair" onPointerDown={(e) => handleOutputHandlePointerDown(e, node.id)} vectorEffect="non-scaling-stroke" />
                <circle cx={NODE_W} cy={NODE_H / 2} r={3.5} fill={isConnectionSource ? "var(--signal-amber)" : color} pointerEvents="none" />
              </g>
            )
          })}
        </g>
      </svg>

      {showNodeMenu && (
        <div className="absolute z-20 bg-[var(--raised)] border border-[var(--border)] rounded-lg shadow-2xl py-1 w-44 animate-fade-in-up" style={{ left: menuPos.x * zoom + pan.x, top: menuPos.y * zoom + pan.y }}>
          <p className="text-[9px] text-[var(--dim)] px-3 py-1 font-mono uppercase tracking-widest">Add Node</p>
          {NODE_TYPE_LIST.map((nt) => (
            <button key={nt.type} onClick={() => { const id = addNode(nt.type, { x: menuPos.x - NODE_W / 2, y: menuPos.y - NODE_H / 2 }); setShowNodeMenu(false); if (id) setSelectedNode(id) }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--ghost)] hover:text-[var(--bright)] hover:bg-[var(--muted)] transition-colors">
              <span style={{ color: NODE_COLORS[nt.type] }}>{nt.icon}</span>{nt.label}
            </button>
          ))}
        </div>
      )}

      <div className="absolute bottom-4 left-4 flex items-center gap-3 text-[10px] font-mono text-[var(--dim)] bg-[rgba(5,5,8,0.72)] border border-[var(--border)] rounded px-3 py-1.5 backdrop-blur">
        <span>Drag nodes · Drag right handle to connect · Double-click node to edit · Double-click canvas to add · Alt-drag to pan · Wheel to zoom</span>
      </div>
      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[rgba(13,13,20,0.86)] p-1 backdrop-blur">
        <button aria-label="Zoom out" onClick={() => zoomBy(-ZOOM_STEP)} className="h-7 w-7 rounded bg-[var(--raised)] text-[var(--ghost)] hover:text-[var(--bright)] hover:bg-[var(--muted)] flex items-center justify-center"><Minus size={13} /></button>
        <div className="w-14 text-center text-[10px] font-mono text-[var(--ghost)]">{Math.round(zoom * 100)}%</div>
        <button aria-label="Zoom in" onClick={() => zoomBy(ZOOM_STEP)} className="h-7 w-7 rounded bg-[var(--raised)] text-[var(--ghost)] hover:text-[var(--bright)] hover:bg-[var(--muted)] flex items-center justify-center"><Plus size={13} /></button>
        <button aria-label="Reset viewport" onClick={resetViewport} className="h-7 w-7 rounded bg-[var(--raised)] text-[var(--ghost)] hover:text-[var(--bright)] hover:bg-[var(--muted)] flex items-center justify-center"><RotateCcw size={13} /></button>
      </div>
      {tempConnection && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[var(--plasma)] text-white px-3 py-1 rounded text-[10px] font-mono font-semibold shadow-plasma">Drop on another node to connect</div>}
    </div>
  )
}
