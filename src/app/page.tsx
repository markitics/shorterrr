"use client";

import { useState } from "react";

export default function Home() {
  const [draft, setDraft] = useState("");
  const [shortened, setShortened] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasShouted, setHasShouted] = useState(false);

  async function handleShorten() {
    if (!draft.trim()) return;

    setLoading(true);
    setError("");
    setShortened("");
    setHasShouted(true);

    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draft }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setShortened(data.shortened);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shortened);
  }

  function handleReset() {
    setDraft("");
    setShortened("");
    setError("");
    setHasShouted(false);
  }

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const shortenedWordCount = shortened.trim()
    ? shortened.trim().split(/\s+/).length
    : 0;

  return (
    <div className="flex flex-col flex-1 items-center justify-start bg-[var(--background)]">
      {/* Header */}
      <header className="w-full border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            Shorterrr<span className="text-red-500">!</span>
          </h1>
          <p className="text-sm text-zinc-500">
            Messages to your manager, made shorter.
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="w-full max-w-3xl px-6 py-10 flex flex-col gap-8">
        {/* Input section */}
        <section>
          <label
            htmlFor="draft"
            className="block text-sm font-medium text-zinc-700 mb-2"
          >
            Your draft message to your manager
          </label>
          <textarea
            id="draft"
            rows={8}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 resize-y"
            placeholder="Paste your message here... e.g. &quot;Hi Sarah, I just wanted to reach out and let you know that after careful consideration and extensive review of all the available options, I believe we should...&quot;"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={loading}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {wordCount} word{wordCount !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-3">
              {(draft || shortened) && (
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Start over
                </button>
              )}
              <button
                onClick={handleShorten}
                disabled={!draft.trim() || loading}
                className="rounded-lg bg-red-500 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Shortening..." : "Make it shorter!"}
              </button>
            </div>
          </div>
        </section>

        {/* SHORTER! shout */}
        {hasShouted && (
          <div className="flex flex-col items-center gap-2 animate-bounce-once">
            <div className="text-6xl font-black tracking-tighter text-red-500 select-none">
              SHORTER!
            </div>
            {loading && (
              <p className="text-sm text-zinc-500 animate-pulse">
                Rewriting your message...
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Result */}
        {shortened && (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-emerald-800">
                Here&apos;s a shorter version you can send instead:
              </h2>
              <span className="text-xs text-emerald-600">
                {shortenedWordCount} word{shortenedWordCount !== 1 ? "s" : ""}{" "}
                ({wordCount > 0
                  ? Math.round(
                      ((wordCount - shortenedWordCount) / wordCount) * 100
                    )
                  : 0}
                % shorter)
              </span>
            </div>
            <div className="rounded-lg bg-white border border-emerald-100 px-4 py-3 text-base text-zinc-900 whitespace-pre-wrap">
              {shortened}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleCopy}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                Copy to clipboard
              </button>
              <button
                onClick={handleShorten}
                disabled={loading}
                className="rounded-lg border border-emerald-300 px-5 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                Even shorter!
              </button>
            </div>
          </section>
        )}

        {/* How it works - only show when no result yet */}
        {!hasShouted && (
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {[
              {
                step: "1",
                title: "Paste your draft",
                desc: "Write or paste the message you want to send your manager.",
              },
              {
                step: "2",
                title: "We shout SHORTER!",
                desc: "Because it's always too long. Always.",
              },
              {
                step: "3",
                title: "Get a tighter version",
                desc: "Copy the shorter message and send it. You're welcome.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-zinc-200 bg-white p-5 text-center"
              >
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-500">
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto w-full border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 text-center text-xs text-zinc-400">
          Shorterrr! &mdash; Powered by{" "}
          <a
            href="https://teenytiny.ai"
            className="underline hover:text-zinc-600"
            target="_blank"
            rel="noopener noreferrer"
          >
            teenytiny.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
