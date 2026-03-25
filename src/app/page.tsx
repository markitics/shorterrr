"use client";

import { useState, useEffect, useRef } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { parseChallenge, encodeCredential, formatAmount } from "@/lib/mpp";
import { analyze } from "@/lib/hemingway";
import type { MppChallenge } from "@/lib/mpp";
import type { HemingwayResult, SentenceAnalysis, IssueCategory } from "@/lib/hemingway";

type Mode = "joe" | "riddle" | "hemingway";

const DEFAULT_DRAFT = `Hi Sarah, I just wanted to reach out and let you know that after very careful consideration, I believe we should probably move forward with the new project management software. The IT department originally suggested it at last week's meeting. I think the implementation would be very beneficial for the team, assuming the budget allows for it. I'm not sure, but I feel like we could potentially get the necessary approvals from the relevant stakeholders if we present a strong case. Maybe we should set up a meeting to discuss the requirements and figure out next steps? Let me know if that makes sense.`;

const EXAMPLE_MESSAGES = [
  `Dear Manager, I am writing to respectfully request some time off on Friday afternoon. I have a dentist appointment that was subsequently moved forward due to a cancellation. I'm not sure if it's too inconvenient for the team, but the receptionist told me this slot wouldn't be available again for a very long time. I believe my tasks can be completed before I leave. I think I could probably finish the report by Thursday if I prioritize it. I just wanted to make sure it's okay with you. Please let me know if this is a possibility, and I apologize for the short notice. To be honest, I should have mentioned it sooner.`,
  `Hi team, I wanted to very quickly circle back regarding the office kitchen refrigerator situation. It has been repeatedly observed to be in a state of uncleanliness by multiple staff members over the past several weeks. I think it is absolutely essential that we establish a comprehensive rotating cleaning schedule going forward. Perhaps we could utilize a shared spreadsheet to coordinate this. The situation has been allowed to deteriorate for too long, and I feel like something needs to be urgently done about it. I'm not sure who should take the lead on this, but maybe we could discuss it at the next team meeting? I believe that with everyone's cooperation, we can maintain a much cleaner shared space. If that makes sense.`,
  `Hello everyone, I wanted to proactively communicate that the quarterly budget report will unfortunately need to be delayed by approximately two to three additional business days. Several data sources that are critically needed for the analysis have not yet been made available by the finance team. I have subsequently sent multiple reminder emails. I think this is probably due to their own internal deadlines. I apologize profusely for any inconvenience this may cause. I believe the final report will be very thorough and comprehensive once completed. Perhaps we should establish a more formalized process for obtaining data in a timely manner. Just wanted to keep everyone in the loop. Let me know if you have concerns.`,
  `Dear colleagues, I am reaching out today to bring to your attention an issue with the conference room booking system. It was recently updated as part of the digital transformation initiative. However, it appears to be experiencing persistent technical difficulties. Our team's ability to effectively schedule meetings has been negatively impacted. I think the root cause is probably related to the server migration that was hastily performed last month. It would be greatly appreciated if someone from technical support could kindly investigate this matter. I'm not sure, but it seems like the issue might be with the calendar sync. Maybe we should just go back to the old system. To be honest, I feel like the new system was implemented without sufficient testing.`,
];


const MODE_CONFIG: Record<
  Mode,
  { label: string; description: string; buttonText: string; resultLabel: string; color: string }
> = {
  joe: {
    label: "Joe mode",
    description: "Joe says it's too long — and gives you a shorter version (powered by Claude)",
    buttonText: "Make it shorter!",
    resultLabel: "Joe says:",
    color: "amber",
  },
  riddle: {
    label: "Answer in riddles",
    description: "A surreal poet interprets your message (powered by TeenyTiny AI's racter)",
    buttonText: "Get a riddle",
    resultLabel: "The poet speaks:",
    color: "purple",
  },
  hemingway: {
    label: "Hemingway",
    description: "Writing feedback mainly using hard-coded readability rules of thumb",
    buttonText: "Analyze",
    resultLabel: "Hemingway's feedback:",
    color: "blue",
  },
};

/* ------------------------------------------------------------------ */
/*  Hemingway constants & types                                        */
/* ------------------------------------------------------------------ */

