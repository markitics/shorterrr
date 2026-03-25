import { NextRequest, NextResponse } from "next/server";

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
/*  Hemingway fix — AI-powered rewriting for specific issue categories  */
/* ------------------------------------------------------------------ */

const CATEGORY_INSTRUCTIONS: Record<string, string> = {
  "very-hard": "Break up very long, hard-to-read sentences (20+ words) into shorter, clearer ones. Keep the meaning identical.",
  "hard": "Simplify sentences that are somewhat hard to read (14-19 words) by making them more direct. Keep the meaning identical.",
  "very": "Remove every instance of the word 'very'. Either delete it or replace 'very [adjective]' with a single stronger adjective (e.g. 'very big' → 'huge').",
  "complex": "Replace complex/fancy words with simpler alternatives (e.g. 'utilize' → 'use', 'subsequently' → 'then', 'approximately' → 'about').",
  "passive": "Convert passive voice to active voice where possible (e.g. 'was done by me' → 'I did it').",
  "adverb": "Remove unnecessary adverbs (words ending in -ly like 'extremely', 'basically', 'actually'). Only remove them, don't replace with other filler.",
  "hedging": "Remove hedging and cagey language. Delete phrases like 'I think', 'I believe', 'I feel', 'probably', 'perhaps', 'maybe', 'just wanted to', 'kind of', 'sort of', 'if that makes sense', 'I'm not sure but', 'it seems', 'potentially', 'to be honest'. Replace with direct, confident statements. For example: 'I think we should do X' → 'We should do X'.",
};

async function handleHemingwayFix(message: string, fixCategories: string[]): Promise<NextResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI fixing is not available (missing API key)." },
      { status: 500 }
    );
  }

  const instructions = fixCategories
    .filter((c) => CATEGORY_INSTRUCTIONS[c])
    .map((c) => `- ${CATEGORY_INSTRUCTIONS[c]}`)
    .join("\n");

  if (!instructions) {
    return NextResponse.json({ fixed: message });
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
        max_tokens: 2048,
        system: `You are a precise text editor. Apply ONLY the requested fixes to the text below. Do NOT change anything else — preserve tone, meaning, structure, and formatting. Return ONLY the fixed text, no commentary or explanation.

Fixes to apply:
${instructions}`,
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error:", response.status, await response.text());
      return NextResponse.json(
        { error: "AI fix failed. Try again." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const fixed = data.content?.[0]?.text ?? message;
    return NextResponse.json({ fixed });
  } catch (error) {
    console.error("Error calling Anthropic API for hemingway fix:", error);
    return NextResponse.json(
      { error: "Could not reach AI. Please try again." },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const { message, mode = "joe", mppCredential, fixCategories } = await req.json();

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
      return NextResponse.json(
        { error: "Hemingway analysis runs client-side. No API call needed." },
        { status: 400 }
      );
    case "hemingway-fix":
      return handleHemingwayFix(message, fixCategories || []);
    default:
      return handleJoeMode(message);
  }
}
