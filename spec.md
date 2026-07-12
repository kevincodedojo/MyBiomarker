# MyBiomarker — Product & Technical Spec

> **Status:** Draft v1 · July 2026
> **Design:** [Figma — ashen_MyBiomarker](https://www.figma.com/design/vlJCAGOeesee9sMzZd3XGc/ashen_MyBiomarker)
> **Goal:** A polished, deployed web app for personal biomarker tracking — built with care for data visualization, responsive design, and accessibility, and shipped on a two-week timeline.

---

## 1. Overview

MyBiomarker empowers individuals to take control of their health by tracking key biomarkers over time. Users log metabolic markers (triglycerides, HDL/LDL cholesterol, fasting glucose, HbA1c), blood pressure readings, and inflammation markers. The app integrates AI-powered analysis to explain what the data means, surface trends, and generate personalized diet and exercise suggestions.

**This is not a medical device.** Every AI-generated screen carries a persistent disclaimer: *"For informational purposes only — not medical advice. Consult a healthcare professional."*

### Target users
- Health-conscious people who get periodic lab work and want their numbers in one place instead of scattered PDFs.
- People managing a specific concern (e.g., borderline cholesterol, pre-diabetes) who want to see whether lifestyle changes are working.

---

## 2. Screens & Behavior (from Figma)

Bottom tab bar on mobile: **Home · Markers · Add · Insights · Profile**
On desktop (≥1024px): tabs become a left sidebar; content areas widen to multi-column.

### 2.1 Home ("Hi, Kevin — Your health overview")
- **Health Score ring** (0–100, e.g. "78"). See §4.2 for the formula.
- **Category cards** (2×2 grid): Metabolic, Heart, Glucose, Inflammation. Each shows a status word (Good / Fair / Needs work), colored dot, and "x/y optimal" count.
- **Recent AI Insight card**: latest generated recommendation, truncated; tapping opens the Insights tab.
- **Quick actions**: `+ Log new biomarker result` (→ Add screen), `Upload lab report (CSV)` (→ CSV import flow).

### 2.2 Markers (All Biomarkers list)
- Filter chips: All / Metabolic / Heart / Glucose (+ Inflammation).
- Each row: icon badge (TG, LDL, BP…), name, latest value + unit, test date, and a status pill — **Optimal** (green), **Borderline** (amber), **High** (red).
- Rows are per **reading**, not per marker (Triglycerides appears once for each test date), ordered oldest-to-newest in the Figma — implement newest-first, confirm with design.
- ⚠️ Figma inconsistency to fix: the Blood pressure row shows "142 **mg/dL**" — BP's unit is **mmHg**, and it should display as systolic/diastolic (e.g. "142/90 mmHg"). The app must render units from the marker catalog, not hard-code mg/dL.

### 2.3 Detail view (e.g., Fasting glucose)
- Large current value ("92 mg/dL") with delta vs. previous test ("▼6% from last test", green when moving toward optimal, red when away).
- Time-range tabs: **1M / 3M / 6M / 1Y / All**.
- **Trend line chart** with the optimal range rendered as a shaded band behind the line.
- **Reference range bar**: segmented Low / Optimal 70–100 / Pre-diabetes / High>126 with the user's current position.
- **AI insight card**: paragraph generated from this marker's history (see §5).
- **History list**: date + value, color-coded by status.

### 2.4 Add entry ("Log biomarker")
Form fields:
| Field | Type | Required | Notes |
|---|---|---|---|
| Biomarker | searchable select | ✅ | from the marker catalog |
| Value | number + unit suffix | ✅ | unit auto-fills from catalog; BP takes systolic/diastolic |
| Date of test | date picker | ✅ | defaults to today, cannot be future |
| Lab/source | text | — | e.g. "Quest Diagnostics" |
| Notes | textarea | — | e.g. "Fasting 12 hours" |

- Primary button **Save result**; secondary **Upload CSV instead**.
- On save: validate → persist → recompute health score → invalidate/regenerate insights → toast + navigate to that marker's Detail view.

### 2.5 Insights (AI insights)
- "Personalized recommendations based on your data."
- Card stack, e.g.:
  - **Alert card** ("Blood pressure trending high") — explains the trend and the risk in plain language.
  - **Food Suggestions** card (e.g. "for Hypertension") with `Learn more >` → **Food Suggestion screen**.
  - **Exercise Plan** card with `Learn more >` → **Exercise Suggestion / Plan screens**.
- **Ask AI a health question** button → free-form Q&A grounded in the user's own data (chat-style, single question/answer to start).

### 2.6 Food Suggestion → Recipe Steps
- **Key Foods to Incorporate** (bolded food group + examples + why, e.g. "Leafy Greens: spinach, kale… high in potassium").
- **Foods to Avoid/Limit** (e.g. "Excessive Sodium: aim for <1500 mg/day").
- **Featured Dish card** (photo + why it fits) → **Recipe Steps screen**: numbered steps (Prep & Marinate, Roast Vegetables, Bake, Serve).

### 2.7 Exercise Suggestion → Exercise Plan
- **General Recommendations**: intensity, consistency, warm-up/cool-down, listen-to-your-body guidance.
- **Exercise Plan** screen: progressive program — *Week 1: Establishing a Consistent Start → Month 1: Consistency and Progression → 3 Months: Maintenance and Progression*, each with an image and description.

### 2.8 Profile
(Not in high-fidelity Figma yet — keep minimal for v1.)
- Display name, email, sign out.
- Units preference (US / SI) — stretch.
- Export my data (CSV download), delete account (hard requirement when storing health data).

---

## 3. Data Model (PostgreSQL)

```
users
  id            uuid PK
  email         text unique
  display_name  text
  created_at    timestamptz

biomarker_types            -- seeded catalog, not user-editable
  id            serial PK
  slug          text unique      -- 'fasting_glucose', 'ldl', 'bp' …
  name          text             -- 'Fasting glucose'
  short_code    text             -- 'TG', 'LDL', 'BP' (list badge)
  unit          text             -- 'mg/dL', '%', 'mmHg'
  category      text             -- 'metabolic' | 'heart' | 'glucose' | 'inflammation'
  has_secondary boolean          -- true for blood pressure (diastolic)
  ranges        jsonb            -- ordered segments: [{label,'min','max','status'}]

readings
  id            uuid PK
  user_id       uuid FK → users
  biomarker_id  int  FK → biomarker_types
  value         numeric
  value_2       numeric NULL     -- diastolic for BP
  tested_at     date
  source        text NULL        -- 'Quest Diagnostics'
  notes         text NULL
  created_at    timestamptz
  UNIQUE (user_id, biomarker_id, tested_at)   -- idempotent CSV re-imports

insights                   -- cached AI output (regenerate on new data)
  id            uuid PK
  user_id       uuid FK
  scope         text             -- 'overview' | 'marker:<slug>' | 'food' | 'exercise'
  content       jsonb            -- structured sections, not raw prose
  data_hash     text             -- hash of the readings that produced it
  created_at    timestamptz
```

### Seed catalog & reference ranges (v1)

| Marker | Unit | Optimal | Borderline | High | Category |
|---|---|---|---|---|---|
| Fasting glucose | mg/dL | 70–100 | 100–126 (pre-diabetes) | >126 | Glucose |
| HbA1c | % | <5.7 | 5.7–6.4 | ≥6.5 | Glucose |
| Triglycerides | mg/dL | <150 | 150–199 | ≥200 | Metabolic |
| LDL cholesterol | mg/dL | <100 | 100–159 | ≥160 | Heart |
| HDL cholesterol | mg/dL | ≥60 | 40–59 | <40 | Heart |
| Blood pressure | mmHg | <120/80 | 120–139 systolic | ≥140/90 | Heart |
| hs-CRP | mg/L | <1.0 | 1.0–3.0 | >3.0 | Inflammation |

Ranges live in the DB (`biomarker_types.ranges`), not in code, so adding a marker never requires a deploy. Cite sources (AHA/ADA) in the seed file comments.

---

## 4. Core Logic

### 4.1 Status classification
A reading's status = the range segment its value falls in: `optimal | borderline | high` (for HDL, "low" maps to the red status). BP uses the worse of systolic/diastolic classification.

### 4.2 Health Score (0–100)
Computed from each marker's **latest** reading only:

```
marker_score  = optimal → 1.0, borderline → 0.5, high/low → 0.0
category_pct  = mean(marker_scores in category)      → drives category card
health_score  = round(100 × mean(all marker_scores))
```

Category label thresholds: **Good** ≥ 0.75 · **Fair** 0.50–0.74 · **Needs work** < 0.50.
Markers never logged are excluded (score reflects only what the user tracks). Show "x/y optimal" as count of optimal latest readings over tracked markers in that category.

*Keep this deterministic and unit-tested — pure-function logic that's easy to verify and reason about.*

### 4.3 Trend / delta
- Detail-view delta: `(latest − previous) / previous`, arrow colored by whether the change moves **toward** the optimal range (green) or away (red) — not simply up/down.
- "Trending high" alert (Insights): fire when a marker's last 3 readings all sit in borderline/high (matches the Figma copy: *"Your systolic BP has been above 130 mmHg for the last 3 readings"*) **or** the last 3 readings are monotonically worsening.

### 4.4 CSV import
Accepted columns (header row required, case-insensitive):
```
biomarker, value, value_2 (optional), unit (optional), date, lab (optional), notes (optional)
```
- Parse client-side (PapaParse) → show a **preview table** with per-row validation (unknown marker, bad date, out-of-plausible-range value) → user confirms → POST in one batch.
- Server re-validates every row; duplicate `(marker, date)` rows update instead of duplicate (upsert on the unique constraint).
- Provide a downloadable template CSV.

---

## 5. AI Integration

**Provider:** Claude API (`claude-sonnet-5`), called **only from the server** — the API key never reaches the browser.

| Insight scope | Trigger | Input to model | Output shape (JSON) |
|---|---|---|---|
| Overview (Home card) | new reading saved | latest reading + 90-day history summary per marker | `{headline, body}` |
| Marker insight (Detail) | viewing detail w/ stale cache | that marker's full history + reference ranges | `{trend_summary, recommendation, retest_window}` |
| Food suggestions | high/borderline marker exists | worst-status markers + categories | `{condition, key_foods[], avoid[], featured_dish{name, why, steps[]}}` |
| Exercise plan | same | same + self-reported activity level (stretch) | `{general_recs[], plan:{week1, month1, month3}}` |
| Ask AI a question | user submits question | question + compact snapshot of user's latest readings | `{answer, disclaimer}` |

**Rules:**
- Prompt instructs the model to return **structured JSON** matching a zod schema; validate before storing. On schema failure, retry once, then show a fallback card.
- **Cache** results in `insights` keyed by `data_hash` — never re-call the API when data hasn't changed (cost + latency).
- System prompt hard-codes safety behavior: educational tone, no diagnoses, no medication advice, always recommend consulting a professional, refuse emergencies with "seek immediate care" guidance.
- Rate-limit "Ask AI" per user (e.g. 20/day).

---

## 6. Architecture

### 6.1 Decision: one full-stack app, not microservices

A solo project at this scale should be **one Next.js application** — frontend, API routes, and DB access in a single deployable. Splitting backend/frontend into separate services adds CORS, auth-token plumbing, two deploys, and two repos of overhead with no benefit at this size. The "services" are **logical modules** inside one app:

```
┌─────────────────────────────────────────────┐
│  Next.js (Vercel)                           │
│                                             │
│  React UI (App Router, RSC + client comps)  │
│  ├─ /            Home dashboard             │
│  ├─ /markers     list + /markers/[slug]     │
│  ├─ /add         log form + CSV import      │
│  ├─ /insights    AI cards + food/exercise   │
│  └─ /profile                                │
│                                             │
│  API routes (route handlers)                │
│  ├─ auth        (Supabase Auth helpers)     │
│  ├─ readings    CRUD + batch import         │
│  ├─ score       computed server-side        │
│  └─ insights    → Claude API (server-only)  │
└──────────────┬──────────────────────────────┘
               │
   ┌───────────┴───────────┐        ┌─────────────┐
   │  Supabase             │        │ Claude API  │
   │  Postgres + Auth + RLS│        │ (Anthropic) │
   └───────────────────────┘        └─────────────┘
```

### 6.2 Stack choices & rationale

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router) + TypeScript** | Industry-standard React stack; server components keep data fetching close to the DB |
| Styling | **Tailwind CSS** + CSS variables for the design tokens | Fast to match the Figma dark theme; industry-standard |
| Charts | **Recharts** (or visx if you want to show more depth) | Trend chart + reference band is the visual centerpiece |
| State/data | **TanStack Query** | Caching, optimistic add-entry, loading/error states done right |
| Forms | **react-hook-form + zod** | Shared zod schemas validate on client *and* server |
| DB + Auth | **Supabase** (hosted Postgres, Row-Level Security, email/OAuth auth) | Real relational DB with zero ops; RLS enforces "users can only read their own health data" at the database layer |
| ORM | Supabase client, or **Drizzle** if you want typed SQL to talk about | |
| AI | **Claude API**, server-side only | |
| Hosting | **Vercel** free tier | Push-to-deploy, preview URLs on PRs |
| Testing | **Vitest + React Testing Library** (units: score, status, CSV parse) + **Playwright** (1–2 happy-path E2E) | Keeps the core logic honest as features stack up |
| CI | **GitHub Actions**: lint, typecheck, test on every PR | Catches regressions before they deploy |

