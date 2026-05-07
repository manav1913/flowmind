"use client"

import { useRef, useState } from "react"
import { usePipelineStore } from "@/lib/store"
import { executePipeline } from "@/lib/executor"
import { formatMs, formatCost, formatTokens, STATUS_COLORS, NODE_ICONS } from "@/lib/utils"
import { Play, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Clock } from "lucide-react"
import type { NodeTrace } from "@/types"

interface RunPanelProps {
  onRunComplete: () => void
}

export function RunPanel({ onRunComplete }: RunPanelProps) {
  const [expanded, setExpanded] = useState(true)
  const [userInput, setUserInput] = useState("")
  const [selectedTrace, setSelectedTrace] = useState<NodeTrace | null>(null)
  const tracesRef = useRef<NodeTrace[]>([])

  const {
    getActivePipeline,
    startRun,
    updateRun,
    updateNodeStatus,
    isRunning,
    runs,
    activeRunId
  } = usePipelineStore()

  const activeRun = runs.find((r) => r.id === activeRunId) ?? null
  const pipeline = getActivePipeline()

  async function handleRun() {
    if (!pipeline || isRunning || !userInput.trim()) return
    tracesRef.current = []

    const runId = startRun(userInput)

    try {
      const result = await executePipeline(
        pipeline,
        userInput,
        (nodeId) => {
          updateNodeStatus(nodeId, "running")
        },
        (trace) => {
          tracesRef.current = [...tracesRef.current, trace]
          updateNodeStatus(trace.nodeId, trace.status)
          updateRun(runId, { traces: tracesRef.current })
        }
      )

      updateRun(runId, result)
      onRunComplete()
    } catch (err) {
      updateRun(runId, {
        status: "error",
        completedAt: Date.now(),
        totalDurationMs: 0,
        finalOutput: err instanceof Error ? err.message : String(err)
      })
    }
  }

  const currentTraces = activeRun?.traces ?? []
  const errorCount = currentTraces.filter((t) => t.status === "error").length

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface)] shrink-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-[var(--raised)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-[var(--dim)] uppercase tracking-widest">
            Run Console
          </span>
          {activeRun?.status === "running" && (
            <span className="text-[10px] font-mono text-[var(--signal-amber)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal-amber)] animate-pulse" />
              Executing...
            </span>
          )}
          {activeRun?.status === "success" && (
            <span className="text-[10px] font-mono text-[var(--signal-green)] flex items-center gap-1">
              <CheckCircle size={10} />
              {formatMs(activeRun.totalDurationMs ?? 0)}
            </span>
          )}
          {errorCount > 0 && (
            <span className="text-[10px] font-mono text-[var(--signal-red)] flex items-center gap-1">
              <AlertCircle size={10} />
              {errorCount} error{errorCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {expanded ? <ChevronDown size={12} className="text-[var(--dim)]" /> : <ChevronUp size={12} className="text-[var(--dim)]" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          <div className="flex gap-2 mb-3">
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleRun()}
              placeholder="Enter your prompt to run the pipeline..."
              className="flex-1 bg-[var(--raised)] border border-[var(--border)] rounded px-3 py-1.5 text-xs text-[var(--bright)] outline-none font-mono placeholder:text-[var(--dim)] focus:border-[var(--plasma-dim)] transition-colors"
            />
            <button
              onClick={handleRun}
              disabled={isRunning || !userInput.trim()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                isRunning || !userInput.trim()
                  ? "bg-[var(--muted)] text-[var(--dim)] cursor-not-allowed"
                  : "bg-[var(--plasma)] text-white hover:bg-[var(--plasma-glow)] shadow-plasma"
              }`}
            >
              <Play size={11} />
              Run
            </button>
          </div>

          {currentTraces.length > 0 && (
            <div className="flex gap-3 overflow-x-auto">
              {currentTraces
                .filter((t) => t.nodeType !== "input" && t.nodeType !== "output")
                .map((trace) => (
                  <button
                    key={trace.nodeId}
                    onClick={() => setSelectedTrace(selectedTrace?.nodeId === trace.nodeId ? null : trace)}
                    className={`shrink-0 flex flex-col gap-1 p-2 rounded border transition-all text-left ${
                      selectedTrace?.nodeId === trace.nodeId
                        ? "border-[var(--plasma)] bg-[var(--plasma-dim)]"
                        : "border-[var(--border)] bg-[var(--raised)] hover:border-[var(--muted)]"
                    }`}
                    style={{ minWidth: 120 }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono" style={{ color: STATUS_COLORS[trace.status] }}>
                        ●
                      </span>
                      <span className="text-[10px] text-[var(--ghost)] font-mono">
                        {NODE_ICONS[trace.nodeType]}
                      </span>
                      <span className="text-[10px] text-[var(--bright)] truncate max-w-[80px]">
                        {trace.nodeLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-[var(--dim)] flex items-center gap-1">
                        <Clock size={8} />
                        {formatMs(trace.durationMs)}
                      </span>
                      {trace.cost !== undefined && (
                        <span className="text-[9px] font-mono text-[var(--dim)]">
                          {formatCost(trace.cost)}
                        </span>
                      )}
                      {trace.retryCount > 0 && (
                        <span className="text-[9px] font-mono text-[var(--signal-amber)]">
                          ↺{trace.retryCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          )}

          {selectedTrace && (
            <div className="mt-3 p-3 bg-[var(--raised)] border border-[var(--border)] rounded animate-fade-in-up">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-[var(--ghost)] uppercase tracking-widest">
                  {selectedTrace.nodeLabel} · Trace
                </span>
                <div className="flex items-center gap-3 text-[9px] font-mono text-[var(--dim)]">
                  {selectedTrace.inputTokens !== undefined && (
                    <span>{formatTokens(selectedTrace.inputTokens)} in</span>
                  )}
                  {selectedTrace.outputTokens !== undefined && (
                    <span>{formatTokens(selectedTrace.outputTokens)} out</span>
                  )}
                  {selectedTrace.cost !== undefined && (
                    <span className="text-[var(--signal-amber)]">{formatCost(selectedTrace.cost)}</span>
                  )}
                </div>
              </div>

              {selectedTrace.error && (
                <p className="text-[10px] font-mono text-[var(--signal-red)] mb-2 flex items-center gap-1">
                  <AlertCircle size={10} />
                  {selectedTrace.error}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                {selectedTrace.input && (
                  <div>
                    <p className="text-[8px] uppercase tracking-widest font-mono text-[var(--dim)] mb-1">
                      Input
                    </p>
                    <p className="text-[10px] font-mono text-[var(--ghost)] line-clamp-3">
                      {selectedTrace.input}
                    </p>
                  </div>
                )}
                {selectedTrace.output && (
                  <div>
                    <p className="text-[8px] uppercase tracking-widest font-mono text-[var(--dim)] mb-1">
                      Output
                    </p>
                    <p className="text-[10px] font-mono text-[var(--ghost)] line-clamp-3">
                      {selectedTrace.output}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
