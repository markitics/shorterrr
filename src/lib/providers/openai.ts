/**
 * OpenAI provider — proxies requests directly to the OpenAI API.
 * The request body is already in OpenAI format, so we pass it through.
 */

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export async function proxyToOpenAI(
  body: Record<string, unknown>,
  apiKey: string,
  signal?: AbortSignal
): Promise<Response> {
  return fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });
}
