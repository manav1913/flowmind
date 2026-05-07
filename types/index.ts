export type NodeType =
  | "llm"
  | "tool"
  | "router"
  | "aggregator"
  | "input"
  | "output"
  | "retriever"
  | "transformer"

export type NodeStatus = "idle" | "running" | "success" | "error" | "skipped"

export type EdgeType = "default" | "conditional" | "parallel" | "fallback"

export interface Position {
  x: number
  y: number
}

export interface NodeConfig {
  model?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  toolName?: string
  toolDescription?: string
  routerCondition?: string
  transformFn?: string
  retrievalQuery?: string
  retryLimit?: number
  timeoutMs?: number
}

export interface PipelineNode {
  id: string
  type: NodeType
  label: string
  position: Position
  config: NodeConfig
  status: NodeStatus
}

export interface PipelineEdge {
  id: string
  source: string
  target: string
  type: EdgeType
  label?: string
  condition?: string
}

export interface Pipeline {
  id: string
  name: string
  description: string
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  createdAt: string
  updatedAt: string
  tags: string[]
}

export interface NodeTrace {
  nodeId: string
  nodeLabel: string
  nodeType: NodeType
  status: NodeStatus
  startedAt: number
  completedAt: number
  durationMs: number
  inputTokens?: number
  outputTokens?: number
  cost?: number
  input?: string
  output?: string
  error?: string
  retryCount: number
  metadata: Record<string, unknown>
}

export interface ExecutionRun {
  id: string
  pipelineId: string
  status: "running" | "success" | "error" | "cancelled"
  startedAt: number
  completedAt?: number
  totalDurationMs?: number
  totalTokens?: number
  totalCost?: number
  traces: NodeTrace[]
  userInput: string
  finalOutput?: string
  criticalPath: string[]
}

export interface FlameSpan {
  nodeId: string
  label: string
  type: NodeType
  startMs: number
  endMs: number
  durationMs: number
  depth: number
  status: NodeStatus
  cost?: number
  tokens?: number
  isCritical: boolean
}

export interface PipelineTemplate {
  id: string
  name: string
  description: string
  icon: string
  tags: string[]
  pipeline: Omit<Pipeline, "id" | "createdAt" | "updatedAt">
}

export interface CostBreakdown {
  nodeId: string
  nodeLabel: string
  inputCost: number
  outputCost: number
  totalCost: number
  percentage: number
}
