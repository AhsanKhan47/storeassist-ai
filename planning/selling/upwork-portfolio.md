# Upwork copy

Draft for Ahsan's Upwork portfolio entry and proposals. Paste and adjust to your own voice.

## Portfolio project

**Title (up to 70 characters):** AI support chatbot that answers from store policies (RAG)

**Your role:** Full stack developer: design, AI integration, backend, frontend, deployment

**Project description:**

A customer support chatbot for an online clothing store (fictional demo store, sample data) that
answers questions only from the store's own policy documents.

- **Problem:** small stores answer the same returns, shipping and sizing questions every day, and
  generic AI chatbots make up answers that cost money and trust.
- **Solution:** a retrieval-augmented (RAG) assistant. The store's 15 policy pages are split into
  passages and stored with vector embeddings in Postgres. Each question finds the closest passages; if
  none are close enough, the bot gives the store's contact details without calling the model. Otherwise
  the model answers from those passages only, with a numbered source for every fact, streamed word by
  word.
- **Guardrails:** refuses prompt injection ("ignore your rules", fake policy text, forged chat history),
  stays on topic, rate-limits per visitor, caches repeat answers.
- **Website widget:** a floating chat button any site can add with one `<script>` tag (Shopify,
  WordPress, Wix), isolated so the host site's CSS can't break it.
- **Results:** 15/15 on a test set of real customer questions plus 8/8 attack and small-talk checks,
  run against the live API; 87 unit tests; about 11 ms of server CPU per answer; $0/month on free tiers.

**Skills:** Next.js, React, TypeScript, Node.js, Cloudflare Workers, Hono, PostgreSQL, pgvector,
Drizzle ORM, Redis, LLM integration, RAG, Prompt engineering, Zod, Vitest, Tailwind CSS

**Links:**

- Live demo: https://storeassist-ai.pages.dev
- Website widget playground: https://storeassist-ai.pages.dev/try-widget
- Code: https://github.com/AhsanKhan47/storeassist-ai
- Video: *(Loom link)*

**Images (in this order):** `answer.webp` (cover), `widget.webp`, `fallback.webp`,
`under-the-hood.webp`, `phone.webp` from `.github/assets/`.

## Proposal template

Use for jobs like "AI chatbot for our website", "train ChatGPT on our documents", "customer support
bot", "RAG". Replace the bracketed parts; keep it under 150 words. Upwork shows the first two lines in
the preview, so they must speak to the client's job.

> Hi [name], you need [their goal in their words, e.g. "a chatbot that answers customer questions from
> your help docs"]. I built exactly this as a working demo; try it here:
> https://storeassist-ai.pages.dev
>
> Ask it "Can I return a sale item?" and it answers from the store's policy, with the source. Ask
> "Do you sell shoes?" and it says it doesn't know instead of inventing an answer. That's the part most
> chatbots get wrong.
>
> For [company], I'd [one or two lines specific to their post: their documents, their platform, any
> integration they mention], and add it to your site with one line of code. Before handover I test it
> on your real customer questions, like this report: [link to eval/report.md on GitHub].
>
> One question: [a genuine question about their docs, platform or volume].
>
> Ahsan

## Profile line to add (optional)

"I build AI features into web apps: chatbots that answer from your own documents with sources, and
integrations with OpenAI, Gemini and Groq. Live demo: storeassist-ai.pages.dev"
