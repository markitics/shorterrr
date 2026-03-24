"use client";

import { PrivyProvider } from "@privy-io/react-auth";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export default function Providers({ children }: { children: React.ReactNode }) {
  // Only wrap with PrivyProvider if a valid app ID is configured
  if (!PRIVY_APP_ID || PRIVY_APP_ID === "your-privy-app-id") {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#f97316",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}