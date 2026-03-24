# Shorterrr!

**Your message to your manager? SHORTER!**

Shorterrr! helps you write concise messages to your manager. Paste your draft, and it'll shout "SHORTER!" then proactively offer a tighter version you can send instead.

## Features

- Paste any message draft and get a shorter version instantly
- Powered by [teenytiny.ai](https://teenytiny.ai) LLM
- Tips from "Joe" (always says make it shorter) or "Hemingway" (writing quality feedback)
- Voice dictation for hands-free drafting
- Pay-as-you-go via Machine Payments Protocol (MPP) with embedded wallet

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **LLM**: teenytiny.ai
- **Wallet**: Privy.io embedded wallets
- **Payments**: MPP (Machine Payments Protocol)
- **Hosting**: Vercel (shorterrr.com)

## Getting Started

```bash
npm install
npm run dev
```

Set your environment variables in `.env.local`:

```
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
TEENYTINY_API_KEY=your-teenytiny-api-key
```

## License

MIT
