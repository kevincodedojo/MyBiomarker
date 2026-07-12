# MyBiomarker

Track your key biomarkers over time — fasting glucose, cholesterol, blood pressure, HbA1c — and get AI-powered insights into what the numbers mean, with personalized diet and exercise suggestions.

> ⚠️ For informational purposes only — not medical advice.

**Live demo:** [my-biomarker-one.vercel.app](https://my-biomarker-one.vercel.app) · **Full spec:** [spec.md](spec.md) · **Design:** [Figma](https://www.figma.com/design/vlJCAGOeesee9sMzZd3XGc/ashen_MyBiomarker)

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Supabase** — Postgres, auth, Row-Level Security (users can only read their own health data)
- **Claude API** — AI insight generation, server-side only, cached per data snapshot
- **Vercel** — hosting + preview deploys · **GitHub Actions** — lint, typecheck, build on every push

## Architecture

One full-stack Next.js app — React UI and API route handlers in a single deployable, backed by Supabase Postgres and the Claude API. See [spec.md §6](spec.md) for the diagram and the reasoning behind each choice.

## Development

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys
npm run dev                  # http://localhost:3000
```

`npm run lint` · `npm run typecheck` · `npm run build`

## Roadmap

- [x] **M0** — scaffold, design tokens, CI, deploy
- [x] **M1** — auth, marker catalog, log readings, markers list, detail view with trend chart
- [ ] **M2** — health score + category dashboard
- [ ] **M3** — AI insights (Claude), food & exercise suggestions
- [ ] **M4** — CSV import, PWA, desktop layout
- [ ] **M5** — accessibility pass, demo account, polish
