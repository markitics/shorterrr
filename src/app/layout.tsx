import type { Metadata } from "next";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shorterrr! — Make your message shorter",
  description:
    "Draft a message to your manager. Shorterrr! always shouts SHORTER and gives you a tighter version to send instead.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
