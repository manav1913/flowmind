import type { NodeType, NodeStatus } from "@/types"

export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function formatCost(cost: number): string {
  if (cost < 0.001) return `$${(cost * 1000).toFixed(4)}m`
  return `$${cost.toFixed(5)}`
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`
  return `${tokens}`
}

export const NODE_COLORS: Record<NodeType, string> = {
  input: "#3dfaac",
  output: "#3dfaac",
  llm: "#7c6ef4",
  tool: "#f4c84a",
  router: "#f4504a",
  aggregator: "#4ab4f4",
  retriever: "#a89cf8",
  transformer: "#c97b84"
}

export const NODE_BG: Record<NodeType, string> = {
  input: "rgba(61,250,172,0.08)",
  output: "rgba(61,250,172,0.08)",
  llm: "rgba(124,110,244,0.12)",
  tool: "rgba(244,200,74,0.10)",
  router: "rgba(244,80,74,0.10)",
  aggregator: "rgba(74,180,244,0.10)",
  retriever: "rgba(168,156,248,0.10)",
  transformer: "rgba(201,123,132,0.10)"
}

export const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "#6b6b8a",
  running: "#f4c84a",
  success: "#3dfaac",
  error: "#f4504a",
  skipped: "#2a2a3e"
}

export const NODE_ICONS: Record<NodeType, string> = {
  input: "→",
  output: "◎",
  llm: "◈",
  tool: "⚙",
  router: "⋈",
  aggregator: "⊕",
  retriever: "⌕",
  transformer: "⇝"
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}
