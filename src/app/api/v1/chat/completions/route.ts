import { NextRequest, NextResponse } from "next/server";
import { proxyToOpenAI } from "@/lib/providers/openai";
import { proxyToAnthropic } from "@/lib/providers/anthropic";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Determine which provider to route to based on the model name. */
function resolveProvider(model: string): "openai" | "anthropic" | null {
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4")) {
    return "openai";
  }
  if (model.startsWith("claude-")) {
    return "anthropic";
  }
  return null;
}

/** Extract Bearer token from Authorization header. */
function extractBearerToken(header: string | null): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

/** Validate the API key against PAYGLLM_API_KEYS (comma-separated list). */
function isValidApiKey(token: string): boolean {
  const keys = process.env.PAYGLLM_API_KEYS;
  if (!keys) return false;
  return keys.split(",").some((k) => k.trim() === token);
}

/* ------------------------------------------------------------------ */
/*  POST /api/v1/chat/completions                                      */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  // --- Auth ---
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json(
      {
        error: {
          message: "Missing API key. Include an Authorization: Bearer <key> header.",
          type: "authentication_error",
          code: "missing_api_key",
        },
      },
      { status: 401 }
    );
  }

  if (!isValidApiKey(token)) {
    return NextResponse.json(
      {
        error: {
          message: "Invalid API key.",
          type: "authentication_error",
          code: "invalid_api_key",
        },
      },
      { status: 401 }
    );
  }

  // --- Parse body ---
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          message: "Invalid JSON in request body.",
          type: "invalid_request_error",
          code: "invalid_json",
        },
      },
      { status: 400 }
    );
  }

  const model = body.model as string | undefined;
  if (!model) {
    return NextResponse.json(
      {
        error: {
          message: "Missing required field: model",
          type: "invalid_request_error",
          code: "missing_model",
        },
      },
      { status: 400 }
    );
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json(
      {
        error: {
          message: "Missing required field: messages",
          type: "invalid_request_error",
          code: "missing_messages",
        },
      },
      { status: 400 }
    );
  }

  // --- Route to provider ---
  const provider = resolveProvider(model);
  if (!provider) {
    return NextResponse.json(
      {
        error: {
          message: `Unsupported model: ${model}. Supported prefixes: gpt-*, o1*, o3*, o4*, claude-*`,
          type: "invalid_request_error",
          code: "unsupported_model",
        },
      },
      { status: 400 }
    );
  }

  try {
    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          {
            error: {
              message: "OpenAI provider is not configured on this server.",
              type: "server_error",
              code: "provider_not_configured",
            },
          },
          { status: 503 }
        );
      }

      const upstreamRes = await proxyToOpenAI(body, apiKey);
      const data = await upstreamRes.json();

      return NextResponse.json(data, { status: upstreamRes.status });
    }

    if (provider === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          {
            error: {
              message: "Anthropic provider is not configured on this server.",
              type: "server_error",
              code: "provider_not_configured",
            },
          },
          { status: 503 }
        );
      }

      const { status, body: responseBody } = await proxyToAnthropic(
        body,
        apiKey
      );

      return NextResponse.json(responseBody, { status });
    }
  } catch (error) {
    console.error(`[paygllm] Error proxying to ${provider}:`, error);
    return NextResponse.json(
      {
        error: {
          message: "An error occurred while processing your request.",
          type: "server_error",
          code: "proxy_error",
        },
      },
      { status: 502 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  GET — health check / discovery                                     */
/* ------------------------------------------------------------------ */

export async function GET() {
  return NextResponse.json({
    object: "endpoint",
    url: "/api/v1/chat/completions",
    methods: ["POST"],
    description: "OpenAI-compatible chat completions proxy. Supports gpt-* and claude-* models.",
  });
}