**Why Postgres over MongoDB/SQLite:** readings are classic relational time-series (user → marker → readings) with a shared catalog and range lookups; SQL aggregation drives the score and trends. Supabase's free tier removes any ops burden, and RLS gives per-user data isolation enforced by the database itself.

### 6.3 Cross-device strategy

**One responsive web app + PWA** — not React Native, not a separate mobile codebase.

- The Figma is mobile-first (402×874). Build mobile layout exactly to spec; at `lg:` breakpoint swap bottom tab bar → left sidebar, and let Home/Markers use 2-column grids.
- Breakpoints: base (mobile ≤640), `md` 768 (tablet), `lg` 1024+ (desktop).
- **PWA**: manifest + service worker (installable on a phone home screen, app icon, splash). Cache the shell and last-fetched readings for offline read-only viewing. This is the honest answer to "works on computer and phone" with one codebase.
- Native app is explicitly **out of scope** for v1.

### 6.4 Security & privacy (health data!)
- All tables behind Supabase RLS: `user_id = auth.uid()`.
- Claude API key, DB service key: server env vars only.
- HTTPS everywhere (Vercel default). No health values in URLs or analytics events.
- Account deletion actually deletes readings + insights.
- Demo mode: a seeded read-only demo account so visitors can explore without signing up — **make this a login-page button.**

