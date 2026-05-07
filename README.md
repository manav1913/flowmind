# FlowMind

Deployment-ready visual AI pipeline debugger.

## Run locally

```bash
npm install
npm run type-check
npm run build
npm run dev
```

Create `.env.local` only if you want real Anthropic API calls:

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

## Canvas controls

- Drag nodes to move them
- Drag from the right handle of one node and drop on another node to connect
- Double-click a node to open the inspector
- Double-click empty canvas to add a node
- Mouse wheel to zoom
- Alt-drag / middle-click drag to pan
- Use the zoom buttons to zoom/reset

# FlowMind — AI Pipeline Debugger & Latency Profiler

> **Chrome DevTools for AI orchestration pipelines.**

FlowMind is a visual debugger built for engineers working with multi-agent AI systems. It lets you design, execute, and profile complex AI pipelines — seeing exactly where time is spent, where tokens are consumed, which agents fail, and what the critical path looks like.

Built as a portfolio project targeting [Mindra](https://mindra.ai) — an AI orchestration platform — FlowMind demonstrates deep familiarity with the core problems in agentic AI systems: latency attribution, cost visibility, retry cascades, and execution transparency.

---

## The Problem FlowMind Solves

When an AI pipeline takes 8 seconds to respond, you don't know if it's:
- The retriever saturating your vector DB
- An LLM with a long context window
- A retry cascade from a flaky tool call
- Three agents running sequentially that could be parallelized

Production AI orchestration is a black box. FlowMind opens it.

---

## Features

### Visual Pipeline Builder
- Drag-and-drop canvas to compose multi-node AI pipelines
- 7 node types: **LLM Agent**, **Tool Call**, **Router**, **Aggregator**, **Retriever**, **Transformer**, **I/O**
- Shift+click to draw edges between nodes; double-click canvas to add nodes
- Edge types: `default`, `conditional` (dashed), `parallel` (dotted), `fallback`

### Real-Time Execution Engine
- Topological execution with true parallel layer dispatch (`Promise.all` per layer)
- Live node status updates (idle → running → success/error) reflected on the canvas
- Per-node trace capture: input, output, latency, token counts, cost, retry count

### Flame Graph
- Gantt-style flame graph showing each node's execution span relative to total wall time
- Hover to inspect latency, cost, and token usage per span
- Critical path highlighting (slowest node per run)
- Depth-aware layout based on topological sort

### Node Inspector
- Click any node to open a config panel
- LLM nodes: model selector, system prompt, temperature slider, max tokens, retry limit
- Router nodes: model + routing condition
- Tool nodes: name and description
- Retriever nodes: query template
- Transformer nodes: transform function name

### Run Console
- Input prompt bar with Enter-to-run
- Per-node trace cards showing latency, cost, retry count
- Click a trace card to see full input/output and token breakdown

### Template Library
- **RAG Agent** — retriever → context formatter → LLM synthesis
- **Multi-Agent Router** — intent classifier dispatching to specialist agents
- **Parallel Research** — fan-out agents merged into a final report

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | File-based routing, React Server Components, API routes |
| Language | TypeScript (strict) | End-to-end type safety across pipeline graph, traces, store |
| State | Zustand + Immer | Immutable graph mutations without reducer boilerplate |
| Animation | CSS keyframes | Zero-dep, performant for live status indicators and edge flow |
| AI | Anthropic SDK (`/v1/messages`) | Direct integration for real LLM node execution |
| Styling | Tailwind CSS | Utility-first with custom design tokens in CSS variables |
| Canvas | SVG (no third-party graph lib) | Full control over rendering, edge routing, and performance |

---

## Architecture

```
flowmind/
├── app/
│   ├── dashboard/           # Main app shell (client layout)
│   ├── api/
│   │   └── pipeline/run/    # Anthropic API proxy for LLM nodes
│   └── globals.css          # Design tokens, animations
├── components/
│   ├── canvas/              # SVG pipeline canvas (drag, connect, render)
│   ├── flamegraph/          # Flame graph visualization
│   ├── inspector/           # Node config editor
│   ├── Sidebar.tsx          # Pipeline list + template browser
│   ├── TopBar.tsx           # Pipeline metadata + flame toggle
│   └── RunPanel.tsx         # Execution console + trace cards
├── lib/
│   ├── store.ts             # Zustand store (pipelines, runs, UI state)
│   ├── executor.ts          # Pipeline execution engine (topological sort, parallel dispatch)
│   ├── templates.ts         # Built-in pipeline templates
│   └── utils.ts             # Formatters, color maps, constants
└── types/
    └── index.ts             # All TypeScript types (Pipeline, Node, Trace, Run, etc.)
```

### Execution Engine

The executor (`lib/executor.ts`) implements:

1. **Topological sort** — Kahn's algorithm builds execution layers from the DAG
2. **Parallel layer dispatch** — All nodes in a layer execute concurrently via `Promise.all`
3. **Context propagation** — Each node receives outputs from its predecessor nodes
4. **Critical path computation** — Identifies the highest-latency node per run
5. **Cost estimation** — Per-model token pricing for input/output cost attribution

### State Model

```
Pipeline (static)
  └── nodes: PipelineNode[]      # type, position, config, status
  └── edges: PipelineEdge[]      # source, target, type, condition

ExecutionRun (dynamic)
  └── traces: NodeTrace[]        # per-node: latency, tokens, cost, I/O
  └── criticalPath: string[]     # hottest node IDs
  └── totalDurationMs, totalTokens, totalCost
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- An Anthropic API key (optional — simulated execution works without one)

### Installation

```bash
git clone https://github.com/your-username/flowmind
cd flowmind
npm install
```

### Environment Variables

```bash
cp .env.example .env.local
```

```env
ANTHROPIC_API_KEY=sk-ant-...
```

If no API key is provided, the simulation engine runs with realistic synthetic latencies.

### Run in Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

---

## Usage Guide

### Building a Pipeline

1. Select a template from the sidebar, or create a new pipeline
2. Double-click the canvas to add a node
3. Shift+click a source node, then Shift+click a target to draw an edge
4. Click any node to open the inspector and configure it
5. Drag nodes to rearrange

### Running a Pipeline

1. Type a prompt in the Run Console at the bottom
2. Press **Run** or hit Enter
3. Watch nodes light up in real-time as they execute
4. Click **Flame Graph** in the top bar to see latency breakdown
5. Click any trace card to inspect input/output and token usage

### Reading the Flame Graph

- X-axis = wall clock time (ms)
- Y-axis = execution depth (topological layer)
- Amber border = critical path node
- Red fill = error node
- Width = proportional to execution time

---

## Why This Matters for AI Orchestration

The problems FlowMind surfaces are the core problems of production AI systems:

- **Latency attribution** — Which node is the bottleneck? LLM? Retriever? Tool?
- **Cost visibility** — Which agents are expensive? Is the router model worth it?
- **Retry cascades** — Does one flaky node cause downstream failures?
- **Parallelism opportunity** — Can these sequential nodes run concurrently?
- **Model selection** — Does swapping claude-sonnet for claude-haiku here save 300ms and $0.002 per call?

These aren't hypothetical. At scale (10k+ pipeline runs/day), the insights FlowMind surfaces translate directly to latency SLAs, compute costs, and user experience.

---

## Roadmap

- [ ] Real multi-agent execution via actual Anthropic API calls per LLM node
- [ ] Export pipeline as JSON schema for import into orchestration frameworks (LangGraph, CrewAI, Mindra)
- [ ] Diff view between two runs of the same pipeline
- [ ] P50/P95/P99 latency aggregation across multiple runs
- [ ] WebSocket streaming for live token-level updates during LLM execution
- [ ] Cost budget alerts per pipeline run
- [ ] Mermaid / DOT graph export

---


