"use client";

import { useState, useEffect, useRef } from "react";
import { usePrivy, useWallets, getEmbeddedConnectedWallet } from "@privy-io/react-auth";
import { parseChallenge, encodeCredential, formatAmount } from "@/lib/mpp";
import { analyze } from "@/lib/hemingway";
import type { MppChallenge } from "@/lib/mpp";
import type { HemingwayResult, SentenceAnalysis } from "@/lib/hemingway";

type Mode = "joe" | "riddle" | "hemingway";

const DEFAULT_DRAFT = `Hi Sarah, I just wanted to take a moment to reach out to you and let you know that after very careful consideration and an extremely extensive review of all of the various available options that were presented to us during last week's meeting, I have ultimately come to the conclusion that I believe we should probably seriously consider the possibility of potentially moving forward with the implementation of the new project management software system that was originally suggested by the IT department, assuming of course that the budget allows for it and that we can get the necessary approvals from all of the relevant stakeholders who would need to be involved in the decision-making process.`;

const EXAMPLE_MESSAGES = [
  `Dear Manager, I am writing this email to respectfully and humbly request that you would be so kind as to potentially consider the possibility of allowing me to perhaps take some time off from work on Friday afternoon, if it is not too terribly inconvenient for the team and if the workload situation allows for it, because I have a dentist appointment that was originally scheduled for next month but was then subsequently moved forward due to a cancellation that unexpectedly became available, and I was told by the receptionist that this particular time slot would not be available again for quite a long time. It is believed by me that my tasks can be completed before I leave.`,
  `Hi team, I wanted to very quickly circle back and touch base regarding the extremely important matter that was previously discussed at great length during our last all-hands meeting, specifically pertaining to the ongoing situation with the office kitchen refrigerator, which has been repeatedly and consistently observed to be in a state of uncleanliness by multiple members of the staff on numerous separate occasions over the course of the past several weeks. I am fundamentally of the opinion that it is absolutely essential and critically important that we establish and implement a comprehensive and thoroughly detailed rotating schedule for the regular and consistent cleaning and maintenance of the aforementioned refrigerator going forward. The situation has been allowed to deteriorate for entirely too long and it is now generally felt by everyone that something needs to be urgently done about it.`,
  `Hello everyone, I wanted to proactively communicate to all relevant parties that, upon careful reflection and thorough deliberation about the various aspects and considerations that are involved, I have arrived at the determination that the quarterly budget report that was expected to be finalized and submitted by the end of this current business week will unfortunately and regrettably need to be delayed by a period of approximately two to three additional business days, owing to the fact that several of the data sources that are critically needed for the completion of the analysis have not yet been made available to our department by the finance team, despite the fact that multiple reminder emails were already sent to them on previous occasions. I apologize profusely for any inconvenience this may cause.`,
  `Dear colleagues, I am reaching out today to bring to your collective attention an issue that has been gradually and progressively becoming more and more problematic over the recent weeks and months. Specifically, I am referring to the fact that the conference room booking system, which was recently updated and modernized as part of the company-wide digital transformation initiative, appears to be experiencing a number of persistent and recurring technical difficulties that have been negatively impacting our team's ability to effectively and efficiently schedule and coordinate our various meetings and collaborative working sessions. It would be greatly appreciated if someone from the technical support department could kindly investigate this matter at their earliest possible convenience. I believe that the root cause is probably related to the server migration that was hastily performed last month.`,
];


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
      ? "text-emerald-400"
      : grade <= 10
      ? "text-amber-400"
      : "text-red-400";

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4">
        <div className="rounded-lg border border-sky-700 bg-slate-800 px-4 py-3 text-center min-w-[100px]">
          <div className={`text-2xl font-bold ${gradeColor}`}>Grade {grade}</div>
          <div className="text-xs text-slate-400">{gradeLabel}</div>
        </div>
        <div className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-center min-w-[80px]">
          <div className="text-2xl font-bold text-slate-200">{stats.words}</div>
          <div className="text-xs text-slate-400">Words</div>
        </div>
        <div className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-center min-w-[80px]">
          <div className="text-2xl font-bold text-slate-200">{stats.sentences}</div>
          <div className="text-xs text-slate-400">Sentences</div>
        </div>
      </div>

      {/* Issue summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {summary.veryHardSentences > 0 && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-center">
            <div className="text-lg font-bold text-red-400">{summary.veryHardSentences}</div>
            <div className="text-xs text-red-300">very hard to read</div>
          </div>
        )}
        {summary.hardSentences > 0 && (
          <div className="rounded-lg bg-amber-950 border border-amber-800 px-3 py-2 text-center">
            <div className="text-lg font-bold text-amber-400">{summary.hardSentences}</div>
            <div className="text-xs text-amber-300">hard to read</div>
          </div>
        )}
        {summary.adverbs > 0 && (
          <div className="rounded-lg bg-sky-950 border border-sky-800 px-3 py-2 text-center">
            <div className="text-lg font-bold text-sky-400">{summary.adverbs}</div>
            <div className="text-xs text-sky-300">adverb{summary.adverbs !== 1 ? "s" : ""}</div>
          </div>
        )}
        {summary.passiveVoice > 0 && (
          <div className="rounded-lg bg-green-950 border border-green-800 px-3 py-2 text-center">
            <div className="text-lg font-bold text-green-400">{summary.passiveVoice}</div>
            <div className="text-xs text-green-300">passive voice</div>
          </div>
        )}
        {summary.complexWords > 0 && (
          <div className="rounded-lg bg-purple-950 border border-purple-800 px-3 py-2 text-center">
            <div className="text-lg font-bold text-purple-400">{summary.complexWords}</div>
            <div className="text-xs text-purple-300">simpler alternative{summary.complexWords !== 1 ? "s" : ""}</div>
          </div>
        )}
        {summary.veryHardSentences === 0 &&
          summary.hardSentences === 0 &&
          summary.adverbs === 0 &&
          summary.passiveVoice === 0 &&
          summary.complexWords === 0 && (
            <div className="col-span-full rounded-lg bg-emerald-950 border border-emerald-800 px-3 py-2 text-center">
              <div className="text-sm font-semibold text-emerald-400">Looking good! No major issues found.</div>
            </div>
          )}
      </div>

      {/* Highlighted text */}
      <div className="rounded-lg bg-slate-800 border border-slate-600 px-5 py-4 text-base leading-relaxed text-slate-200">
        {sentences.map((s: SentenceAnalysis, i: number) => (
          <SentenceSpan key={i} sentence={s} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-800" /> Very hard sentence
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-amber-800" /> Hard sentence
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-sky-600" /> Adverb
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-green-600" /> Passive voice
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-purple-600" /> Simpler alternative
        </span>
      </div>
    </div>
  );
}

function SentenceSpan({ sentence }: { sentence: SentenceAnalysis }) {
  const bgClass =
    sentence.level === "very-hard"
      ? "bg-red-900/50"
      : sentence.level === "hard"
      ? "bg-amber-900/50"
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
              ? "bg-sky-800 underline decoration-sky-400"
              : issue.type === "passive"
              ? "bg-green-800 underline decoration-green-400"
              : "bg-purple-800 underline decoration-purple-400";
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
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [shortened, setShortened] = useState("");
  const [joeReaction, setJoeReaction] = useState("");
  const [hemingwayResult, setHemingwayResult] = useState<HemingwayResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasShouted, setHasShouted] = useState(false);
  const [mode, setMode] = useState<Mode>("joe");
  const [pendingChallenge, setPendingChallenge] = useState<MppChallenge | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<{ draft: string; shortened: string; joeReaction: string; hemingwayResult: HemingwayResult | null; hasShouted: boolean } | null>(null);

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
        setJoeResult(data);
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
        setJoeResult(data);
        setPendingChallenge(null);
        setPaymentStatus(data.receipt ? "Payment confirmed" : "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setLoading(false);
    }
  }

  function parseJoeResponse(text: string): { reaction: string; shorter: string } {
    const joeMatch = text.match(/^JOE:\s*(.+?)(?:\n|$)/i);
    const shorterMatch = text.match(/SHORTER VERSION:\s*\n?([\s\S]*)/i);
    return {
      reaction: joeMatch?.[1]?.trim() || "",
      shorter: shorterMatch?.[1]?.trim() || text,
    };
  }

  function setJoeResult(data: { shortened: string }) {
    if (mode === "joe") {
      const parsed = parseJoeResponse(data.shortened);
      setJoeReaction(parsed.reaction);
      setShortened(parsed.shorter);
    } else {
      setShortened(data.shortened);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shortened);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setUndoSnapshot({ draft, shortened, joeReaction, hemingwayResult, hasShouted });
    setDraft("");
    setShortened("");
    setJoeReaction("");
    setHemingwayResult(null);
    setError("");
    setHasShouted(false);
    setPendingChallenge(null);
    setPaymentStatus("");
  }

  function handleUndo() {
    if (!undoSnapshot) return;
    setDraft(undoSnapshot.draft);
    setShortened(undoSnapshot.shortened);
    setJoeReaction(undoSnapshot.joeReaction);
    setHemingwayResult(undoSnapshot.hemingwayResult);
    setHasShouted(undoSnapshot.hasShouted);
    setUndoSnapshot(null);
  }

  // Cmd+Z to undo clear
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && undoSnapshot && !draft) {
        e.preventDefault();
        handleUndo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const shortenedWordCount = shortened.trim()
    ? shortened.trim().split(/\s+/).length
    : 0;

  return (
    <div className="flex flex-col flex-1 items-center justify-start bg-[var(--background)]">
      {/* Header */}
      <header className="w-full border-b border-slate-700 bg-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Shorterrr<span className="text-teal-400">!</span>
          </h1>
          <div className="flex items-center gap-3">
            {ready && !authenticated && (
              <button
                onClick={login}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Sign in
              </button>
            )}
            {ready && authenticated && (
              <div className="flex items-center gap-2">
                {embeddedWallet ? (
                  <span className="text-xs text-teal-400 font-mono hidden sm:inline">
                    Wallet: {embeddedWallet.address.slice(0, 6)}...
                    {embeddedWallet.address.slice(-4)}
                  </span>
                ) : !walletsReady ? (
                  <span className="text-xs text-slate-500 animate-pulse">
                    Loading...
                  </span>
                ) : null}
                <span className="text-xs text-slate-400">
                  {user?.email?.address || "Connected"}
                </span>
                <button
                  onClick={logout}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 transition-colors"
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
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-800 p-1 self-start">
          {(Object.keys(MODE_CONFIG) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setShortened("");
                setJoeReaction("");
                setHemingwayResult(null);
                setError("");
                setHasShouted(false);
                setPendingChallenge(null);
                setPaymentStatus("");
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-slate-700 text-slate-100 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500 -mt-4">{config.description}</p>

        {/* Input section */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="draft"
              className="text-sm font-medium text-slate-300"
            >
              Your draft message to your manager
            </label>
            <button
              onClick={() => {
                const msg = EXAMPLE_MESSAGES[Math.floor(Math.random() * EXAMPLE_MESSAGES.length)];
                setDraft(msg);
                setShortened("");
                setHemingwayResult(null);
                setError("");
                setHasShouted(false);
              }}
              className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
            >
              Generate example message
            </button>
          </div>
          <textarea
            id="draft"
            rows={8}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-base text-slate-100 placeholder-slate-500 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25 resize-y"
            placeholder='Paste your message here... e.g. "Hi Sarah, I just wanted to reach out and let you know that after careful consideration and extensive review of all the available options, I believe we should..."'
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                if (mode === "hemingway") {
                  if (draft.trim()) {
                    setHemingwayResult(analyze(draft));
                    setHasShouted(true);
                  }
                } else {
                  handleShorten();
                }
              }
            }}
            disabled={loading}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {wordCount} word{wordCount !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-3">
              {(draft || shortened || hemingwayResult) && (
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Start over: clear input
                </button>
              )}
              {mode !== "hemingway" && (
                <button
                  onClick={handleShorten}
                  disabled={!draft.trim() || loading}
                  className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Working..." : config.buttonText}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* SHORTER! shout — Joe mode gets speech bubble with avatar */}
        {hasShouted && mode === "joe" && (
          <div className="flex flex-col items-center gap-4">
            {/* Speech bubble with SHORTER! */}
            <div className="relative">
              <div className="bg-teal-500 rounded-2xl px-8 py-4">
                <div className="text-5xl sm:text-6xl font-black tracking-tighter text-slate-900 select-none">
                  SHORTER!
                </div>
              </div>
              {/* Triangle tail pointing down */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-3 w-0 h-0 border-l-[14px] border-r-[14px] border-t-[14px] border-l-transparent border-r-transparent border-t-teal-500" />
            </div>
            {/* Joe avatar */}
            <img
              src="/joe.svg"
              alt="Joe"
              className="w-16 h-16 rounded-full border-2 border-slate-600 object-cover"
            />
            {loading && (
              <p className="text-sm text-slate-400 animate-pulse">
                Joe is rewriting your message...
              </p>
            )}
          </div>
        )}

        {/* Non-joe shout */}
        {hasShouted && mode === "riddle" && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl font-black tracking-tighter text-teal-400 select-none">
              THE POET SPEAKS:
            </div>
            {loading && (
              <p className="text-sm text-slate-400 animate-pulse">
                Composing riddles...
              </p>
            )}
          </div>
        )}

        {/* Payment required */}
        {pendingChallenge && (
          <section className="rounded-xl border border-violet-700 bg-violet-950 p-6">
            <h2 className="text-sm font-semibold text-violet-300 mb-2">
              Payment Required (MPP)
            </h2>
            <p className="text-sm text-violet-400 mb-1">{paymentStatus}</p>
            <p className="text-xs text-violet-500 mb-4">
              Method: {pendingChallenge.method} | Intent:{" "}
              {pendingChallenge.intent}
            </p>
            {!authenticated ? (
              <button
                onClick={login}
                className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 transition-colors"
              >
                Sign in to pay
              </button>
            ) : !walletsReady ? (
              <p className="text-sm text-violet-400 animate-pulse">
                Loading wallet...
              </p>
            ) : !embeddedWallet ? (
              <p className="text-sm text-violet-400">
                Wallet not found. Try signing out and back in.
              </p>
            ) : (
              <button
                onClick={handlePayAndRetry}
                disabled={loading}
                className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 disabled:opacity-40 transition-colors"
              >
                {loading ? "Processing..." : "Pay & continue"}
              </button>
            )}
          </section>
        )}

        {/* Error */}
        {error && !pendingChallenge && (
          <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Hemingway result (client-side analysis) */}
        {hemingwayResult && mode === "hemingway" && (
          <section className="rounded-xl border border-sky-800 bg-slate-900 p-6">
            <HemingwayDisplay result={hemingwayResult} />
          </section>
        )}

        {/* Joe mode result — separated reaction + shorter version */}
        {shortened && mode === "joe" && (
          <section className="rounded-xl border border-amber-800 bg-amber-950 p-6 space-y-4">
            {/* Joe's pithy reaction */}
            {joeReaction && (
              <div className="flex items-start gap-3">
                <img src="/joe.svg" alt="Joe" className="w-8 h-8 rounded-full border border-amber-700 flex-shrink-0 mt-0.5 object-cover" />
                <p className="text-amber-300 text-sm italic">{joeReaction}</p>
              </div>
            )}

            {/* Shorter version */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-amber-300">Shorter version</h2>
                {shortenedWordCount > 0 && (
                  <span className="text-xs text-amber-400">
                    {shortenedWordCount} word{shortenedWordCount !== 1 ? "s" : ""} ({wordCount > 0 ? Math.round(((wordCount - shortenedWordCount) / wordCount) * 100) : 0}% shorter)
                  </span>
                )}
              </div>
              <div className="rounded-lg bg-slate-800 border border-amber-800/50 px-4 py-3 text-base text-slate-100 whitespace-pre-wrap">
                {shortened}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="rounded-lg bg-amber-600 hover:bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleShorten}
                disabled={loading}
                className="rounded-lg border border-amber-700 px-5 py-2 text-sm font-medium text-amber-400 hover:bg-amber-900/50 transition-colors"
              >
                Even shorter!
              </button>
            </div>
          </section>
        )}

        {/* Result for riddle mode */}
        {shortened && mode === "riddle" && (
          <section className="rounded-xl border border-purple-800 bg-purple-950 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-purple-300">{config.resultLabel}</h2>
            </div>
            <div className="rounded-lg bg-slate-800 border border-purple-800/50 px-4 py-3 text-base text-slate-100 whitespace-pre-wrap">
              {shortened}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleCopy}
                className="rounded-lg bg-purple-600 hover:bg-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
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
                className="rounded-xl border border-slate-700 bg-slate-800 p-5 text-center"
              >
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-teal-900 text-sm font-bold text-teal-400">
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold text-slate-200">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto w-full border-t border-slate-700 bg-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-4 text-center text-xs text-slate-500">
          Shorterrr! &mdash; Powered by{" "}
          <a
            href="https://teenytiny.ai"
            className="underline hover:text-slate-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            teenytiny.ai
          </a>
          ,{" "}
          <a
            href="https://anthropic.com"
            className="underline hover:text-slate-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            Anthropic
          </a>
          {" "}&amp;{" "}
          <a
            href="https://mpp.dev"
            className="underline hover:text-slate-300"
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
