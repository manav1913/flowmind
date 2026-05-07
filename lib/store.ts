import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { v4 as uuid } from "uuid"
import type {
  Pipeline,
  PipelineNode,
  PipelineEdge,
  ExecutionRun,
  NodeStatus,
  NodeType,
  Position
} from "@/types"
import { defaultTemplates } from "@/lib/templates"

interface PipelineStore {
  pipelines: Pipeline[]
  activePipelineId: string | null
  runs: ExecutionRun[]
  activeRunId: string | null
  selectedNodeId: string | null
  isRunning: boolean

  setActivePipeline: (id: string) => void
  createPipeline: (name: string, description: string) => string
  deletePipeline: (id: string) => void
  loadTemplate: (templateId: string) => string

  addNode: (type: NodeType, position: Position) => string
  updateNode: (nodeId: string, updates: Partial<PipelineNode>) => void
  removeNode: (nodeId: string) => void
  setSelectedNode: (nodeId: string | null) => void
  updateNodeStatus: (nodeId: string, status: NodeStatus) => void

  addEdge: (edge: Omit<PipelineEdge, "id">) => void
  removeEdge: (edgeId: string) => void

  startRun: (userInput: string) => string
  updateRun: (runId: string, updates: Partial<ExecutionRun>) => void
  setActiveRun: (runId: string | null) => void
  getActivePipeline: () => Pipeline | null
  getActiveRun: () => ExecutionRun | null
}

const defaultNodeLabels: Record<NodeType, string> = {
  llm: "LLM Agent",
  tool: "Tool Call",
  router: "Router",
  aggregator: "Aggregator",
  input: "User Input",
  output: "Final Output",
  retriever: "Retriever",
  transformer: "Transformer"
}

export const usePipelineStore = create<PipelineStore>()(
  immer((set, get) => ({
    pipelines: defaultTemplates.map((t) => ({
      ...t.pipeline,
      id: t.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })),
    activePipelineId: defaultTemplates[0].id,
    runs: [],
    activeRunId: null,
    selectedNodeId: null,
    isRunning: false,

    setActivePipeline: (id) => {
      set((state) => {
        state.activePipelineId = id
        state.selectedNodeId = null
        state.activeRunId = null
      })
    },

    createPipeline: (name, description) => {
      const id = uuid()
      set((state) => {
        state.pipelines.push({
          id,
          name,
          description,
          nodes: [
            {
              id: uuid(),
              type: "input",
              label: "User Input",
              position: { x: 100, y: 200 },
              config: {},
              status: "idle"
            },
            {
              id: uuid(),
              type: "output",
              label: "Final Output",
              position: { x: 700, y: 200 },
              config: {},
              status: "idle"
            }
          ],
          edges: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: []
        })
        state.activePipelineId = id
      })
      return id
    },

    deletePipeline: (id) => {
      set((state) => {
        state.pipelines = state.pipelines.filter((p) => p.id !== id)
        if (state.activePipelineId === id) {
          state.activePipelineId = state.pipelines[0]?.id ?? null
        }
      })
    },

    loadTemplate: (templateId) => {
      const template = defaultTemplates.find((t) => t.id === templateId)
      if (!template) return ""
      const id = uuid()
      set((state) => {
        state.pipelines.push({
          ...template.pipeline,
          id,
          name: `${template.name} (copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        state.activePipelineId = id
      })
      return id
    },

    addNode: (type, position) => {
      const id = uuid()
      const pipeline = get().getActivePipeline()
      if (!pipeline) return ""
      set((state) => {
        const p = state.pipelines.find((p) => p.id === state.activePipelineId)
        if (!p) return
        p.nodes.push({
          id,
          type,
          label: defaultNodeLabels[type],
          position,
          config: {},
          status: "idle"
        })
        p.updatedAt = new Date().toISOString()
      })
      return id
    },

    updateNode: (nodeId, updates) => {
      set((state) => {
        const p = state.pipelines.find((p) => p.id === state.activePipelineId)
        if (!p) return
        const node = p.nodes.find((n) => n.id === nodeId)
        if (!node) return
        Object.assign(node, updates)
        p.updatedAt = new Date().toISOString()
      })
    },

    removeNode: (nodeId) => {
      set((state) => {
        const p = state.pipelines.find((p) => p.id === state.activePipelineId)
        if (!p) return
        p.nodes = p.nodes.filter((n) => n.id !== nodeId)
        p.edges = p.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        )
        if (state.selectedNodeId === nodeId) state.selectedNodeId = null
      })
    },

    setSelectedNode: (nodeId) => {
      set((state) => {
        state.selectedNodeId = nodeId
      })
    },

    updateNodeStatus: (nodeId, status) => {
      set((state) => {
        const p = state.pipelines.find((p) => p.id === state.activePipelineId)
        if (!p) return
        const node = p.nodes.find((n) => n.id === nodeId)
        if (node) node.status = status
      })
    },

    addEdge: (edge) => {
      set((state) => {
        const p = state.pipelines.find((p) => p.id === state.activePipelineId)
        if (!p) return
        const exists = p.edges.some(
          (e) => e.source === edge.source && e.target === edge.target
        )
        if (!exists) {
          p.edges.push({ ...edge, id: uuid() })
          p.updatedAt = new Date().toISOString()
        }
      })
    },

    removeEdge: (edgeId) => {
      set((state) => {
        const p = state.pipelines.find((p) => p.id === state.activePipelineId)
        if (!p) return
        p.edges = p.edges.filter((e) => e.id !== edgeId)
      })
    },

    startRun: (userInput) => {
      const id = uuid()
      const pipeline = get().getActivePipeline()
      if (!pipeline) return ""
      set((state) => {
        state.runs.push({
          id,
          pipelineId: pipeline.id,
          status: "running",
          startedAt: Date.now(),
          traces: [],
          userInput,
          criticalPath: []
        })
        state.activeRunId = id
        state.isRunning = true
        const p = state.pipelines.find((p) => p.id === pipeline.id)
        if (p) p.nodes.forEach((n) => (n.status = "idle"))
      })
      return id
    },

    updateRun: (runId, updates) => {
      set((state) => {
        const run = state.runs.find((r) => r.id === runId)
        if (run) {
          Object.assign(run, updates)
          if (
            updates.status === "success" ||
            updates.status === "error" ||
            updates.status === "cancelled"
          ) {
            state.isRunning = false
          }
        }
      })
    },

    setActiveRun: (runId) => {
      set((state) => {
        state.activeRunId = runId
      })
    },

    getActivePipeline: () => {
      const state = get()
      return state.pipelines.find((p) => p.id === state.activePipelineId) ?? null
    },

    getActiveRun: () => {
      const state = get()
      return state.runs.find((r) => r.id === state.activeRunId) ?? null
    }
  }))
)
