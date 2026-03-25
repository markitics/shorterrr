"use client";

import { useState } from "react";

export default function Home() {
  const [copied, setCopied] = useState<string | null>(null);

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-[var(--background)]">
      {/* Header */}
      <header className="w-full border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            payg<span className="text-emerald-500">llm</span>
          </h1>
          <a
            href="#quickstart"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
          >
            Get started
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="w-full max-w-4xl px-6 py-16 text-center">
        <h2 className="text-5xl font-black tracking-tight text-zinc-900 mb-4">
          One API endpoint.<br />
          <span className="text-emerald-500">Every LLM.</span>
        </h2>
        <p className="text-lg text-zinc-500 max-w-2xl mx-auto mb-8">
          Drop-in replacement for the OpenAI API. Use GPT, Claude, and more —
          no provider API keys needed. Just point your app at paygllm.com and ship.
        </p>
        <div className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-emerald-400 font-mono text-sm px-5 py-3">
          <span className="text-zinc-500">base_url =</span>{" "}
          &quot;https://paygllm.com/api/v1&quot;
        </div>
      </section>

      {/* How it works */}
      <section className="w-full max-w-4xl px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              step: "1",
              title: "Get an API key",
              desc: "Sign up and grab your paygllm API key. One key, all models.",
            },
            {
              step: "2",
              title: "Swap the base URL",
              desc: "Point your OpenAI SDK at paygllm.com/api/v1. That's it. Same format, same params.",
            },
            {
              step: "3",
              title: "Use any model",
              desc: "GPT-4o, Claude Sonnet, Claude Opus — pick a model and go. We handle the rest.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-zinc-200 bg-white p-6"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
                {item.step}
              </div>
              <h3 className="text-base font-semibold text-zinc-900 mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-zinc-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Code examples */}
      <section id="quickstart" className="w-full max-w-4xl px-6 pb-16">
        <h3 className="text-2xl font-bold text-zinc-900 mb-6">Quickstart</h3>

        {/* Python */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-700">Python (OpenAI SDK)</span>
            <button
              onClick={() =>
                copyToClipboard(
                  `from openai import OpenAI

client = OpenAI(
    base_url="https://paygllm.com/api/v1",
    api_key="your-paygllm-key",
)

response = client.chat.completions.create(
    model="claude-sonnet-4-20250514",  # or "gpt-4o", etc.
    messages=[{"role": "user", "content": "Hello!"}],
)

print(response.choices[0].message.content)`,
                  "python"
                )
              }
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {copied === "python" ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="rounded-xl bg-zinc-900 text-zinc-100 text-sm p-5 overflow-x-auto">
            <code>{`from openai import OpenAI

client = OpenAI(
    base_url="https://paygllm.com/api/v1",
    api_key="your-paygllm-key",
)

response = client.chat.completions.create(
    model="claude-sonnet-4-20250514",  # or "gpt-4o", etc.
    messages=[{"role": "user", "content": "Hello!"}],
)

print(response.choices[0].message.content)`}</code>
          </pre>
        </div>

        {/* JavaScript / TypeScript */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-700">JavaScript / TypeScript</span>
            <button
              onClick={() =>
                copyToClipboard(
                  `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://paygllm.com/api/v1",
  apiKey: "your-paygllm-key",
});

const response = await client.chat.completions.create({
  model: "claude-sonnet-4-20250514", // or "gpt-4o", etc.
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(response.choices[0].message.content);`,
                  "js"
                )
              }
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {copied === "js" ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="rounded-xl bg-zinc-900 text-zinc-100 text-sm p-5 overflow-x-auto">
            <code>{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://paygllm.com/api/v1",
  apiKey: "your-paygllm-key",
});

const response = await client.chat.completions.create({
  model: "claude-sonnet-4-20250514", // or "gpt-4o", etc.
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(response.choices[0].message.content);`}</code>
          </pre>
        </div>

        {/* cURL */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-700">cURL</span>
            <button
              onClick={() =>
                copyToClipboard(
                  `curl https://paygllm.com/api/v1/chat/completions \\
  -H "Authorization: Bearer your-paygllm-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-4-20250514",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
                  "curl"
                )
              }
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {copied === "curl" ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="rounded-xl bg-zinc-900 text-zinc-100 text-sm p-5 overflow-x-auto">
            <code>{`curl https://paygllm.com/api/v1/chat/completions \\
  -H "Authorization: Bearer your-paygllm-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-4-20250514",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</code>
          </pre>
        </div>
      </section>

      {/* Supported models */}
      <section className="w-full max-w-4xl px-6 pb-16">
        <h3 className="text-2xl font-bold text-zinc-900 mb-6">
          Supported models
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h4 className="text-sm font-semibold text-zinc-900 mb-3">OpenAI</h4>
            <ul className="space-y-1.5 text-sm text-zinc-600 font-mono">
              <li>gpt-4o</li>
              <li>gpt-4o-mini</li>
              <li>gpt-4.1</li>
              <li>gpt-4.1-mini</li>
              <li>gpt-4.1-nano</li>
              <li>o3-mini</li>
            </ul>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h4 className="text-sm font-semibold text-zinc-900 mb-3">Anthropic</h4>
            <ul className="space-y-1.5 text-sm text-zinc-600 font-mono">
              <li>claude-opus-4-20250514</li>
              <li>claude-sonnet-4-20250514</li>
              <li>claude-haiku-4-20250414</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Why paygllm */}
      <section className="w-full max-w-4xl px-6 pb-16">
        <h3 className="text-2xl font-bold text-zinc-900 mb-6">Why paygllm?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: "No provider accounts needed",
              desc: "Skip the OpenAI waitlist and Anthropic signup. Get one key and access everything.",
            },
            {
              title: "OpenAI-compatible format",
              desc: "Works with any OpenAI SDK or library. Just change the base URL.",
            },
            {
              title: "Switch models in one line",
              desc: "Go from GPT-4o to Claude Sonnet by changing the model string. No code changes.",
            },
            {
              title: "Pay as you go",
              desc: "No monthly commitments. Pay only for what you use, per token.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-zinc-200 bg-white p-5"
            >
              <h4 className="text-sm font-semibold text-zinc-900 mb-1">
                {item.title}
              </h4>
              <p className="text-sm text-zinc-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto w-full border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4 text-center text-xs text-zinc-400">
          paygllm &mdash; LLM API proxy. Ship AI features without managing API keys.
        </div>
      </footer>
    </div>
  );
}
