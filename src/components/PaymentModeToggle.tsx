"use client";

export type PaymentMode = "api-key" | "mpp";

export default function PaymentModeToggle({
  mode,
  setMode,
}: {
  mode: PaymentMode;
  setMode: (mode: PaymentMode) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-zinc-400">Payment:</span>
      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full p-0.5">
        <button
          onClick={() => setMode("api-key")}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            mode === "api-key"
              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          API Key
        </button>
        <button
          onClick={() => setMode("mpp")}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            mode === "mpp"
              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          MPP 💸
        </button>
      </div>
    </div>
  );
}