---

## 7. Repository Strategy (GitHub)

**One repository. Not an org/Project with multiple repos.**

Reasons:
1. Frontend + API live in one Next.js app — there's nothing to split.
2. One repo = one README, one commit history, one live-demo link — anyone exploring the project sees the whole picture in one place.
3. One CI pipeline, one issue tracker, atomic PRs that touch UI + API together.

```
mybiomarker/
├── README.md              ← screenshots, live demo link, stack, architecture diagram
├── spec.md                ← this file
├── .github/workflows/ci.yml
├── app/                   ← Next.js routes (pages + API route handlers)
├── components/            ← UI components (charts, cards, nav, forms)
├── lib/                   ← score.ts, status.ts, csv.ts, ai/ (pure logic — unit-tested)
├── db/                    ← schema, migrations, seed (marker catalog + demo data)
├── tests/                 ← unit + e2e
└── public/                ← PWA manifest, icons
```

Suggested workflow: GitHub Issues for features → short-lived branches → PRs (self-merged is fine) with descriptions → CI green → Vercel preview → merge. Use **GitHub Projects (the board)** on this single repo for the roadmap if you want planning visibility — that's different from creating multiple repos.

---

## 8. Timeline (two-week build: July 12–25, 2026)

| Day | Date | Phase | Deliverable |
|---|---|---|---|
| 1 | Sat Jul 12 | **M0 ✓** | Scaffold, design tokens, CI, Supabase project, Vercel deploy |
| 2 | Sun Jul 13 | **M1** | DB schema + RLS policies + seeded marker catalog; email auth with protected routes |
| 3 | Mon Jul 14 | M1 | Add-entry form: validation, unit auto-fill, BP systolic/diastolic |
| 4 | Tue Jul 15 | M1 | Markers list: filter chips, status pills, empty state |
| 5 | Wed Jul 16 | M1 | Detail view: trend chart with optimal band, reference bar, history list |
| 6 | Thu Jul 17 | M1 | Status-logic unit tests; buffer for anything that slipped. **App is demoable.** |
| 7 | Fri Jul 18 | **M2** | Health score + category math (unit-tested) |
| 8 | Sat Jul 19 | M2 | Home dashboard wired to real data |
| 9 | Sun Jul 20 | **M3** | Claude insight route handler + `insights` cache table |
| 10 | Mon Jul 21 | M3 | Insights tab with alert/food/exercise cards |
| 11 | Tue Jul 22 | M3 | Food/recipe/exercise detail screens; Ask AI question box |
| 12 | Wed Jul 23 | **M4** | CSV import: template, preview table, batch upsert |
| 13 | Thu Jul 24 | M4 | PWA manifest + offline shell; desktop sidebar layout |
| 14 | Fri Jul 25 | **M5** | Accessibility pass, Lighthouse ≥ 90, seeded demo account, README screenshots. **Freeze.** |

Scope-cut order if behind (cut from the bottom): Ask AI chat → PWA offline → CSV import → exercise plan screens. Never cut: core loop (M1) + score (M2), one polished AI insight, tests, live demo. Anything cut moves to a post-freeze backlog rather than delaying the two-week ship.

---

## 9. Out of Scope (v1)
- Native iOS/Android apps; Apple Health / Google Fit sync
- Real CGM device integration (mentioned in thesis; model the data type, skip the hardware)
- OCR/PDF lab-report parsing (CSV only; PDF parsing is a great v2 story)
- Sharing data with doctors/family; multi-user households
- Notifications/reminders
- HIPAA compliance (personal project, self-entered data, clear disclaimers)

## 10. Success Criteria
- Deployed URL anyone can open on phone **or** laptop and explore via demo account in <30s
- Matches the Figma design closely on mobile; intentional desktop adaptation
- Lighthouse: Performance/Accessibility/Best-Practices ≥ 90
- Meaningful test suite runs in CI (score logic, status classification, CSV validation, 1–2 E2E flows)
- README that explains the architecture decisions and the reasoning behind them