// Severity order: most severe first
const SEVERITY_ORDER: IssueCategory[] = [
  "very-hard", "hard", "very", "complex", "passive", "adverb", "hedging", "redundant",
];

// Brighter, more distinct colors for dark backgrounds
const CATEGORY_META: Record<IssueCategory, { label: string; bg: string; border: string; text: string; accent: string; dot: string; highlight: string }> = {
  "very-hard": { label: "very hard to read", bg: "bg-red-950",    border: "border-red-700",    text: "text-red-400",    accent: "text-red-300",    dot: "bg-red-500 rounded",       highlight: "bg-red-700/60" },
  "hard":      { label: "hard to read",      bg: "bg-yellow-950", border: "border-yellow-700",  text: "text-yellow-400", accent: "text-yellow-300", dot: "bg-yellow-500 rounded",    highlight: "bg-yellow-700/50" },
  "very":      { label: "uses 'very'",        bg: "bg-orange-950", border: "border-orange-600",  text: "text-orange-400", accent: "text-orange-300", dot: "bg-orange-500 rounded-full", highlight: "bg-orange-600/60 underline decoration-orange-400 decoration-2" },
  "complex":   { label: "simpler alternative", bg: "bg-violet-950", border: "border-violet-600",  text: "text-violet-400", accent: "text-violet-300", dot: "bg-violet-500 rounded-full", highlight: "bg-violet-600/60 underline decoration-violet-400 decoration-2" },
  "passive":   { label: "passive voice",      bg: "bg-emerald-950",border: "border-emerald-600", text: "text-emerald-400",accent: "text-emerald-300",dot: "bg-emerald-500 rounded-full",highlight: "bg-emerald-600/60 underline decoration-emerald-400 decoration-2" },
  "adverb":    { label: "adverb",             bg: "bg-cyan-950",   border: "border-cyan-600",    text: "text-cyan-400",   accent: "text-cyan-300",   dot: "bg-cyan-500 rounded-full",  highlight: "bg-cyan-600/60 underline decoration-cyan-400 decoration-2" },
  "hedging":   { label: "hedging",            bg: "bg-pink-950",   border: "border-pink-600",    text: "text-pink-400",   accent: "text-pink-300",   dot: "bg-pink-500 rounded-full",  highlight: "bg-pink-600/60 underline decoration-pink-400 decoration-2" },
  "redundant": { label: "redundant",          bg: "bg-fuchsia-950",border: "border-fuchsia-600", text: "text-fuchsia-400",accent: "text-fuchsia-300",dot: "bg-fuchsia-500 rounded-full",highlight: "bg-fuchsia-600/60 underline decoration-fuchsia-400 decoration-2" },
};

function getCategoryCount(summary: HemingwayResult["summary"], cat: IssueCategory): number {
  switch (cat) {
    case "very-hard": return summary.veryHardSentences;
    case "hard": return summary.hardSentences;
    case "very": return summary.veryUsage;
    case "complex": return summary.complexWords;
    case "passive": return summary.passiveVoice;
    case "adverb": return summary.adverbs;
    case "hedging": return summary.hedging;
    case "redundant": return summary.redundant;
  }
}

/* ------------------------------------------------------------------ */
/*  Hemingway single-editor overlay                                    */
/* ------------------------------------------------------------------ */

