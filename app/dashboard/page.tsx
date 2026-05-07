"use client"

import { useState } from "react"
import { Sidebar } from "@/components/Sidebar"
import { PipelineCanvas } from "@/components/canvas/PipelineCanvas"
import { NodeInspector } from "@/components/inspector/NodeInspector"
import { RunPanel } from "@/components/RunPanel"
import { FlameGraph } from "@/components/flamegraph/FlameGraph"
import { TopBar } from "@/components/TopBar"
import { usePipelineStore } from "@/lib/store"

export default function DashboardPage() {
  const [showFlame, setShowFlame] = useState(false)
  const { activeRunId, runs, selectedNodeId } = usePipelineStore()

  const activeRun = runs.find((r) => r.id === activeRunId) ?? null

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--void)]">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onToggleFlame={() => setShowFlame((v) => !v)} showFlame={showFlame} />

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 relative min-w-0">
            <PipelineCanvas />
          </div>

          {selectedNodeId && (
            <div className="w-80 shrink-0 border-l border-[var(--border)] overflow-y-auto">
              <NodeInspector />
            </div>
          )}
        </div>

        {showFlame && activeRun && (
          <div className="h-64 border-t border-[var(--border)] shrink-0">
            <FlameGraph run={activeRun} />
          </div>
        )}

        <RunPanel onRunComplete={() => setShowFlame(true)} />
      </div>
    </div>
  )
}
