"use client"

import { useMemo, useState } from "react"
import type { ExecutionRun } from "@/types"
import { usePipelineStore } from "@/lib/store"
import { buildFlameSpans } from "@/lib/executor"
import { NODE_COLORS, formatCost, formatMs } from "@/lib/utils"

interface FlameGraphProps {
  run: ExecutionRun
}

export function FlameGraph({ run }: FlameGraphProps) {
  const { getActivePipeline } = usePipelineStore()
  const pipeline = getActivePipeline()
  const [hovered, setHovered] = useState<string | null>(null)

  const spans = useMemo(() => {
    if (!pipeline) return []
    return buildFlameSpans(run, pipeline)
  }, [run, pipeline])

  if (!pipeline || spans.length === 0) return null

  const totalMs = Math.max(run.totalDurationMs ?? 1, 1)
  const BAR_H = 38
  const LABEL_W = 168
  const hoveredSpan = spans.find((span) => span.nodeId === hovered)

  return (
    <div className="h-full flex flex-col bg-[var(--surface)]">
      <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-mono text-[var(--dim)] uppercase tracking-widest">Flame Graph</span>
          <span className="text-[11px] font-mono text-[var(--ghost)]">{formatMs(totalMs)} total</span>
          {run.totalCost !== undefined && <span className="text-[11px] font-mono text-[var(--ghost)]">{formatCost(run.totalCost)} cost</span>}
          {run.totalTokens !== undefined && <span className="text-[11px] font-mono text-[var(--ghost)]">{run.totalTokens.toLocaleString()} tokens</span>}
        </div>
        {hoveredSpan && (
          <div className="hidden md:flex items-center gap-3 text-[11px] font-mono min-w-0">
            <span className="text-[var(--bright)] truncate max-w-[180px]">{hoveredSpan.label}</span>
            <span className="text-[var(--signal-amber)]">{formatMs(hoveredSpan.durationMs)}</span>
            {hoveredSpan.cost !== undefined && <span className="text-[var(--ghost)]">{formatCost(hoveredSpan.cost)}</span>}
            {hoveredSpan.tokens !== undefined && <span className="text-[var(--ghost)]">{hoveredSpan.tokens} tok</span>}
            {hoveredSpan.isCritical && <span className="text-[var(--signal-red)] bg-[rgba(244,80,74,0.1)] px-1.5 py-0.5 rounded">critical path</span>}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex" style={{ height: spans.length * BAR_H + 28 }}>
          <div style={{ width: LABEL_W }} className="shrink-0 relative border-r border-[var(--border)] bg-[var(--surface)]">
            {spans.map((span, index) => (
              <div key={span.nodeId} className="absolute flex items-center px-3 text-[11px] font-mono" style={{ top: index * BAR_H + 10, height: BAR_H - 10, width: LABEL_W, color: hovered === span.nodeId ? "var(--bright)" : "var(--ghost)" }}>
                <span className="truncate w-full text-right">{span.label}</span>
              </div>
            ))}
          </div>

          <div className="flex-1 relative overflow-hidden" style={{ isolation: "isolate" }}>
            <div className="absolute inset-0 pointer-events-none -z-10">
              {[0, 25, 50, 75, 100].map((pct) => (
                <div key={pct} className="absolute top-0 bottom-0 border-l border-[var(--border)]" style={{ left: `${pct}%` }}>
                  <span className="absolute bottom-0 left-1 text-[9px] font-mono text-[var(--muted)]">{formatMs((pct / 100) * totalMs)}</span>
                </div>
              ))}
            </div>
            {spans.map((span, index) => {
              const left = Math.max((span.startMs / totalMs) * 100, 0)
              const rawWidth = Math.max((span.durationMs / totalMs) * 100, 1.2)
              const width = Math.min(rawWidth, 100 - left)
              const color = NODE_COLORS[span.type]
              const isError = span.status === "error"
              return (
                <div key={span.nodeId} className="absolute flex items-center px-3 cursor-pointer transition-opacity" style={{ left: `${left}%`, width: `${width}%`, top: index * BAR_H + 10, height: BAR_H - 10, background: isError ? "rgba(244,80,74,0.3)" : `${color}30`, border: `1.5px solid ${isError ? "var(--signal-red)" : span.isCritical ? "var(--signal-amber)" : color}`, borderRadius: 5, opacity: hovered && hovered !== span.nodeId ? 0.45 : 1 }} onMouseEnter={() => setHovered(span.nodeId)} onMouseLeave={() => setHovered(null)} title={`${span.label} · ${formatMs(span.durationMs)}`}>
                  {width > 5 && <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: isError ? "var(--signal-red)" : color }}>{formatMs(span.durationMs)}</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
