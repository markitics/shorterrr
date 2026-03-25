import { NextResponse } from "next/server";

/**
 * GET /api/v1/models — list available models.
 * Compatible with OpenAI's /v1/models endpoint format.
 */

const MODELS = [
  // OpenAI
  { id: "gpt-4o", provider: "openai" },
  { id: "gpt-4o-mini", provider: "openai" },
  { id: "gpt-4.1", provider: "openai" },
  { id: "gpt-4.1-mini", provider: "openai" },
  { id: "gpt-4.1-nano", provider: "openai" },
  { id: "o3-mini", provider: "openai" },
  // Anthropic
  { id: "claude-sonnet-4-20250514", provider: "anthropic" },
  { id: "claude-haiku-4-20250414", provider: "anthropic" },
  { id: "claude-opus-4-20250514", provider: "anthropic" },
];

export async function GET() {
  return NextResponse.json({
    object: "list",
    data: MODELS.map((m) => ({
      id: m.id,
      object: "model",
      created: 1700000000,
      owned_by: m.provider,
    })),
  });
}
