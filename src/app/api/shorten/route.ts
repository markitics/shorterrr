import { NextRequest, NextResponse } from "next/server";

const TEENYTINY_URL = "https://teenytiny.ai/v1/chat/completions";

export async function POST(req: NextRequest) {
  const { message, mode } = await req.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.TEENYTINY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  const systemPrompt = buildSystemPrompt(mode);

  try {
    const response = await fetch(TEENYTINY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "eliza",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "LLM request failed", details: data },
        { status: response.status }
      );
    }

    const reply =
      data.choices?.[0]?.message?.content ?? "Could not generate a response.";

    return NextResponse.json({
      shout: "SHORTER!",
      suggestion: reply,
      usage: data.usage,
    });
  } catch (error) {
    console.error("TeenyTiny API error:", error);
    return NextResponse.json(
      { error: "Failed to reach LLM provider" },
      { status: 502 }
    );
  }
}

function buildSystemPrompt(mode?: string): string {
  const base = `You are "Shorterrr!", a writing assistant that helps people write concise messages to their manager.
Your job: take the user's draft message and rewrite it to be MUCH shorter while keeping the core meaning.
Always be direct and professional. Cut filler words, unnecessary context, and over-explaining.
Return ONLY the shortened message, nothing else.`;

  if (mode === "hemingway") {
    return `${base}

Additionally, apply these Hemingway-style writing principles:
- Use short sentences. If a sentence has more than 14 words, break it up.
- Avoid passive voice. Use active voice instead.
- Replace adverbs with stronger verbs.
- Use simple words. Replace complex words with simpler alternatives.
- Cut qualifiers (very, really, quite, rather, somewhat).
After the shortened message, add a blank line and then brief feedback on what you fixed (passive voice, long sentences, etc).`;
  }

  if (mode === "joe") {
    return `You are Joe. No matter what the user writes, you always respond with exactly this:
"You need to make that way shorter."
Nothing else. Just that one line. Every time.`;
  }

  return base;
}