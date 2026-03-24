"use client";

import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { parseChallenge, encodeCredential, formatAmount } from "@/lib/mpp";
import type { MppChallenge } from "@/lib/mpp";

type Mode = "shorter" | "joe" | "hemingway";

const MODE_CONFIG: Record<
  Mode,
  { label: string; description: string; buttonText: string; resultLabel: string }
> = {
  shorter: {
    label: "Shorterrr!",
    description: "Rewrites your message to be dramatically shorter",
    buttonText: "Make it shorter!",
    resultLabel: "Here's a shorter version you can send instead:",
  },
  joe: {
    label: "Tips from Joe",
    description: "Joe always has the same advice...",
    buttonText: "Ask Joe",
    resultLabel: "Joe says:",
  },
  hemingway: {
    label: "Tips from Hemingway",
    description: "Writing feedback inspired by Hemingway's principles",
    buttonText: "Get Hemingway's take",
    resultLabel: "Hemingway's feedback:",
  },
};

export default function Home() {
  const [draft, setDraft] = useState("");
  const [shortened, setShortened] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasShouted, setHasShouted] = useState(false);
  const [mode, setMode] = useState<Mode>("shorter");
  const [pendingChallenge, setPendingChallenge] = useState<MppChallenge | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("");

  const { login, ready, authenticated, user, logout } = usePrivy();
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");

  const config = MODE_CONFIG[mode];

  async function callApi(mppCredential?: string) {
    const res = await fetch("/api/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: draft, mode, mppCredential }),
    });

    const data = await res.json();

    // Handle 402 - payment required
    if (res.status === 402 && data.paymentRequired) {
      const challenge = parseChallenge(data.challenge);
      if (challenge) {
        setPendingChallenge(challenge);
        setPaymentStatus(
          `Payment required: ${formatAmount(challenge.request.amount, challenge.request.currency)} via ${challenge.method}`
        );
        return null;
      }
    }

    if (!res.ok) {
      throw new Error(data.error || "Something went wrong.");
    }

    return data;
  }

  async function handleShorten() {
    if (!draft.trim()) return;

    setLoading(true);
    setError("");
    setShortened("");
    setHasShouted(true);
    setPendingChallenge(null);
    setPaymentStatus("");

    try {
      const data = await callApi();
      if (data) {
        setShortened(data.shortened);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePayAndRetry() {
    if (!pendingChallenge || !embeddedWallet) return;

    setLoading(true);
    setPaymentStatus("Processing payment...");

    try {
      // Build the credential with the challenge info
      // For now, we create a credential structure that the server will forward
      // The actual payment method depends on what teenytiny.ai supports
      const credential = encodeCredential({
        challenge: pendingChallenge.raw,
        payload: {
          walletAddress: embeddedWallet.address,
          method: pendingChallenge.method,
        },
      });

      const data = await callApi(credential);
      if (data) {
        setShortened(data.shortened);
        setPendingChallenge(null);
        setPaymentStatus(data.receipt ? "Payment confirmed" : "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed.");
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
    setPendingChallenge(null);
    setPaymentStatus("");
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
          <div className="flex items-center gap-3">
            {ready && !authenticated && (
              <button
                onClick={login}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Sign in
              </button>
            )}
            {ready && authenticated && (
              <div className="flex items-center gap-2">
                {embeddedWallet && (
                  <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
                    {embeddedWallet.address.slice(0, 6)}...
                    {embeddedWallet.address.slice(-4)}
                  </span>
                )}
                <span className="text-xs text-zinc-500">
                  {user?.email?.address || "Connected"}
                </span>
                <button
                  onClick={logout}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="w-full max-w-3xl px-6 py-10 flex flex-col gap-8">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 self-start">
          {(Object.keys(MODE_CONFIG) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setShortened("");
                setError("");
                setHasShouted(false);
                setPendingChallenge(null);
                setPaymentStatus("");
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>

        <p className="text-xs text-zinc-400 -mt-4">{config.description}</p>

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
            placeholder='Paste your message here... e.g. "Hi Sarah, I just wanted to reach out and let you know that after careful consideration and extensive review of all the available options, I believe we should..."'
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
                {loading ? "Working..." : config.buttonText}
              </button>
            </div>
          </div>
        </section>

        {/* SHORTER! shout */}
        {hasShouted && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl font-black tracking-tighter text-red-500 select-none">
              {mode === "joe"
                ? "JOE SAYS:"
                : mode === "hemingway"
                ? "HEMINGWAY SAYS:"
                : "SHORTER!"}
            </div>
            {loading && (
              <p className="text-sm text-zinc-500 animate-pulse">
                {mode === "joe"
                  ? "Consulting Joe..."
                  : mode === "hemingway"
                  ? "Channeling Hemingway..."
                  : "Rewriting your message..."}
              </p>
            )}
          </div>
        )}

        {/* Payment required */}
        {pendingChallenge && (
          <section className="rounded-xl border border-violet-200 bg-violet-50 p-6">
            <h2 className="text-sm font-semibold text-violet-800 mb-2">
              Payment Required (MPP)
            </h2>
            <p className="text-sm text-violet-700 mb-1">{paymentStatus}</p>
            <p className="text-xs text-violet-500 mb-4">
              Method: {pendingChallenge.method} | Intent:{" "}
              {pendingChallenge.intent}
            </p>
            {!authenticated ? (
              <button
                onClick={login}
                className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 transition-colors"
              >
                Sign in to pay
              </button>
            ) : !embeddedWallet ? (
              <p className="text-sm text-violet-600">
                Setting up your wallet...
              </p>
            ) : (
              <button
                onClick={handlePayAndRetry}
                disabled={loading}
                className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-40 transition-colors"
              >
                {loading ? "Processing..." : "Pay & continue"}
              </button>
            )}
          </section>
        )}

        {/* Error */}
        {error && !pendingChallenge && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Result */}
        {shortened && (
          <section
            className={`rounded-xl border p-6 ${
              mode === "joe"
                ? "border-amber-200 bg-amber-50"
                : mode === "hemingway"
                ? "border-blue-200 bg-blue-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h2
                className={`text-sm font-semibold ${
                  mode === "joe"
                    ? "text-amber-800"
                    : mode === "hemingway"
                    ? "text-blue-800"
                    : "text-emerald-800"
                }`}
              >
                {config.resultLabel}
              </h2>
              {mode === "shorter" && (
                <span className="text-xs text-emerald-600">
                  {shortenedWordCount} word
                  {shortenedWordCount !== 1 ? "s" : ""} (
                  {wordCount > 0
                    ? Math.round(
                        ((wordCount - shortenedWordCount) / wordCount) * 100
                      )
                    : 0}
                  % shorter)
                </span>
              )}
            </div>
            <div
              className={`rounded-lg bg-white border px-4 py-3 text-base text-zinc-900 whitespace-pre-wrap ${
                mode === "joe"
                  ? "border-amber-100"
                  : mode === "hemingway"
                  ? "border-blue-100"
                  : "border-emerald-100"
              }`}
            >
              {shortened}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleCopy}
                className={`rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
                  mode === "joe"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : mode === "hemingway"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                Copy to clipboard
              </button>
              {mode === "shorter" && (
                <button
                  onClick={handleShorten}
                  disabled={loading}
                  className="rounded-lg border border-emerald-300 px-5 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  Even shorter!
                </button>
              )}
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
          {" "}&amp;{" "}
          <a
            href="https://mpp.dev"
            className="underline hover:text-zinc-600"
            target="_blank"
            rel="noopener noreferrer"
          >
            MPP
          </a>
        </div>
      </footer>
    </div>
  );
}
