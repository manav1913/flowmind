"use client"

import { useState, type ReactNode } from "react"
import { usePipelineStore } from "@/lib/store"
import { defaultTemplates } from "@/lib/templates"
import { Plus, ChevronRight, Layers, Cpu, Zap, Search, LayoutGrid } from "lucide-react"

const TEMPLATE_ICONS: Record<string, ReactNode> = {
  "tpl-rag-agent": <Search size={13} />,
  "tpl-multi-agent": <Cpu size={13} />,
  "tpl-parallel-research": <Zap size={13} />
}

export function Sidebar() {
  const { pipelines, activePipelineId, setActivePipeline, createPipeline, loadTemplate } =
    usePipelineStore()
  const [showTemplates, setShowTemplates] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")

  function handleCreate() {
    if (!newName.trim()) return
    createPipeline(newName.trim(), "")
    setNewName("")
    setCreating(false)
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      <div className="px-4 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[var(--plasma)] flex items-center justify-center">
            <LayoutGrid size={13} color="white" />
          </div>
          <span className="font-display text-[15px] text-[var(--bright)]">FlowMind</span>
        </div>
        <p className="text-[10px] text-[var(--dim)] mt-1 font-mono">AI Pipeline Debugger</p>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        <div className="px-3 mb-1 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-[var(--dim)] font-mono">
            Pipelines
          </span>
          <button
            onClick={() => setCreating(true)}
            className="text-[var(--dim)] hover:text-[var(--plasma-glow)] transition-colors"
          >
            <Plus size={13} />
          </button>
        </div>

        {creating && (
          <div className="px-3 mb-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate()
                if (e.key === "Escape") setCreating(false)
              }}
              placeholder="Pipeline name..."
              className="w-full bg-[var(--raised)] border border-[var(--plasma-dim)] rounded px-2 py-1 text-xs text-[var(--bright)] outline-none font-mono placeholder:text-[var(--dim)]"
            />
          </div>
        )}

        <div className="space-y-0.5 px-2">
          {pipelines.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePipeline(p.id)}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded text-left transition-all group ${
                p.id === activePipelineId
                  ? "bg-[var(--muted)] text-[var(--bright)]"
                  : "text-[var(--ghost)] hover:text-[var(--bright)] hover:bg-[var(--raised)]"
              }`}
            >
              <Layers
                size={12}
                className={p.id === activePipelineId ? "text-[var(--plasma-glow)]" : ""}
              />
              <span className="text-xs truncate flex-1">{p.name}</span>
              {p.id === activePipelineId && (
                <ChevronRight size={10} className="text-[var(--plasma-glow)]" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 px-3">
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className="w-full flex items-center justify-between text-[10px] uppercase tracking-widest text-[var(--dim)] font-mono hover:text-[var(--ghost)] transition-colors"
          >
            <span>Templates</span>
            <ChevronRight
              size={10}
              className={`transition-transform ${showTemplates ? "rotate-90" : ""}`}
            />
          </button>

          {showTemplates && (
            <div className="mt-2 space-y-0.5">
              {defaultTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => loadTemplate(t.id)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded text-left text-[var(--ghost)] hover:text-[var(--bright)] hover:bg-[var(--raised)] transition-all"
                >
                  <span className="text-[var(--plasma-glow)]">{TEMPLATE_ICONS[t.id]}</span>
                  <div className="min-w-0">
                    <p className="text-xs truncate">{t.name}</p>
                    <p className="text-[9px] text-[var(--dim)] truncate mt-0.5">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

     
    </aside>
  )
}
