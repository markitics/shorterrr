import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Please provide a message to shorten." },
      { status: 400 }
    );
  }

  const apiKey = process.env.TEENYTINY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing API key." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      "https://teenytiny.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "eliza",
          messages: [
            {
              role: "system",
              content: `You are "Shorterrr!", a writing assistant that helps people write shorter messages to their manager.
Your job: take the user's draft message and rewrite it to be dramatically shorter while keeping the key information.
Rules:
- Cut the word count by at least 50%
- Keep the tone professional but direct
- Preserve all critical information (dates, numbers, action items)
- Remove filler words, unnecessary context, and over-explanation
- Return ONLY the shortened message, nothing else`,
            },
            {
              role: "user",
              content: `Make this message shorter:\n\n${message}`,
            },
          ],
        }),
      }
    );

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
      data.choices?.[0]?.message?.content ?? "Could not shorten the message.";

    return NextResponse.json({ shortened });
  } catch (error) {
    console.error("Error calling TeenyTiny API:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
