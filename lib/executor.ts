import type { ExecutionRun, NodeTrace, NodeType, Pipeline, PipelineNode } from "@/types"

interface ExecutionContext {
  nodeOutputs: Map<string, string>
  userInput: string
}

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 0.000003, output: 0.000015 },
  "claude-haiku-4-5-20251001": { input: 0.00000025, output: 0.00000125 },
  "claude-opus-4-6": { input: 0.000015, output: 0.000075 }
}

const BASE_LATENCIES: Record<NodeType, { min: number; max: number }> = {
  input: { min: 0, max: 0 },
  output: { min: 0, max: 0 },
  llm: { min: 800, max: 1800 },
  tool: { min: 240, max: 850 },
  router: { min: 250, max: 650 },
  aggregator: { min: 70, max: 180 },
  retriever: { min: 160, max: 620 },
  transformer: { min: 45, max: 140 }
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min)
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getPredecessorOutputs(pipeline: Pipeline, context: ExecutionContext, nodeId: string): string[] {
  return pipeline.edges.filter((edge) => edge.target === nodeId).map((edge) => context.nodeOutputs.get(edge.source) ?? "").filter(Boolean)
}

function buildExecutionOrder(pipeline: Pipeline): PipelineNode[][] {
  const nodeMap = new Map(pipeline.nodes.map((node) => [node.id, node]))
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()
  pipeline.nodes.forEach((node) => { inDegree.set(node.id, 0); dependents.set(node.id, []) })
  pipeline.edges.forEach((edge) => {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) return
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
    dependents.get(edge.source)?.push(edge.target)
  })
  const layers: PipelineNode[][] = []
  let queue = pipeline.nodes.filter((node) => (inDegree.get(node.id) ?? 0) === 0)
  const visited = new Set<string>()
  while (queue.length > 0) {
    layers.push(queue)
    const next: PipelineNode[] = []
    queue.forEach((node) => {
      visited.add(node.id)
      dependents.get(node.id)?.forEach((depId) => {
        const degree = (inDegree.get(depId) ?? 1) - 1
        inDegree.set(depId, degree)
        if (degree === 0) {
          const depNode = nodeMap.get(depId)
          if (depNode) next.push(depNode)
        }
      })
    })
    queue = next
  }
  if (visited.size !== pipeline.nodes.length) throw new Error("Pipeline contains a cycle. Remove circular connections before running.")
  return layers
}

function computeCriticalPath(traces: NodeTrace[]): string[] {
  const slowest = traces.filter((trace) => trace.durationMs > 0).sort((a, b) => b.durationMs - a.durationMs)[0]
  return slowest ? [slowest.nodeId] : []
}

function buildOutputForNode(node: PipelineNode, inputText: string, predecessorCount: number) {
  switch (node.type) {
    case "llm": return `[Simulated LLM output from ${node.label}] Answer generated using the provided context.`
    case "router": return `[Router classified request as: analysis]`
    case "retriever": return `[Retrieved 3 relevant documents for: "${inputText.slice(0, 44)}..."]`
    case "transformer": return `[Transformed context: ${inputText.slice(0, 64)}]`
    case "aggregator": return `[Aggregated ${Math.max(predecessorCount, 1)} upstream result${predecessorCount === 1 ? "" : "s"}]`
    case "tool": return `[Tool "${node.config.toolName ?? "api_call"}" returned a successful result]`
    default: return inputText
  }
}

export async function executePipeline(
  pipeline: Pipeline,
  userInput: string,
  onNodeStart: (nodeId: string) => void,
  onNodeComplete: (trace: NodeTrace) => void
): Promise<Omit<ExecutionRun, "id" | "pipelineId" | "userInput">> {
  const context: ExecutionContext = { nodeOutputs: new Map(), userInput }
  const layers = buildExecutionOrder(pipeline)
  const traces: NodeTrace[] = []
  const runStart = Date.now()

  for (const layer of layers) {
    const layerTraces = await Promise.all(layer.map(async (node) => {
      onNodeStart(node.id)
      const startedAt = Date.now()
      const predecessorOutputs = getPredecessorOutputs(pipeline, context, node.id)
      const inputText = node.type === "input" ? userInput : predecessorOutputs.join("\n\n") || userInput
      const latencyRange = BASE_LATENCIES[node.type]
      if (latencyRange.max > 0) await sleep(randomBetween(latencyRange.min, latencyRange.max))
      const completedAt = Date.now()
      let inputTokens: number | undefined
      let outputTokens: number | undefined
      let cost: number | undefined
      let output = node.type === "input" ? userInput : buildOutputForNode(node, inputText, predecessorOutputs.length)
      if (node.type === "output") output = predecessorOutputs.join("\n\n") || inputText
      if (node.type === "llm") {
        inputTokens = estimateTokens(inputText) + estimateTokens(node.config.systemPrompt ?? "")
        outputTokens = randomBetween(80, 360)
        const modelKey = node.config.model ?? "claude-sonnet-4-20250514"
        const costRates = MODEL_COSTS[modelKey] ?? MODEL_COSTS["claude-sonnet-4-20250514"]
        cost = inputTokens * costRates.input + outputTokens * costRates.output
      }
      context.nodeOutputs.set(node.id, output)
      const trace: NodeTrace = { nodeId: node.id, nodeLabel: node.label, nodeType: node.type, status: "success", startedAt, completedAt, durationMs: completedAt - startedAt, inputTokens, outputTokens, cost, input: inputText, output, retryCount: 0, metadata: { model: node.config.model, temperature: node.config.temperature } }
      onNodeComplete(trace)
      return trace
    }))
    traces.push(...layerTraces)
  }

  const completedAt = Date.now()
  const totalMs = completedAt - runStart
  const totalTokens = traces.reduce((sum, trace) => sum + (trace.inputTokens ?? 0) + (trace.outputTokens ?? 0), 0)
  const totalCost = traces.reduce((sum, trace) => sum + (trace.cost ?? 0), 0)
  const criticalPath = computeCriticalPath(traces)
  const finalOutput = context.nodeOutputs.get(pipeline.nodes.find((node) => node.type === "output")?.id ?? "") ?? ""
  return { status: "success", startedAt: runStart, completedAt, totalDurationMs: totalMs, totalTokens, totalCost, traces, finalOutput, criticalPath }
}

export function buildFlameSpans(run: ExecutionRun, pipeline: Pipeline) {
  const layers = buildExecutionOrder(pipeline)
  const nodeLayerMap = new Map<string, number>()
  layers.forEach((layer, depth) => layer.forEach((node) => nodeLayerMap.set(node.id, depth)))
  const baseTime = run.startedAt
  const critical = new Set(run.criticalPath)
  return run.traces.filter((trace) => trace.durationMs > 0).sort((a, b) => a.startedAt - b.startedAt).map((trace, index) => ({
    nodeId: trace.nodeId,
    label: trace.nodeLabel,
    type: trace.nodeType,
    startMs: Math.max(0, trace.startedAt - baseTime),
    endMs: Math.max(0, trace.completedAt - baseTime),
    durationMs: trace.durationMs,
    depth: nodeLayerMap.get(trace.nodeId) ?? index,
    status: trace.status,
    cost: trace.cost,
    tokens: (trace.inputTokens ?? 0) + (trace.outputTokens ?? 0),
    isCritical: critical.has(trace.nodeId)
  }))
}
