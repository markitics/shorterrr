import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <span className="text-2xl font-black tracking-tight text-orange-500">
          Shorterrr!
        </span>
        <Link
          href="/app"
          className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          Try it free
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight">
            Your message is
            <br />
            <span className="text-orange-500">too long.</span>
          </h1>

          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
            Drafting a message to your manager? Shorterrr! reads it, shouts
            &ldquo;SHORTER!&rdquo; and rewrites it in fewer words. Every time.
          </p>

          <Link
            href="/app"
            className="inline-block rounded-full bg-orange-500 px-8 py-4 text-lg font-bold text-white hover:bg-orange-600 transition-colors animate-pulse-orange"
          >
            Make it shorterrr →
          </Link>

          {/* Features */}
          <div className="grid sm:grid-cols-3 gap-6 pt-12 text-left">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="text-3xl mb-3">📢</div>
              <h3 className="font-bold text-lg mb-1">Always shorter</h3>
              <p className="text-sm text-zinc-500">
                No matter what you write, it always says SHORTER! and gives you
                a tighter version.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="text-3xl mb-3">✍️</div>
              <h3 className="font-bold text-lg mb-1">Writing tips</h3>
              <p className="text-sm text-zinc-500">
                Toggle between &ldquo;Tips from Joe&rdquo; (make it shorter!)
                and Hemingway-style readability feedback.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="text-3xl mb-3">💸</div>
              <h3 className="font-bold text-lg mb-1">Pay as you go</h3>
              <p className="text-sm text-zinc-500">
                No subscription needed. Pay per message via the Machine Payments
                Protocol. Free to start.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-zinc-400 border-t border-zinc-200 dark:border-zinc-800">
        Powered by{" "}
        <a
          href="https://teenytiny.ai"
          className="underline hover:text-orange-500"
          target="_blank"
          rel="noopener noreferrer"
        >
          teenytiny.ai
        </a>{" "}
        &amp;{" "}
        <a
          href="https://mpp.dev"
          className="underline hover:text-orange-500"
          target="_blank"
          rel="noopener noreferrer"
        >
          MPP
        </a>
      </footer>
    </div>
  );
}