function HemingwayEditor({
  draft,
  onDraftChange,
  hemingwayResult,
  dismissed,
  sliderText,
  sliderAnalysis,
  sliderDismissed,
  loading,
}: {
  draft: string;
  onDraftChange: (v: string) => void;
  hemingwayResult: HemingwayResult;
  dismissed: Set<IssueCategory>;
  sliderText: string | null;
  sliderAnalysis: HemingwayResult | null;
  sliderDismissed: Set<IssueCategory>;
  loading: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Sync scroll positions
  function handleScroll() {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  // Auto-resize height to match content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.max(200, textareaRef.current.scrollHeight) + "px";
    }
  }, [draft, sliderText]);

  const displayResult = sliderAnalysis || hemingwayResult;
  const displayDismissed = sliderAnalysis ? sliderDismissed : dismissed;
  const displayText = sliderText || draft;

  return (
    <div className="relative w-full">
      {/* Highlighted text layer (behind) */}
      <div
        ref={highlightRef}
        className="absolute inset-0 rounded-lg border border-transparent bg-slate-800 px-4 py-3 text-base leading-relaxed text-slate-200 overflow-hidden pointer-events-none whitespace-pre-wrap break-words"
        aria-hidden="true"
      >
        {displayResult.sentences.map((s: SentenceAnalysis, i: number) => (
          <SentenceSpan key={i} sentence={s} dismissed={displayDismissed} />
        ))}
      </div>
      {/* Transparent textarea (on top, captures input) */}
      <textarea
        ref={textareaRef}
        id="draft"
        className="relative w-full rounded-lg border border-slate-600 bg-transparent px-4 py-3 text-base leading-relaxed text-transparent caret-slate-100 placeholder-slate-500 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25 resize-none overflow-hidden selection:bg-teal-500/30"
        style={{ caretColor: "#f1f5f9" }}
        placeholder='Paste your message here...'
        value={displayText}
        onChange={(e) => onDraftChange(e.target.value)}
        onScroll={handleScroll}
        disabled={loading || !!sliderText}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hemingway result display component                                 */
/* ------------------------------------------------------------------ */

function HemingwayDisplay({
  result,
  dismissed,
  onDismiss,
  onUndismiss,
  onAutoFix,
  fixingCategory,
  sliderValue,
  sliderMax,
  onSliderChange,
  sliderText,
  sliderLoading,
  originalText,
  fixedCategories,
}: {
  result: HemingwayResult;
  dismissed: Set<IssueCategory>;
  onDismiss: (cat: IssueCategory) => void;
  onUndismiss: (cat: IssueCategory) => void;
  onAutoFix: (cat: IssueCategory) => void;
  fixingCategory: IssueCategory | null;
  sliderValue: number;
  sliderMax: number;
  onSliderChange: (v: number) => void;
  sliderText: string | null;
  sliderLoading: boolean;
  originalText: string;
  /** Categories the slider has already fixed (so we don't highlight them in the slider text) */
  fixedCategories: IssueCategory[];
}) {
  const { grade, stats, sentences, summary } = result;

  const gradeLabel =
    grade <= 6 ? "Good" : grade <= 10 ? "OK" : grade <= 14 ? "Poor" : "Very Poor";
  const gradeColor =
    grade <= 6
      ? "text-emerald-400"
      : grade <= 10
      ? "text-amber-400"
      : "text-red-400";

  // Categories that actually have issues (respecting dismissals)
  const activeCategories = SEVERITY_ORDER.filter(
    (cat) => getCategoryCount(summary, cat) > 0 && !dismissed.has(cat)
  );

  const allClean =
    activeCategories.length === 0 &&
    SEVERITY_ORDER.every((cat) => getCategoryCount(summary, cat) === 0 || dismissed.has(cat));

  // (Text display is now in HemingwayEditor overlay — this component only shows controls)

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

      {/* Issue summary cards with auto-fix / dismiss */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SEVERITY_ORDER.map((cat) => {
          const count = getCategoryCount(summary, cat);
          if (count === 0) return null;
          const meta = CATEGORY_META[cat];
          const isDismissed = dismissed.has(cat);
          const isFixedBySlider = fixedCategories.includes(cat);
          const isFixing = fixingCategory === cat;

          return (
            <div
              key={cat}
              className={`rounded-lg ${meta.bg} ${meta.border} border px-3 py-2 flex items-center justify-between gap-2 ${isDismissed ? "opacity-40" : ""} ${isFixedBySlider ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-lg font-bold ${meta.text}`}>{count}</span>
                <span className={`text-xs ${meta.accent} truncate`}>
                  {meta.label}{cat !== "very" && count !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {isFixedBySlider ? (
                  <span className="rounded px-2 py-1 text-xs font-medium text-emerald-400 border border-emerald-700 bg-emerald-950">
                    Fixed
                  </span>
                ) : isDismissed ? (
                  <button
                    onClick={() => onUndismiss(cat)}
                    className="rounded px-2 py-1 text-xs font-medium text-slate-400 border border-slate-600 hover:bg-slate-700 transition-colors"
                  >
                    Show
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onAutoFix(cat)}
                      disabled={isFixing || sliderLoading}
                      className={`rounded px-2 py-1 text-xs font-medium text-white transition-colors ${
                        isFixing
                          ? "bg-slate-600 cursor-wait"
                          : "bg-teal-600 hover:bg-teal-500"
                      }`}
                    >
                      {isFixing ? "Fixing..." : "Auto-fix"}
                    </button>
                    <button
                      onClick={() => onDismiss(cat)}
                      className="rounded px-2 py-1 text-xs font-medium text-slate-400 border border-slate-600 hover:bg-slate-700 transition-colors"
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {allClean && (
          <div className="col-span-full rounded-lg bg-emerald-950 border border-emerald-800 px-3 py-2 text-center">
            <div className="text-sm font-semibold text-emerald-400">Looking good! No major issues found.</div>
          </div>
        )}
      </div>

      {/* Slider: Original ↔ Hemingway'd */}
      {activeCategories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Original</span>
            <span>Hemingway&apos;d</span>
          </div>
          <input
            type="range"
            min={0}
            max={sliderMax}
            value={sliderValue}
            onChange={(e) => onSliderChange(Number(e.target.value))}
            disabled={sliderLoading}
            className="w-full accent-teal-500 cursor-pointer disabled:opacity-50"
          />
          {sliderValue > 0 && sliderValue < sliderMax && (
            <p className="text-xs text-slate-500 text-center">
              {sliderLoading ? "Fixing" : "Fixed"}: {activeCategories.slice(0, sliderValue).map((c) => CATEGORY_META[c].label).join(", ")}
            </p>
          )}
          {sliderLoading && (
            <p className="text-xs text-teal-400 text-center animate-pulse">Applying fixes...</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        {SEVERITY_ORDER.filter((cat) => getCategoryCount(summary, cat) > 0 && !dismissed.has(cat)).map((cat) => (
          <span key={cat} className="flex items-center gap-1">
            <span className={`inline-block w-3 h-3 ${CATEGORY_META[cat].dot}`} /> {CATEGORY_META[cat].label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SentenceSpan({ sentence, dismissed }: { sentence: SentenceAnalysis; dismissed: Set<IssueCategory> }) {
  const sentenceCat = sentence.level === "very-hard" ? "very-hard" : sentence.level === "hard" ? "hard" : null;
  const bgClass =
    sentenceCat && !dismissed.has(sentenceCat)
      ? CATEGORY_META[sentenceCat].highlight
      : "";

  // Multi-word issues (hedging, redundant, passive) need character-level ranges
  const phraseRanges: { start: number; end: number; issue: SentenceAnalysis["issues"][0] }[] = [];
  const wordIssueMap = new Map<string, SentenceAnalysis["issues"][0]>();

  for (const issue of sentence.issues) {
    if (dismissed.has(issue.type as IssueCategory)) continue;
    if (issue.type === "hedging" || issue.type === "redundant" || issue.type === "passive") {
      phraseRanges.push({ start: issue.index, end: issue.index + issue.word.length, issue });
    } else {
      wordIssueMap.set(issue.word.toLowerCase(), issue);
    }
  }

  function getHighlight(issue: SentenceAnalysis["issues"][0]) {
    return CATEGORY_META[issue.type as IssueCategory]?.highlight || "bg-slate-600 underline";
  }

  function getTitle(issue: SentenceAnalysis["issues"][0]) {
    if (issue.suggestion) return issue.suggestion;
    switch (issue.type) {
      case "adverb": return "Consider removing this adverb";
      case "very": return "Delete 'very', or use a stronger adjective";
      case "hedging": return "Be direct — remove hedging language";
      case "redundant": return "Delete this — it adds no meaning";
      case "passive": return "Consider using active voice";
      default: return "";
    }
  }

  function renderWord(w: string, key: string | number) {
    const clean = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
    const issue = wordIssueMap.get(clean);
    if (issue) {
      return (
        <span
          key={key}
          className={`${getHighlight(issue)} rounded-sm cursor-help transition-all hover:brightness-150 hover:ring-2 hover:ring-white/40`}
          title={getTitle(issue)}
        >
          {w}
        </span>
      );
    }
    return <span key={key}>{w}</span>;
  }

  // If there are multi-word phrase matches, use character-level segmentation
  if (phraseRanges.length > 0) {
    const sorted = [...phraseRanges].sort((a, b) => a.start - b.start);
    const segments: { text: string; issue?: SentenceAnalysis["issues"][0] }[] = [];
    let pos = 0;
    for (const range of sorted) {
      if (range.start > pos) {
        segments.push({ text: sentence.text.slice(pos, range.start) });
      }
      segments.push({ text: sentence.text.slice(range.start, range.end), issue: range.issue });
      pos = range.end;
    }
    if (pos < sentence.text.length) {
      segments.push({ text: sentence.text.slice(pos) });
    }

    return (
      <span className={`${bgClass} rounded-sm`}>
        {segments.map((seg, si) => {
          if (seg.issue) {
            return (
              <span
                key={si}
                className={`${getHighlight(seg.issue)} rounded-sm cursor-help transition-all hover:brightness-150 hover:ring-2 hover:ring-white/40`}
                title={getTitle(seg.issue)}
              >
                {seg.text}
              </span>
            );
          }
          return seg.text.split(/(\s+)/).map((w, wi) => renderWord(w, `${si}-${wi}`));
        })}
        {" "}
      </span>
    );
  }

  // Simple word-by-word highlighting
  return (
    <span className={`${bgClass} rounded-sm`}>
      {sentence.text.split(/(\s+)/).map((w, i) => renderWord(w, i))}
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

  // Hemingway auto-fix state
  const [dismissedCategories, setDismissedCategories] = useState<Set<IssueCategory>>(new Set());
  const [fixingCategory, setFixingCategory] = useState<IssueCategory | null>(null);
  const [sliderValue, setSliderValue] = useState(0);
  const [sliderText, setSliderText] = useState<string | null>(null);
  const [sliderLoading, setSliderLoading] = useState(false);
  const sliderCache = useRef<Record<string, string>>({});

  // Cache results per mode so toggling back restores them
  const resultCache = useRef<Record<string, { shortened: string; joeReaction: string; hemingwayResult: HemingwayResult | null; hasShouted: boolean; draft: string }>>({});

  const { login, ready, authenticated, user, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const connectedWallet = wallets[0] ?? null;

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
    // Reset slider + dismissed state when draft changes
    setSliderValue(0);
    setSliderText(null);
    sliderCache.current = {};
    setDismissedCategories(new Set());

    debounceRef.current = setTimeout(() => {
      setHemingwayResult(analyze(draft));
      setHasShouted(true);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, mode]);

  async function callApi(mppCredential?: string, messageOverride?: string) {
    const res = await fetch("/api/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: messageOverride || draft, mode, mppCredential }),
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

  async function handleShorten(messageOverride?: string) {
    const input = messageOverride || draft;
    if (!input.trim()) return;

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
      const data = await callApi(undefined, messageOverride);
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
    if (!pendingChallenge || !connectedWallet) return;

    setLoading(true);
    setPaymentStatus("Processing payment...");

    try {
      const credential = encodeCredential({
        challenge: pendingChallenge.raw,
        payload: {
          walletAddress: connectedWallet.address,
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
    setDismissedCategories(new Set());
    setSliderValue(0);
    setSliderText(null);
    sliderCache.current = {};
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

  // Hemingway: active categories in severity order
  const activeCategories = hemingwayResult
    ? SEVERITY_ORDER.filter(
        (cat) => getCategoryCount(hemingwayResult.summary, cat) > 0 && !dismissedCategories.has(cat)
      )
    : [];

  async function callHemingwayFix(categories: IssueCategory[], issueHints: string[]): Promise<string | null> {
    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draft, mode: "hemingway-fix", fixCategories: categories, issueHints }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.fixed;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fix failed.");
      return null;
    }
  }

  async function handleAutoFix(cat: IssueCategory) {
    if (!hemingwayResult) return;
    setFixingCategory(cat);
    setError("");

    // Collect specific issue hints from the analysis so the AI knows exactly what to fix
    const hints: string[] = [];
    for (const s of hemingwayResult.sentences) {
      if ((cat === "very-hard" && s.level === "very-hard") || (cat === "hard" && s.level === "hard")) {
        hints.push(`Sentence (${s.wordCount} words): "${s.text}"`);
      }
      for (const issue of s.issues) {
        if (issue.type === cat) {
          hints.push(`"${issue.word}"${issue.suggestion ? ` → ${issue.suggestion}` : ""} in: "${s.text}"`);
        }
      }
    }

    const fixed = await callHemingwayFix([cat], hints);
    if (fixed && fixed.trim() !== draft.trim()) {
      setDraft(fixed);
    } else if (fixed) {
      setError("Could not fix this issue without rewriting. Try editing manually.");
    }
    setFixingCategory(null);
  }

  function handleDismiss(cat: IssueCategory) {
    setDismissedCategories((prev) => new Set([...prev, cat]));
  }

  function handleUndismiss(cat: IssueCategory) {
    setDismissedCategories((prev) => {
      const next = new Set(prev);
      next.delete(cat);
      return next;
    });
  }

  async function handleSliderChange(value: number) {
    setSliderValue(value);
    if (value === 0) {
      setSliderText(null);
      return;
    }
    const categoriesToFix = activeCategories.slice(0, value);
    setSliderLoading(true);
    setError("");
    const fixed = await callHemingwayFix(categoriesToFix, []);
    if (fixed) {
      setSliderText(fixed);
    }
    setSliderLoading(false);
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
                {walletsReady && wallets.length > 0 ? (
                  <span className="text-xs font-mono text-teal-400 hidden sm:inline">
                    {wallets[0].address.slice(0, 6)}...{wallets[0].address.slice(-4)}
                  </span>
                ) : !walletsReady ? (
                  <span className="text-xs text-slate-500 animate-pulse">
                    Loading...
                  </span>
                ) : null}
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
                // Save current results to cache
                if (shortened || hemingwayResult) {
                  resultCache.current[mode] = { shortened, joeReaction, hemingwayResult, hasShouted, draft };
                }
                // Restore cached results for target mode (only if draft hasn't changed)
                const cached = resultCache.current[m];
                if (cached && cached.draft === draft) {
                  setShortened(cached.shortened);
                  setJoeReaction(cached.joeReaction);
                  setHemingwayResult(cached.hemingwayResult);
                  setHasShouted(cached.hasShouted);
                } else {
                  setShortened("");
                  setJoeReaction("");
                  setHemingwayResult(null);
                  setHasShouted(false);
                }
                setMode(m);
                setError("");
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
          {mode === "hemingway" && hemingwayResult ? (
            /* Single-editor overlay: transparent textarea on top of highlighted text */
            <HemingwayEditor
              draft={draft}
              onDraftChange={setDraft}
              hemingwayResult={hemingwayResult}
              dismissed={dismissedCategories}
              sliderText={sliderText}
              sliderAnalysis={sliderText ? analyze(sliderText) : null}
              sliderDismissed={new Set([...dismissedCategories, ...activeCategories.slice(0, sliderValue)])}
              loading={loading}
            />
          ) : (
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
                  handleShorten();
                }
              }}
              disabled={loading}
            />
          )}
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
                  onClick={() => handleShorten()}
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
            ) : !connectedWallet ? (
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

        {/* Hemingway controls (cards, slider, legend) */}
        {hemingwayResult && mode === "hemingway" && (
          <HemingwayDisplay
            result={hemingwayResult}
            dismissed={dismissedCategories}
            onDismiss={handleDismiss}
            onUndismiss={handleUndismiss}
            onAutoFix={handleAutoFix}
            fixingCategory={fixingCategory}
            sliderValue={sliderValue}
            sliderMax={activeCategories.length}
            onSliderChange={handleSliderChange}
            sliderText={sliderText}
            sliderLoading={sliderLoading}
            originalText={draft}
            fixedCategories={activeCategories.slice(0, sliderValue)}
          />
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
                onClick={() => handleShorten(shortened)}
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
                desc: "Joe mode, Riddles, or Hemingway — each gives different feedback.",
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
