# Upwork copy

Ahsan's Upwork portfolio entry (as entered on Upwork, 2026-11-21) and the proposal template.
Upwork limits: title 70 characters, description 600 characters, 5 skills.

## Portfolio project

**Title:** AI Customer Support Chatbot for an Online Store (RAG)

**Your role:** Full-stack developer (sole developer)

**Project description** (572 / 600 characters):

> Small online stores answer the same questions about returns, shipping and sizing every day, and
> generic chatbots tend to make up answers. I built a support assistant that answers only from the
> store's own policy pages and shows the source for each answer. If the policies don't cover a
> question, it says so and gives the store's contact details.
>
> Stack: Next.js, Hono on Cloudflare Workers, Postgres with pgvector, Groq. Ships as a one-line
> website widget.
>
> Results: 15/15 on real customer questions, prompt-injection tests passed, 87 unit tests. Demo uses
> a sample store.

**Skills (5):** Chatbot Development, Retrieval Augmented Generation, Next.js, PostgreSQL, TypeScript

**Content blocks, in order:**

1. Images (Ahsan uploads; Upwork's upload can't be automated from here). JPGs ready in
   `planning/selling/upwork-images/`:
   1. `1-cover-answer-with-sources.jpg` (cover)
   2. `2-website-widget.jpg`
   3. `3-honest-fallback.jpg`
   4. `4-under-the-hood.jpg`
   5. `5-mobile.jpg`
2. Web link: https://storeassist-ai.pages.dev
3. Text block, heading "How it works":

> Every question is matched against the store's 15 policy pages, which are stored as embeddings in
> Postgres (pgvector). If the closest match is too weak, the bot replies with the store's contact
> details and never calls the model. Otherwise the model answers using only those passages, cites
> each one, and streams the reply word by word.
>
> What I built in:
> - Protection against prompt-injection attempts and off-topic requests
> - Per-visitor rate limiting and caching of repeat answers (Upstash Redis)
> - Automatic switch from Groq to Gemini if a provider is down
> - An embeddable chat widget (one script tag) that the host site's CSS can't break
> - Around 11 ms of server time per answer, running entirely on free tiers
>
> Try it:
> Live demo: https://storeassist-ai.pages.dev
> Widget on a sample product page: https://storeassist-ai.pages.dev/demo/

4. Later: Loom video (after recording), and the GitHub link once the repo is confirmed public:
   https://github.com/AhsanKhan47/storeassist-ai

## Proposal template

For jobs like "AI chatbot for our website", "train ChatGPT on our documents", "customer support
bot", "RAG". Fill the brackets and keep it under 150 words. Upwork previews the first two lines, so
open with their problem, not with you.

> Hi [name],
>
> You're looking for [their goal in their own words, e.g. "a chatbot that answers customer questions
> from your help docs"]. I recently built one for an online store, and you can try it here:
> https://storeassist-ai.pages.dev
>
> Ask it "Can I return a sale item?" and it answers from the store's policy and shows where the
> answer came from. Ask "Do you sell shoes?" and it tells you it doesn't know instead of making
> something up. Most chatbots get that second part wrong.
>
> For [company], I'd [one or two lines specific to their post: their documents, their platform, the
> integration they mentioned], and add it to your site with a single line of code. Before handing it
> over, I test it against a list of your real customer questions.
>
> Quick question: [a real question about their docs, platform or message volume]?
>
> Ahsan

## Profile line (optional)

"I add AI features to web apps: chatbots that answer from your own documents and show their
sources, plus integrations with OpenAI, Gemini and Groq. Live demo: storeassist-ai.pages.dev"
