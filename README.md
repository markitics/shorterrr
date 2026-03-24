# Shorter!

**Your message is too long. Make it shorter!**

Shorter! is a web app that helps you craft concise messages to your manager. No matter what you write, it always shouts "SHORTER!" and proactively offers a tighter version you can send instead.

## Features

- AI-powered message shortening via [teenytiny.ai](https://teenytiny.ai)
- Pay-as-you-go via [Machine Payments Protocol (MPP)](https://mpp.dev) — no API key needed
- Embedded wallet powered by [Privy](https://privy.io)
- Writing tips toggle: "Tips from Joe" (always says make it shorter) or "Tips from Hemingway" (readability feedback)
- Voice dictation input

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
TEENYTINY_API_KEY=your-api-key-for-dev
```

## Deployment

Deploy to Vercel:

```bash
npx vercel
```

## Tech Stack

- [Next.js](https://nextjs.org) + TypeScript + Tailwind CSS
- [teenytiny.ai](https://teenytiny.ai) — LLM provider
- [MPP](https://mpp.dev) — Machine Payments Protocol
- [Privy](https://privy.io) — Embedded wallets