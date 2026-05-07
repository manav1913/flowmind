"use client"

import type { ReactNode } from "react"
import { usePipelineStore } from "@/lib/store"
import { NODE_COLORS, NODE_ICONS } from "@/lib/utils"
import { X, Trash2 } from "lucide-react"

const MODELS = [
  "claude-sonnet-4-20250514",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-6"
]

function Label({ children }: { children: ReactNode }) {
  return (
    <label className="text-[9px] uppercase tracking-widest font-mono text-[var(--dim)] block mb-1">
      {children}
    </label>
  )
}

function Field({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[var(--raised)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--bright)] outline-none font-mono placeholder:text-[var(--dim)] focus:border-[var(--plasma-dim)] transition-colors"
    />
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[var(--raised)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--bright)] outline-none font-mono placeholder:text-[var(--dim)] resize-none focus:border-[var(--plasma-dim)] transition-colors"
    />
  )
}

export function NodeInspector() {
  const { getActivePipeline, selectedNodeId, updateNode, removeNode, setSelectedNode } =
    usePipelineStore()
  const pipeline = getActivePipeline()
  const node = pipeline?.nodes.find((n) => n.id === selectedNodeId)

  if (!node) return null

  const color = NODE_COLORS[node.type]

  function patch(key: string, val: string | number) {
    if (!node) return
    updateNode(node.id, {
      config: { ...node.config, [key]: val }
    })
  }

  return (
    <div className="h-full flex flex-col bg-[var(--surface)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span style={{ color }} className="text-sm">
            {NODE_ICONS[node.type]}
          </span>
          <div>
            <p className="text-xs text-[var(--bright)] font-medium">{node.label}</p>
            <p className="text-[9px] text-[var(--dim)] font-mono">{node.type.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              removeNode(node.id)
              setSelectedNode(null)
            }}
            className="p-1 text-[var(--dim)] hover:text-[var(--signal-red)] transition-colors"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={() => setSelectedNode(null)}
            className="p-1 text-[var(--dim)] hover:text-[var(--ghost)] transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Field>
          <Label>Label</Label>
          <Input
            value={node.label}
            onChange={(v) => updateNode(node.id, { label: v })}
            placeholder="Node label"
          />
        </Field>

        {node.type === "llm" && (
          <>
            <Field>
              <Label>Model</Label>
              <select
                value={node.config.model ?? "claude-sonnet-4-20250514"}
                onChange={(e) => patch("model", e.target.value)}
                className="w-full bg-[var(--raised)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--bright)] outline-none font-mono focus:border-[var(--plasma-dim)] transition-colors"
              >
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <Label>System Prompt</Label>
              <Textarea
                value={node.config.systemPrompt ?? ""}
                onChange={(v) => patch("systemPrompt", v)}
                placeholder="You are a helpful assistant..."
                rows={5}
              />
            </Field>
            <Field>
              <Label>Temperature ({node.config.temperature ?? 0.7})</Label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={node.config.temperature ?? 0.7}
                onChange={(e) => patch("temperature", parseFloat(e.target.value))}
                className="w-full accent-[var(--plasma)]"
              />
            </Field>
            <Field>
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={node.config.maxTokens ?? 1024}
                onChange={(v) => patch("maxTokens", Number.isFinite(Number(v)) ? Number(v) : 0)}
                placeholder="1024"
              />
            </Field>
            <Field>
              <Label>Retry Limit</Label>
              <Input
                type="number"
                value={node.config.retryLimit ?? 0}
                onChange={(v) => patch("retryLimit", Number.isFinite(Number(v)) ? Number(v) : 0)}
                placeholder="0"
              />
            </Field>
          </>
        )}

        {node.type === "tool" && (
          <>
            <Field>
              <Label>Tool Name</Label>
              <Input
                value={node.config.toolName ?? ""}
                onChange={(v) => patch("toolName", v)}
                placeholder="web_search"
              />
            </Field>
            <Field>
              <Label>Description</Label>
              <Textarea
                value={node.config.toolDescription ?? ""}
                onChange={(v) => patch("toolDescription", v)}
                placeholder="Search the web for current information"
              />
            </Field>
          </>
        )}

        {node.type === "router" && (
          <>
            <Field>
              <Label>Router Model</Label>
              <select
                value={node.config.model ?? "claude-haiku-4-5-20251001"}
                onChange={(e) => patch("model", e.target.value)}
                className="w-full bg-[var(--raised)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--bright)] outline-none font-mono focus:border-[var(--plasma-dim)] transition-colors"
              >
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <Label>Routing Condition</Label>
              <Textarea
                value={node.config.routerCondition ?? ""}
                onChange={(v) => patch("routerCondition", v)}
                placeholder="classify: code | analysis | creative | general"
              />
            </Field>
          </>
        )}

        {node.type === "retriever" && (
          <Field>
            <Label>Query Template</Label>
            <Textarea
              value={node.config.retrievalQuery ?? ""}
              onChange={(v) => patch("retrievalQuery", v)}
              placeholder="{{input}}"
            />
          </Field>
        )}

        {node.type === "transformer" && (
          <Field>
            <Label>Transform Function</Label>
            <Input
              value={node.config.transformFn ?? ""}
              onChange={(v) => patch("transformFn", v)}
              placeholder="formatContext"
            />
          </Field>
        )}

        {(node.type === "llm" || node.type === "tool" || node.type === "retriever") && (
          <Field>
            <Label>Timeout (ms)</Label>
            <Input
              type="number"
              value={node.config.timeoutMs ?? 10000}
              onChange={(v) => patch("timeoutMs", Number.isFinite(Number(v)) ? Number(v) : 0)}
              placeholder="10000"
            />
          </Field>
        )}
      </div>
    </div>
  )
}
