import { NextRequest, NextResponse } from "next/server";

/**
 * Build the full prompt for teenytiny.ai's eliza model.
 *
 * The eliza model ignores system prompts, so we embed all instructions
 * directly in the user message as a single combined prompt.
 */
function buildPrompt(message: string, mode: string): string {
  if (mode === "hemingway") {
    return `You are a writing coach inspired by Hemingway's principles. Your task is to analyze the message below and give brief, actionable feedback.

Check for these issues:
- Sentences that are too long (flag any sentence over 20 words)
- Passive voice (suggest active voice alternatives)
- Adverbs that weaken the writing (suggest removing them)
- Unnecessarily complex words (suggest simpler alternatives)
- Filler phrases that add no meaning

Format your response EXACTLY like this:
1. A one-sentence overall assessment
2. Bullet points listing each specific issue with the problem and suggested fix
3. A rewritten version of the message with all fixes applied

Be direct and concise. Here is the message to review:

---
${message}
---

Now provide your Hemingway-style writing feedback:`;
  }

  // Default "shorter" mode
  return `You are a writing assistant called "Shorterrr!" that rewrites messages to be dramatically shorter.

Your task: rewrite the message below to be at least 50% shorter while keeping all critical information (dates, numbers, action items). Remove filler words, unnecessary context, and over-explanation. Keep the tone professional but direct.

IMPORTANT: Reply with ONLY the shortened message. No explanations, no preamble, no "Here's a shorter version" — just the rewritten message itself.

Here is the message to shorten:

---
${message}
---

Shortened version:`;
}

export async function POST(req: NextRequest) {
  const { message, mode = "shorter", mppCredential } = await req.json();

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Please provide a message to shorten." },
      { status: 400 }
    );
  }

  // Joe mode doesn't need an API call — it ALWAYS says the same thing
  if (mode === "joe") {
    return NextResponse.json({
      shortened: "You need to make that way shorter.",
    });
  }

  const prompt = buildPrompt(message, mode);

  // Build headers — either API key auth or MPP credential
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (mppCredential) {
    headers["Authorization"] = mppCredential;
  } else {
    const apiKey = process.env.TEENYTINY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing API key." },
        { status: 500 }
      );
    }
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(
      "https://teenytiny.ai/v1/chat/completions",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "eliza",
          messages: [
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    // If we get a 402, pass the challenge back to the client
    if (response.status === 402) {
      const wwwAuth = response.headers.get("WWW-Authenticate") || "";
      return NextResponse.json(
        {
          error: "Payment required",
          paymentRequired: true,
          challenge: wwwAuth,
        },
        { status: 402 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("TeenyTiny API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to get a response from the AI." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const shortened =
      data.choices?.[0]?.message?.content ?? "Could not process the message.";

    const receipt = response.headers.get("Payment-Receipt");

    return NextResponse.json({ shortened, receipt });
  } catch (error) {
    console.error("Error calling TeenyTiny API:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
