import { NextRequest, NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Prompt builders                                                    */
/* ------------------------------------------------------------------ */

/**
 * Build prompt for teenytiny.ai's eliza model (shorter mode).
 * Eliza ignores system prompts so everything goes in the user message.
 */
function buildShorterPrompt(message: string): string {
  return `You are a writing assistant called "Shorterrr!" that rewrites messages to be dramatically shorter.

Your task: rewrite the message below to be at least 50% shorter while keeping all critical information (dates, numbers, action items). Remove filler words, unnecessary context, and over-explanation. Keep the tone professional but direct.

IMPORTANT: Reply with ONLY the shortened message. No explanations, no preamble, no "Here's a shorter version" — just the rewritten message itself.

Here is the message to shorten:

---
${message}
---

Shortened version:`;
}

/* ------------------------------------------------------------------ */
/*  Joe mode — Anthropic Claude API                                    */
/* ------------------------------------------------------------------ */

async function handleJoeMode(message: string): Promise<NextResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Joe is not available right now (missing API key). Ask your admin to set ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: `You are Joe, a no-nonsense manager who thinks every message is too long. Your job:
1. Tell the user their message is too long (be blunt, funny, and brief — one sentence).
2. Then provide a dramatically shorter version they can actually send.

Format your response EXACTLY like this:
JOE: [your one-liner reaction]

SHORTER VERSION:
[the rewritten shorter message]`,
        messages: [
          {
            role: "user",
            content: `Here's my draft message:\n\n${message}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Joe is having a bad day. Try again." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text ?? "You need to make that way shorter.";

    return NextResponse.json({ shortened: content });
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
    return NextResponse.json(
      { error: "Could not reach Joe. Please try again." },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Riddle mode — TeenyTiny AI racter model                            */
/* ------------------------------------------------------------------ */

function buildRiddlePrompt(message: string): string {
  return `Respond to this message with a riddle or surreal poem that captures its essence. Be cryptic, poetic, and strange. Here is the message:

---
${message}
---

Your riddle:`;
}

async function handleRiddleMode(message: string, mppCredential?: string): Promise<NextResponse> {
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
    const response = await fetch("https://teenytiny.ai/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "racter",
        messages: [{ role: "user", content: buildRiddlePrompt(message) }],
      }),
    });

    if (response.status === 402) {
      const wwwAuth = response.headers.get("WWW-Authenticate") || "";
      return NextResponse.json(
        { error: "Payment required", paymentRequired: true, challenge: wwwAuth },
        { status: 402 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("TeenyTiny API error (racter):", response.status, errorText);
      return NextResponse.json(
        { error: "The poet is silent today. Try again." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const shortened = data.choices?.[0]?.message?.content ?? "The riddle eludes even the riddler.";
    const receipt = response.headers.get("Payment-Receipt");

    return NextResponse.json({ shortened, receipt });
  } catch (error) {
    console.error("Error calling TeenyTiny API (racter):", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Shorter mode — TeenyTiny AI eliza model                            */
/* ------------------------------------------------------------------ */

async function handleShorterMode(message: string, mppCredential?: string): Promise<NextResponse> {
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
    const response = await fetch("https://teenytiny.ai/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "eliza",
        messages: [{ role: "user", content: buildShorterPrompt(message) }],
      }),
    });

    if (response.status === 402) {
      const wwwAuth = response.headers.get("WWW-Authenticate") || "";
      return NextResponse.json(
        { error: "Payment required", paymentRequired: true, challenge: wwwAuth },
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
    const shortened = data.choices?.[0]?.message?.content ?? "Could not process the message.";
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

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const { message, mode = "shorter", mppCredential } = await req.json();

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Please provide a message to shorten." },
      { status: 400 }
    );
  }

  switch (mode) {
    case "joe":
      return handleJoeMode(message);
    case "riddle":
      return handleRiddleMode(message, mppCredential);
    case "hemingway":
      // Will be replaced with client-side analysis in Milestone 3
      return handleShorterMode(message, mppCredential);
    default:
      return handleShorterMode(message, mppCredential);
  }
}
