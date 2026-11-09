# Project context and decision log

Summary of the planning conversation between Ahsan and Claude (Nov 8–9, 2026). It explains *why*
things are the way they are, so a new session doesn't re-argue them.

## Who and why

- **Ahsan Raza Khan**, full stack web developer in Karachi (React, Node.js, Python).
- This repo is a portfolio demo of AI integration for web apps.

## Decisions and the reasons behind them

| Decision | Reason |
| --- | --- |
| Demo = support chatbot for a small online store | Concrete and easy for clients to understand |
| Fictional store (Kiran Threads), not a real brand | Using a real brand's pages risks copyright/terms problems and looks like impersonation. Fake but realistic content is safest; label it as sample data |
| Zero cost, no card anywhere | Ahsan's explicit requirement for a demo project |
| Groq for chat, Gemini for embeddings | Both have no-card free tiers; Groq is fast and OpenAI-compatible; Gemini embeddings are free |
| Fallback chain Groq → Gemini → Cerebras (optional) | Free tiers rate-limit; a fallback avoids visible failures during a client demo |
| Neon + pgvector | Standard Postgres, free tier, works from Workers via HTTP driver; transferable skill for client work |
| Upstash Redis cache + rate limiting | Protects the small free LLM quota; repeated questions are answered without an LLM call |
| Backend is a standalone Hono API on Workers (not Next.js API routes) | Ahsan asked for a "solid stack that handles load". Workers auto-scale, never sleep, 100K req/day free |
| Hono over FastAPI | FastAPI is free but free Python hosts (Render, Railway, etc.) sleep when idle and run one small instance; Hugging Face Spaces and Cloud Run need payment/card. Request path only calls external APIs, so Python's ML ecosystem adds nothing here. Ahsan agreed: "keep Hono". A Python ingestion script remains an option later to show Python skills |
| Frontend is Next.js as a static export | Ahsan asked for Next.js. Static export keeps page loads off the Workers quota and avoids the Cloudflare SSR adapter |
| Cloudflare Pages for hosting | Free tier allows commercial use; Vercel Hobby forbids it; GitHub Pages disallows business sites |
| Neon "coding agent" setup prompt was skipped | It assumes existing app code and writes `.env.local`; we wire Neon manually with the serverless driver |
| Build in 8 gated phases | Ahsan wants to approve phase by phase |

## Open items / reminders

- Cerebras key skipped (optional).

## Related docs (online, owned by Ahsan)

- Design overview: https://claude.ai/artifact/U4nCacyuX5ZAmQ1pPmNki6 (copy in `planning/DESIGN.md`)
- Setup guide: https://claude.ai/artifact/KxSrABXQPgVdAo3miV1VTH (copy in `planning/SETUP.md`)
- Phased plan: https://claude.ai/artifact/1z6W6WYCtUKqv4eV6RoiLd (copy in `planning/PLAN.md`)
