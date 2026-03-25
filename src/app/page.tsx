"use client";

import { useState, useEffect, useRef } from "react";
import { usePrivy, useWallets, getEmbeddedConnectedWallet } from "@privy-io/react-auth";
import { parseChallenge, encodeCredential, formatAmount } from "@/lib/mpp";
import { analyze } from "@/lib/hemingway";
import type { MppChallenge } from "@/lib/mpp";
import type { HemingwayResult, SentenceAnalysis } from "@/lib/hemingway";

type Mode = "joe" | "riddle" | "hemingway";

const MODE_CONFIG: Record<
  Mode,
  { label: string; description: string; buttonText: string; resultLabel: string; color: string }
> = {
  joe: {
    label: "Joe Mode",
    description: "Joe says it's too long — and gives you a shorter version (powered by Claude)",
    buttonText: "Make it shorter!",
    resultLabel: "Joe says:",
    color: "amber",
  },
  riddle: {
    label: "Answer in Riddles",
    description: "A surreal poet interprets your message (powered by TeenyTiny AI's racter)",
    buttonText: "Get a riddle",
    resultLabel: "The poet speaks:",
    color: "purple",
  },
  hemingway: {
    label: "Hemingway",
    description: "Writing feedback using hard-coded readability rules — always free, no API",
    buttonText: "Analyze",
    resultLabel: "Hemingway's feedback:",
    color: "blue",
  },
};

/* ------------------------------------------------------------------ */
/*  Hemingway result display component                                 */
/* ------------------------------------------------------------------ */

