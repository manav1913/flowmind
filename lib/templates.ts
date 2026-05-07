import { v4 as uuid } from "uuid"
import type { PipelineTemplate } from "@/types"

const n = () => uuid()

export const defaultTemplates: PipelineTemplate[] = [
  {
    id: "tpl-rag-agent",
    name: "RAG Agent",
    description: "Retrieval-Augmented Generation with document search and LLM synthesis",
    icon: "🔍",
    tags: ["rag", "retrieval", "production"],
    pipeline: {
      name: "RAG Agent",
      description: "Retrieves context then synthesizes with an LLM",
      tags: ["rag", "retrieval"],
      nodes: [
        {
          id: "in-1",
          type: "input",
          label: "User Query",
          position: { x: 60, y: 220 },
          config: {},
          status: "idle"
        },
        {
          id: "ret-1",
          type: "retriever",
          label: "Vector Search",
          position: { x: 260, y: 120 },
          config: {
            retrievalQuery: "{{input}}",
            timeoutMs: 3000
          },
          status: "idle"
        },
        {
          id: "trans-1",
          type: "transformer",
          label: "Context Formatter",
          position: { x: 460, y: 120 },
          config: {
            transformFn: "formatContext"
          },
          status: "idle"
        },
        {
          id: "llm-1",
          type: "llm",
          label: "Synthesis Agent",
          position: { x: 640, y: 220 },
          config: {
            model: "claude-sonnet-4-20250514",
            systemPrompt: "You are a helpful assistant. Use the provided context to answer the user's question accurately and concisely.",
            temperature: 0.3,
            maxTokens: 1024,
            retryLimit: 2
          },
          status: "idle"
        },
        {
          id: "out-1",
          type: "output",
          label: "Response",
          position: { x: 860, y: 220 },
          config: {},
          status: "idle"
        }
      ],
      edges: [
        { id: n(), source: "in-1", target: "ret-1", type: "default" },
        { id: n(), source: "in-1", target: "llm-1", type: "default" },
        { id: n(), source: "ret-1", target: "trans-1", type: "default" },
        { id: n(), source: "trans-1", target: "llm-1", type: "default" },
        { id: n(), source: "llm-1", target: "out-1", type: "default" }
      ]
    }
  },
  {
    id: "tpl-multi-agent",
    name: "Multi-Agent Router",
    description: "Router dispatches to specialized agents based on intent classification",
    icon: "🧠",
    tags: ["multi-agent", "routing", "classification"],
    pipeline: {
      name: "Multi-Agent Router",
      description: "Classifies intent and routes to specialist agents",
      tags: ["routing"],
      nodes: [
        {
          id: "in-1",
          type: "input",
          label: "User Request",
          position: { x: 60, y: 240 },
          config: {},
          status: "idle"
        },
        {
          id: "router-1",
          type: "router",
          label: "Intent Router",
          position: { x: 260, y: 240 },
          config: {
            routerCondition: "classify: code | analysis | creative | general",
            model: "claude-haiku-4-5-20251001"
          },
          status: "idle"
        },
        {
          id: "llm-code",
          type: "llm",
          label: "Code Agent",
          position: { x: 500, y: 80 },
          config: {
            model: "claude-sonnet-4-20250514",
            systemPrompt: "You are an expert software engineer. Write clean, efficient code.",
            temperature: 0.1,
            maxTokens: 2048
          },
          status: "idle"
        },
        {
          id: "llm-analysis",
          type: "llm",
          label: "Analysis Agent",
          position: { x: 500, y: 200 },
          config: {
            model: "claude-sonnet-4-20250514",
            systemPrompt: "You are a data analyst. Provide structured, insightful analysis.",
            temperature: 0.2,
            maxTokens: 1500
          },
          status: "idle"
        },
        {
          id: "llm-creative",
          type: "llm",
          label: "Creative Agent",
          position: { x: 500, y: 320 },
          config: {
            model: "claude-sonnet-4-20250514",
            systemPrompt: "You are a creative writer. Be imaginative and engaging.",
            temperature: 0.9,
            maxTokens: 1500
          },
          status: "idle"
        },
        {
          id: "agg-1",
          type: "aggregator",
          label: "Response Merger",
          position: { x: 720, y: 200 },
          config: {},
          status: "idle"
        },
        {
          id: "out-1",
          type: "output",
          label: "Final Answer",
          position: { x: 900, y: 200 },
          config: {},
          status: "idle"
        }
      ],
      edges: [
        { id: n(), source: "in-1", target: "router-1", type: "default" },
        { id: n(), source: "router-1", target: "llm-code", type: "conditional", label: "code" },
        { id: n(), source: "router-1", target: "llm-analysis", type: "conditional", label: "analysis" },
        { id: n(), source: "router-1", target: "llm-creative", type: "conditional", label: "creative" },
        { id: n(), source: "llm-code", target: "agg-1", type: "default" },
        { id: n(), source: "llm-analysis", target: "agg-1", type: "default" },
        { id: n(), source: "llm-creative", target: "agg-1", type: "default" },
        { id: n(), source: "agg-1", target: "out-1", type: "default" }
      ]
    }
  },
  {
    id: "tpl-parallel-research",
    name: "Parallel Research",
    description: "Fan-out research agents running in parallel, aggregated into a report",
    icon: "⚡",
    tags: ["parallel", "research", "fan-out"],
    pipeline: {
      name: "Parallel Research",
      description: "Concurrent agents research subtopics then merge findings",
      tags: ["parallel"],
      nodes: [
        {
          id: "in-1",
          type: "input",
          label: "Research Topic",
          position: { x: 60, y: 240 },
          config: {},
          status: "idle"
        },
        {
          id: "trans-1",
          type: "transformer",
          label: "Topic Splitter",
          position: { x: 240, y: 240 },
          config: { transformFn: "splitTopics" },
          status: "idle"
        },
        {
          id: "llm-a",
          type: "llm",
          label: "Agent A",
          position: { x: 450, y: 100 },
          config: { model: "claude-sonnet-4-20250514", maxTokens: 800, temperature: 0.4 },
          status: "idle"
        },
        {
          id: "llm-b",
          type: "llm",
          label: "Agent B",
          position: { x: 450, y: 240 },
          config: { model: "claude-sonnet-4-20250514", maxTokens: 800, temperature: 0.4 },
          status: "idle"
        },
        {
          id: "llm-c",
          type: "llm",
          label: "Agent C",
          position: { x: 450, y: 380 },
          config: { model: "claude-sonnet-4-20250514", maxTokens: 800, temperature: 0.4 },
          status: "idle"
        },
        {
          id: "agg-1",
          type: "aggregator",
          label: "Report Merger",
          position: { x: 680, y: 240 },
          config: {},
          status: "idle"
        },
        {
          id: "llm-final",
          type: "llm",
          label: "Report Synthesizer",
          position: { x: 860, y: 240 },
          config: {
            model: "claude-sonnet-4-20250514",
            systemPrompt: "Synthesize all research findings into a coherent, well-structured report.",
            temperature: 0.3,
            maxTokens: 2000
          },
          status: "idle"
        },
        {
          id: "out-1",
          type: "output",
          label: "Research Report",
          position: { x: 1060, y: 240 },
          config: {},
          status: "idle"
        }
      ],
      edges: [
        { id: n(), source: "in-1", target: "trans-1", type: "default" },
        { id: n(), source: "trans-1", target: "llm-a", type: "parallel" },
        { id: n(), source: "trans-1", target: "llm-b", type: "parallel" },
        { id: n(), source: "trans-1", target: "llm-c", type: "parallel" },
        { id: n(), source: "llm-a", target: "agg-1", type: "default" },
        { id: n(), source: "llm-b", target: "agg-1", type: "default" },
        { id: n(), source: "llm-c", target: "agg-1", type: "default" },
        { id: n(), source: "agg-1", target: "llm-final", type: "default" },
        { id: n(), source: "llm-final", target: "out-1", type: "default" }
      ]
    }
  }
]
