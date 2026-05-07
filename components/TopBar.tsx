"use client"

import { usePipelineStore } from "@/lib/store"
import { Activity, GitBranch, Flame, Clock } from "lucide-react"
import { formatMs } from "@/lib/utils"

interface TopBarProps {
  onToggleFlame: () => void
  showFlame: boolean
}

export function TopBar({ onToggleFlame, showFlame }: TopBarProps) {
  const { getActivePipeline, runs, activeRunId } = usePipelineStore()
  const pipeline = getActivePipeline()
  const activeRun = runs.find((r) => r.id === activeRunId) ?? null
  const runCount = runs.filter((r) => r.pipelineId === pipeline?.id).length

  return (
    <header className="h-11 flex items-center px-4 border-b border-[var(--border)] bg-[var(--surface)] shrink-0 gap-4">
      <div className="flex items-center gap-2 flex-1">
        <GitBranch size={13} className="text-[var(--plasma-glow)]" />
        <span className="text-sm text-[var(--bright)] font-medium">{pipeline?.name}</span>
        <span className="text-[10px] font-mono text-[var(--dim)] bg-[var(--raised)] px-1.5 py-0.5 rounded">
          {pipeline?.nodes.length ?? 0} nodes · {pipeline?.edges.length ?? 0} edges
        </span>
      </div>

      {activeRun?.status === "running" && (
        <div className="flex items-center gap-1.5 text-[var(--signal-amber)]">
          <Activity size={11} className="animate-pulse" />
          <span className="text-[10px] font-mono">Running...</span>
        </div>
      )}

      {activeRun?.status === "success" && activeRun.totalDurationMs && (
        <div className="flex items-center gap-1.5 text-[var(--signal-green)]">
          <Clock size={11} />
          <span className="text-[10px] font-mono">{formatMs(activeRun.totalDurationMs)}</span>
        </div>
      )}

      {runCount > 0 && (
        <span className="text-[10px] font-mono text-[var(--dim)]">{runCount} run{runCount !== 1 ? "s" : ""}</span>
      )}

      <button
        onClick={onToggleFlame}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono transition-all ${
          showFlame
            ? "bg-[var(--plasma-dim)] text-[var(--plasma-glow)] border border-[var(--plasma)]"
            : "text-[var(--dim)] hover:text-[var(--ghost)] border border-transparent hover:border-[var(--border)]"
        }`}
      >
        <Flame size={11} />
        Flame Graph
      </button>
    </header>
  )
}
