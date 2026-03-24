"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";

export default function WalletButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();

  if (!ready) return null;

  const embeddedWallet = wallets.find(
    (w) => w.walletClientType === "privy"
  );

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="rounded-full border border-orange-500 px-4 py-1.5 text-sm font-semibold text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors"
      >
        Connect wallet
      </button>
    );
  }

  const displayName =
    user?.email?.address ??
    user?.google?.email ??
    (embeddedWallet
      ? `${embeddedWallet.address.slice(0, 6)}...${embeddedWallet.address.slice(-4)}`
      : "Connected");

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-full bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-3 py-1.5">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs font-medium text-green-700 dark:text-green-300">
          {displayName}
        </span>
      </div>
      <button
        onClick={logout}
        className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        Logout
      </button>
    </div>
  );
}