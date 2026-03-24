import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPTS: Record<string, string> = {
  shorter: `You are "Shorterrr!", a writing assistant that helps people write shorter messages to their manager.
Your job: take the user's draft message and rewrite it to be dramatically shorter while keeping the key information.
Rules:
- Cut the word count by at least 50%
- Keep the tone professional but direct
- Preserve all critical information (dates, numbers, action items)
- Remove filler words, unnecessary context, and over-explanation
- Return ONLY the shortened message, nothing else`,

  joe: `You are "Joe", a gruff but lovable writing coach. No matter what the user writes, you ALWAYS say the same thing. Your response must ALWAYS be exactly:

"You need to make that way shorter."

That's it. Never say anything else. Never vary the response. Always those exact words.`,

  hemingway: `You are a writing coach inspired by Hemingway's principles. Analyze the user's message and give brief, actionable feedback. Check for:
- Sentences that are too long (flag any over 20 words)
- Passive voice (suggest active alternatives)
- Adverbs that weaken the writing (suggest removing them)
- Unnecessarily complex words (suggest simpler ones)
- Filler phrases that add no meaning

Format your response as:
1. A short overall assessment (one sentence)
2. Specific issues found, each as a bullet point with the problem and fix
3. A rewritten version applying all fixes

Be direct and concise, like Hemingway himself.`,
};

export async function POST(req: NextRequest) {
  const { message, mode = "shorter" } = await req.json();

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Please provide a message to shorten." },
      { status: 400 }
    );
  }

  // Joe mode doesn't need an API call - it always says the same thing
  if (mode === "joe") {
    return NextResponse.json({
      shortened: "You need to make that way shorter.",
    });
  }

  const apiKey = process.env.TEENYTINY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing API key." },
      { status: 500 }
    );
  }

  const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.shorter;
  const userPrompt =
    mode === "hemingway"
      ? `Review this message:\n\n${message}`
      : `Make this message shorter:\n\n${message}`;

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
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
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
      data.choices?.[0]?.message?.content ?? "Could not process the message.";

    return NextResponse.json({ shortened });
  } catch (error) {
    console.error("Error calling TeenyTiny API:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
