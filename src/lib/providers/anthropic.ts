/**
 * Anthropic provider — converts OpenAI-format requests to Anthropic's
 * Messages API format, proxies the request, and converts the response back.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AnthropicContent {
  type: "text";
  text: string;
}

interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContent[];
  model: string;
  stop_reason: string | null;
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * Convert OpenAI chat messages → Anthropic system + messages params.
 */
function convertMessages(messages: OpenAIMessage[]): {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
} {
  let system: string | undefined;
  const converted: { role: "user" | "assistant"; content: string }[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      // Anthropic uses a top-level system param, not a system message
      system = system ? `${system}\n\n${msg.content}` : msg.content;
    } else {
      converted.push({ role: msg.role, content: msg.content });
    }
  }

  return { system, messages: converted };
}

/**
 * Convert Anthropic response → OpenAI-format response.
 */
function convertResponse(
  anthropicRes: AnthropicResponse,
  model: string
): Record<string, unknown> {
  const text = anthropicRes.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");

  const finishReason =
    anthropicRes.stop_reason === "end_turn"
      ? "stop"
      : anthropicRes.stop_reason === "max_tokens"
      ? "length"
      : anthropicRes.stop_reason || "stop";

  return {
    id: `chatcmpl-${anthropicRes.id}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: finishReason,
      },
    ],
    usage: {
      prompt_tokens: anthropicRes.usage.input_tokens,
      completion_tokens: anthropicRes.usage.output_tokens,
      total_tokens:
        anthropicRes.usage.input_tokens + anthropicRes.usage.output_tokens,
    },
  };
}

export async function proxyToAnthropic(
  body: Record<string, unknown>,
  apiKey: string,
  signal?: AbortSignal
): Promise<{ status: number; body: Record<string, unknown> }> {
  const messages = body.messages as OpenAIMessage[];
  const { system, messages: convertedMessages } = convertMessages(messages);

  const anthropicBody: Record<string, unknown> = {
    model: body.model as string,
    messages: convertedMessages,
    max_tokens: (body.max_tokens as number) || 4096,
  };

  if (system) {
    anthropicBody.system = system;
  }
  if (body.temperature !== undefined) {
    anthropicBody.temperature = body.temperature;
  }
  if (body.top_p !== undefined) {
    anthropicBody.top_p = body.top_p;
  }
  if (body.stop !== undefined) {
    anthropicBody.stop_sequences = Array.isArray(body.stop)
      ? body.stop
      : [body.stop];
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(anthropicBody),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorBody: Record<string, unknown>;
    try {
      errorBody = JSON.parse(errorText);
    } catch {
      errorBody = { error: { message: errorText, type: "upstream_error" } };
    }
    return { status: response.status, body: errorBody };
  }

  const data = (await response.json()) as AnthropicResponse;
  return { status: 200, body: convertResponse(data, body.model as string) };
}