function HemingwayDisplay({ result }: { result: HemingwayResult }) {
  const { grade, stats, sentences, summary } = result;

  const gradeLabel =
    grade <= 6 ? "Good" : grade <= 10 ? "OK" : grade <= 14 ? "Poor" : "Very Poor";
  const gradeColor =
    grade <= 6
      ? "text-emerald-600"
      : grade <= 10
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4">
        <div className="rounded-lg border border-blue-200 bg-white px-4 py-3 text-center min-w-[100px]">
          <div className={`text-2xl font-bold ${gradeColor}`}>Grade {grade}</div>
          <div className="text-xs text-zinc-500">{gradeLabel}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-center min-w-[80px]">
          <div className="text-2xl font-bold text-zinc-800">{stats.words}</div>
          <div className="text-xs text-zinc-500">Words</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-center min-w-[80px]">
          <div className="text-2xl font-bold text-zinc-800">{stats.sentences}</div>
          <div className="text-xs text-zinc-500">Sentences</div>
        </div>
      </div>

      {/* Issue summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {summary.veryHardSentences > 0 && (
          <div className="rounded-lg bg-red-100 border border-red-200 px-3 py-2 text-center">
            <div className="text-lg font-bold text-red-700">{summary.veryHardSentences}</div>
            <div className="text-xs text-red-600">very hard to read</div>
          </div>
        )}
        {summary.hardSentences > 0 && (
          <div className="rounded-lg bg-amber-100 border border-amber-200 px-3 py-2 text-center">
            <div className="text-lg font-bold text-amber-700">{summary.hardSentences}</div>
            <div className="text-xs text-amber-600">hard to read</div>
          </div>
        )}
        {summary.adverbs > 0 && (
          <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2 text-center">
            <div className="text-lg font-bold text-blue-700">{summary.adverbs}</div>
            <div className="text-xs text-blue-600">adverb{summary.adverbs !== 1 ? "s" : ""}</div>
          </div>
        )}
        {summary.passiveVoice > 0 && (
          <div className="rounded-lg bg-green-100 border border-green-200 px-3 py-2 text-center">
            <div className="text-lg font-bold text-green-700">{summary.passiveVoice}</div>
            <div className="text-xs text-green-600">passive voice</div>
          </div>
        )}
        {summary.complexWords > 0 && (
          <div className="rounded-lg bg-purple-100 border border-purple-200 px-3 py-2 text-center">
            <div className="text-lg font-bold text-purple-700">{summary.complexWords}</div>
            <div className="text-xs text-purple-600">simpler alternative{summary.complexWords !== 1 ? "s" : ""}</div>
          </div>
        )}
        {summary.veryHardSentences === 0 &&
          summary.hardSentences === 0 &&
          summary.adverbs === 0 &&
          summary.passiveVoice === 0 &&
          summary.complexWords === 0 && (
            <div className="col-span-full rounded-lg bg-emerald-100 border border-emerald-200 px-3 py-2 text-center">
              <div className="text-sm font-semibold text-emerald-700">Looking good! No major issues found.</div>
            </div>
          )}
      </div>

      {/* Highlighted text */}
      <div className="rounded-lg bg-white border border-blue-100 px-5 py-4 text-base leading-relaxed">
        {sentences.map((s: SentenceAnalysis, i: number) => (
          <SentenceSpan key={i} sentence={s} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-200" /> Very hard sentence
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-amber-200" /> Hard sentence
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-300" /> Adverb
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-green-300" /> Passive voice
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-purple-300" /> Simpler alternative
        </span>
      </div>
    </div>
  );
}

function SentenceSpan({ sentence }: { sentence: SentenceAnalysis }) {
  const bgClass =
    sentence.level === "very-hard"
      ? "bg-red-200"
      : sentence.level === "hard"
      ? "bg-amber-200"
      : "";

  // Build highlighted text with inline issue markers
  const words = sentence.text.split(/(\s+)/);
  const issueMap = new Map<string, SentenceAnalysis["issues"][0]>();
  for (const issue of sentence.issues) {
    issueMap.set(issue.word.toLowerCase(), issue);
  }

  return (
    <span className={`${bgClass} rounded-sm`}>
      {words.map((w, i) => {
        const clean = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
        const issue = issueMap.get(clean);
        if (issue) {
          const color =
            issue.type === "adverb"
              ? "bg-blue-200 underline decoration-blue-400"
              : issue.type === "passive"
              ? "bg-green-200 underline decoration-green-400"
              : "bg-purple-200 underline decoration-purple-400";
          return (
            <span
              key={i}
              className={`${color} rounded-sm cursor-help`}
              title={
                issue.type === "complex"
                  ? `Try "${issue.suggestion}" instead`
                  : issue.type === "adverb"
                  ? "Consider removing this adverb"
                  : "Consider using active voice"
              }
            >
              {w}
            </span>
          );
        }
        return <span key={i}>{w}</span>;
      })}
      {" "}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [draft, setDraft] = useState("");
  const [shortened, setShortened] = useState("");
  const [hemingwayResult, setHemingwayResult] = useState<HemingwayResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasShouted, setHasShouted] = useState(false);
  const [mode, setMode] = useState<Mode>("joe");
  const [pendingChallenge, setPendingChallenge] = useState<MppChallenge | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("");

  const { login, ready, authenticated, user, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const embeddedWallet = getEmbeddedConnectedWallet(wallets);

  const config = MODE_CONFIG[mode];
  const c = config.color;

  // Auto-analyze in Hemingway mode with 400ms debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (mode !== "hemingway") return;
    if (!draft.trim()) {
      setHemingwayResult(null);
      setHasShouted(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setHemingwayResult(analyze(draft));
      setHasShouted(true);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, mode]);

  async function callApi(mppCredential?: string) {
    const res = await fetch("/api/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: draft, mode, mppCredential }),
    });

    const data = await res.json();

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

    // Hemingway auto-analyzes via debounce, no manual trigger needed
    if (mode === "hemingway") return;

    setLoading(true);
    setError("");
    setShortened("");
    setHemingwayResult(null);
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
    setHemingwayResult(null);
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
                {embeddedWallet ? (
                  <span className="text-xs text-emerald-600 font-mono hidden sm:inline">
                    Wallet: {embeddedWallet.address.slice(0, 6)}...
                    {embeddedWallet.address.slice(-4)}
                  </span>
                ) : !walletsReady ? (
                  <span className="text-xs text-zinc-400 animate-pulse">
                    Loading...
                  </span>
                ) : null}
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
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 p-1 self-start">
          {(Object.keys(MODE_CONFIG) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setShortened("");
                setHemingwayResult(null);
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
              {(draft || shortened || hemingwayResult) && (
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Start over
                </button>
              )}
              {mode !== "hemingway" && (
                <button
                  onClick={handleShorten}
                  disabled={!draft.trim() || loading}
                  className="rounded-lg bg-red-500 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Working..." : config.buttonText}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* SHORTER! shout (not for hemingway — it auto-analyzes) */}
        {hasShouted && mode !== "hemingway" && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl font-black tracking-tighter text-red-500 select-none">
              {mode === "joe" ? "SHORTER!" : "THE POET SPEAKS:"}
            </div>
            {loading && (
              <p className="text-sm text-zinc-500 animate-pulse">
                {mode === "joe"
                  ? "Joe is rewriting your message..."
                  : "Composing riddles..."}
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
            ) : !walletsReady ? (
              <p className="text-sm text-violet-600 animate-pulse">
                Loading wallet...
              </p>
            ) : !embeddedWallet ? (
              <p className="text-sm text-violet-600">
                Wallet not found. Try signing out and back in.
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

        {/* Hemingway result (client-side analysis) */}
        {hemingwayResult && mode === "hemingway" && (
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-6">
            <HemingwayDisplay result={hemingwayResult} />
          </section>
        )}

        {/* Result for non-hemingway modes */}
        {shortened && mode !== "hemingway" && (
          <section
            className={`rounded-xl border p-6 ${
              ({
                emerald: "border-emerald-200 bg-emerald-50",
                amber: "border-amber-200 bg-amber-50",
                purple: "border-purple-200 bg-purple-50",
                blue: "border-blue-200 bg-blue-50",
              })[c]
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h2
                className={`text-sm font-semibold ${
                  ({
                    emerald: "text-emerald-800",
                    amber: "text-amber-800",
                    purple: "text-purple-800",
                    blue: "text-blue-800",
                  })[c]
                }`}
              >
                {config.resultLabel}
              </h2>
              {mode === "joe" && shortenedWordCount > 0 && (
                <span className="text-xs text-amber-600">
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
                ({
                  emerald: "border-emerald-100",
                  amber: "border-amber-100",
                  purple: "border-purple-100",
                  blue: "border-blue-100",
                })[c]
              }`}
            >
              {shortened}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleCopy}
                className={`rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
                  ({
                    emerald: "bg-emerald-600 hover:bg-emerald-700",
                    amber: "bg-amber-600 hover:bg-amber-700",
                    purple: "bg-purple-600 hover:bg-purple-700",
                    blue: "bg-blue-600 hover:bg-blue-700",
                  })[c]
                }`}
              >
                Copy to clipboard
              </button>
              {mode === "joe" && (
                <button
                  onClick={handleShorten}
                  disabled={loading}
                  className="rounded-lg border border-amber-300 px-5 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
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
                title: "Pick a mode",
                desc: "Joe Mode, Riddles, or Hemingway — each gives different feedback.",
              },
              {
                step: "3",
                title: "Get feedback",
                desc: "Copy the result and send a better message. You're welcome.",
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
          ,{" "}
          <a
            href="https://anthropic.com"
            className="underline hover:text-zinc-600"
            target="_blank"
            rel="noopener noreferrer"
          >
            Anthropic
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
