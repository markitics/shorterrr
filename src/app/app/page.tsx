"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import PaymentModeToggle, {
  type PaymentMode,
} from "@/components/PaymentModeToggle";
import { initMppClient, getMppFetch, destroyMppClient } from "@/lib/mpp-client";
import VoiceDictation from "@/components/VoiceDictation";

type TipMode = "default" | "joe" | "hemingway";

interface ShortenResult {
  shout: string;
  suggestion: string;
}

const TEENYTINY_URL = "https://teenytiny.ai/v1/chat/completions";

const PRIVY_CONFIGURED =
  typeof window !== "undefined" &&
  !!process.env.NEXT_PUBLIC_PRIVY_APP_ID &&
  process.env.NEXT_PUBLIC_PRIVY_APP_ID !== "your-privy-app-id";

export default function AppPage() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ShortenResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipMode, setTipMode] = useState<TipMode>("default");
  const [showShout, setShowShout] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("api-key");
  const [walletReady, setWalletReady] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const mppInitialized = useRef(false);

  // Lazy-load Privy hooks only when needed
  const privyRef = useRef<{
    login: () => void;
    logout: () => Promise<void>;
    wallets: Array<{ walletClientType: string; address: string }>;
    getViemAccount: () => Promise<unknown>;
  } | null>(null);

  useEffect(() => {
    if (!PRIVY_CONFIGURED) return;

    // Dynamically import and set up Privy integration
    import("@privy-io/react-auth").then((mod) => {
      // Privy hooks are only usable inside the provider which is in Providers.tsx
      // Since we're inside PrivyProvider, we can use the hooks
      setWalletReady(true);
    });
  }, []);

  const handleShorten = useCallback(async () => {
    if (!message.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setShowShout(false);

    try {
      let reply: string;

      if (paymentMode === "mpp") {
        if (!mppInitialized.current) {
          setError(
            "MPP wallet not connected. Please connect your wallet or switch to API Key mode."
          );
          setLoading(false);
          return;
        }

        const mppFetch = getMppFetch();
        const systemPrompt = buildSystemPrompt(tipMode);
        const res = await mppFetch(TEENYTINY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "eliza",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message.trim() },
            ],
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error?.message ?? `Request failed (${res.status})`);
          setLoading(false);
          return;
        }
        reply =
          data.choices?.[0]?.message?.content ??
          "Could not generate a response.";
      } else {
        const res = await fetch("/api/shorten", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: message.trim(), mode: tipMode }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong");
          setLoading(false);
          return;
        }
        reply = data.suggestion;
      }

      setShowShout(true);
      setTimeout(() => {
        setResult({ shout: "SHORTER!", suggestion: reply });
      }, 800);
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [message, tipMode, paymentMode]);

  const handleCopy = useCallback(() => {
    if (result?.suggestion) {
      navigator.clipboard.writeText(result.suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <Link
          href="/"
          className="text-2xl font-black tracking-tight text-orange-500"
        >
          Shorterrr!
        </Link>
        <div className="flex items-center gap-4">
          <TipModeToggle tipMode={tipMode} setTipMode={setTipMode} />
          {PRIVY_CONFIGURED && <WalletSection />}
        </div>
      </nav>

      {/* Payment mode bar */}
      <div className="flex items-center justify-center gap-4 px-6 py-2 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950">
        <PaymentModeToggle mode={paymentMode} setMode={setPaymentMode} />
        {paymentMode === "mpp" && !PRIVY_CONFIGURED && (
          <span className="text-xs text-amber-600">
            Privy not configured — set NEXT_PUBLIC_PRIVY_APP_ID
          </span>
        )}
        {paymentMode === "mpp" && PRIVY_CONFIGURED && (
          <span className="text-xs text-green-600">
            Pay-per-use via MPP — connect wallet above
          </span>
        )}
        {paymentMode === "api-key" && (
          <span className="text-xs text-zinc-400">
            Using server-side API key
          </span>
        )}
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black">✉️ Message your manager</h1>
            <p className="text-zinc-500">
              Write your message below. We&apos;ll make it shorterrr.
            </p>
          </div>

          {/* Input */}
          <div className="space-y-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hey manager, I wanted to follow up on the thing we discussed in yesterday's meeting about the project timeline. I think we should probably consider maybe pushing back the deadline a little bit because the team has been dealing with some unexpected technical challenges that have slowed down our progress..."
              className="w-full h-48 p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-400">
                  {message.length > 0 &&
                    `${message.split(/\s+/).filter(Boolean).length} words`}
                </span>
                <VoiceDictation
                  onTranscript={(text) =>
                    setMessage((prev) =>
                      prev ? prev + " " + text : text
                    )
                  }
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleShorten}
                disabled={loading || !message.trim()}
                className="rounded-full bg-orange-500 px-6 py-3 text-base font-bold text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Thinking..." : "Make it shorterrr! 📢"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Shout animation */}
          {showShout && !result && (
            <div className="text-center py-12">
              <span className="text-6xl font-black text-orange-500 animate-shout inline-block">
                SHORTER!
              </span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="animate-fade-in-up space-y-4">
              <div className="text-center">
                <span className="text-4xl font-black text-orange-500">
                  SHORTER! 📢
                </span>
              </div>

              <div className="p-6 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">
                    {result.suggestion}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <p className="text-center text-sm text-zinc-400">
                Send this to your manager instead. You&apos;re welcome.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/** Wallet connect/disconnect — only rendered when Privy is configured */
function WalletSection() {
  // This component is lazy — import is safe because PrivyProvider wraps it
  const WalletButton = require("@/components/WalletButton").default;
  return <WalletButton />;
}

function TipModeToggle({
  tipMode,
  setTipMode,
}: {
  tipMode: TipMode;
  setTipMode: (mode: TipMode) => void;
}) {
  const modes: { value: TipMode; label: string }[] = [
    { value: "default", label: "Shorterrr" },
    { value: "joe", label: "Tips from Joe" },
    { value: "hemingway", label: "Hemingway" },
  ];

  return (
    <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full p-1 text-sm">
      {modes.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setTipMode(value)}
          className={`px-3 py-1 rounded-full transition-colors ${
            tipMode === value
              ? "bg-orange-500 text-white font-semibold"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function buildSystemPrompt(mode: TipMode): string {
  const base = `You are "Shorterrr!", a writing assistant that helps people write concise messages to their manager.
Your job: take the user's draft message and rewrite it to be MUCH shorter while keeping the core meaning.
Always be direct and professional. Cut filler words, unnecessary context, and over-explaining.
Return ONLY the shortened message, nothing else.`;

  if (mode === "hemingway") {
    return `${base}

Additionally, apply these Hemingway-style writing principles:
- Use short sentences. If a sentence has more than 14 words, break it up.
- Avoid passive voice. Use active voice instead.
- Replace adverbs with stronger verbs.
- Use simple words. Replace complex words with simpler alternatives.
- Cut qualifiers (very, really, quite, rather, somewhat).
After the shortened message, add a blank line and then brief feedback on what you fixed (passive voice, long sentences, etc).`;
  }

  if (mode === "joe") {
    return `You are Joe. No matter what the user writes, you always respond with exactly this:
"You need to make that way shorter."
Nothing else. Just that one line. Every time.`;
  }

  return base;
}