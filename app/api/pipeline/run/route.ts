import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

type AnthropicTextBlock = { type: "text"; text: string }
type AnthropicResponse = {
  content?: AnthropicTextBlock[]
  usage?: { input_tokens?: number; output_tokens?: number }
  model?: string
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY. Add it to .env.local before using real model execution." }, { status: 500 })
    }

    const { nodeConfig = {}, input = "", conversationHistory = [] } = await req.json()
    const model = nodeConfig.model ?? "claude-sonnet-4-20250514"
    const systemPrompt = nodeConfig.systemPrompt ?? "You are a helpful assistant."
    const maxTokens = Number(nodeConfig.maxTokens ?? 1024)
    const temperature = Number(nodeConfig.temperature ?? 0.7)

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [...conversationHistory, { role: "user", content: String(input) }]
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      return NextResponse.json({ error }, { status: response.status })
    }

    const data = (await response.json()) as AnthropicResponse
    const outputText = (data.content ?? []).filter((block) => block.type === "text").map((block) => block.text).join("")

    return NextResponse.json({ output: outputText, inputTokens: data.usage?.input_tokens ?? 0, outputTokens: data.usage?.output_tokens ?? 0, model: data.model ?? model })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
