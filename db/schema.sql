-- MyBiomarker schema — paste into Supabase SQL Editor (Dashboard → SQL Editor → New query → Run).
-- Safe to re-run: objects are created idempotently and the seed upserts.

-- ============ Tables ============

create table if not exists public.biomarker_types (
  id            serial primary key,
  slug          text unique not null,
  name          text not null,
  short_code    text not null,          -- badge in the markers list ('FG', 'LDL', 'BP'…)
  unit          text not null,
  category      text not null check (category in ('metabolic', 'heart', 'glucose', 'inflammation')),
  has_secondary boolean not null default false,   -- blood pressure: value = systolic, value_2 = diastolic
  ranges        jsonb not null          -- {"primary": [segment…], "secondary": [segment…] | null}
                                        -- segment: {"label": text, "status": "optimal"|"borderline"|"high", "min": num|null, "max": num|null}
);

create table if not exists public.readings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  biomarker_id  int not null references public.biomarker_types (id),
  value         numeric not null check (value > 0),
  value_2       numeric check (value_2 > 0),
  tested_at     date not null,
  source        text,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (user_id, biomarker_id, tested_at)       -- makes CSV re-imports idempotent (upsert)
);

create index if not exists readings_user_marker_date
  on public.readings (user_id, biomarker_id, tested_at desc);

-- ============ Row-Level Security ============
-- Catalog: readable by any signed-in user, writable by no one (seeded here only).
-- Readings: users can only touch their own rows.

alter table public.biomarker_types enable row level security;
drop policy if exists "catalog readable by authenticated" on public.biomarker_types;
create policy "catalog readable by authenticated"
  on public.biomarker_types for select to authenticated using (true);

alter table public.readings enable row level security;
drop policy if exists "users manage own readings" on public.readings;
create policy "users manage own readings"
  on public.readings for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============ AI insights cache (M3) ============
-- One row per (user, scope) for cached generations; scope 'ask' rows accumulate
-- as Q&A history. data_hash ties a cached insight to the readings that produced
-- it — when readings change, the app regenerates and replaces the row.

create table if not exists public.insights (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  scope      text not null,        -- 'bundle' | 'marker:<slug>' | 'ask'
  content    jsonb not null,
  data_hash  text not null,
  created_at timestamptz not null default now()
);

create index if not exists insights_user_scope on public.insights (user_id, scope, created_at desc);

alter table public.insights enable row level security;
drop policy if exists "users manage own insights" on public.insights;
create policy "users manage own insights"
  on public.insights for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============ Seed: marker catalog ============
-- Reference ranges follow ADA (glucose/HbA1c), AHA/ACC (lipids, blood pressure),
-- and AHA/CDC (hs-CRP) published guidance. "Low" glucose is flagged red (hypoglycemia risk).

insert into public.biomarker_types (slug, name, short_code, unit, category, has_secondary, ranges) values
(
  'fasting_glucose', 'Fasting glucose', 'FG', 'mg/dL', 'glucose', false,
  '{"primary": [
    {"label": "Low",          "status": "high",       "min": null, "max": 70},
    {"label": "Optimal 70-100","status": "optimal",   "min": 70,   "max": 100},
    {"label": "Pre-diabetes", "status": "borderline", "min": 100,  "max": 126},
    {"label": "High >126",    "status": "high",       "min": 126,  "max": null}
  ], "secondary": null}'
),
(
  'hba1c', 'HbA1c', 'A1C', '%', 'glucose', false,
  '{"primary": [
    {"label": "Optimal <5.7", "status": "optimal",    "min": null, "max": 5.7},
    {"label": "Pre-diabetes", "status": "borderline", "min": 5.7,  "max": 6.5},
    {"label": "High ≥6.5",    "status": "high",       "min": 6.5,  "max": null}
  ], "secondary": null}'
),
(
  'triglycerides', 'Triglycerides', 'TG', 'mg/dL', 'metabolic', false,
  '{"primary": [
    {"label": "Optimal <150", "status": "optimal",    "min": null, "max": 150},
    {"label": "Borderline",   "status": "borderline", "min": 150,  "max": 200},
    {"label": "High ≥200",    "status": "high",       "min": 200,  "max": null}
  ], "secondary": null}'
),
(
  'ldl', 'LDL cholesterol', 'LDL', 'mg/dL', 'heart', false,
  '{"primary": [
    {"label": "Optimal <100", "status": "optimal",    "min": null, "max": 100},
    {"label": "Borderline",   "status": "borderline", "min": 100,  "max": 160},
    {"label": "High ≥160",    "status": "high",       "min": 160,  "max": null}
  ], "secondary": null}'
),
(
  'hdl', 'HDL cholesterol', 'HDL', 'mg/dL', 'heart', false,
  '{"primary": [
    {"label": "Low <40",      "status": "high",       "min": null, "max": 40},
    {"label": "Borderline",   "status": "borderline", "min": 40,   "max": 60},
    {"label": "Optimal ≥60",  "status": "optimal",    "min": 60,   "max": null}
  ], "secondary": null}'
),
(
  'blood_pressure', 'Blood pressure', 'BP', 'mmHg', 'heart', true,
  '{"primary": [
    {"label": "Optimal <120", "status": "optimal",    "min": null, "max": 120},
    {"label": "Elevated",     "status": "borderline", "min": 120,  "max": 140},
    {"label": "High ≥140",    "status": "high",       "min": 140,  "max": null}
  ], "secondary": [
    {"label": "Optimal <80",  "status": "optimal",    "min": null, "max": 80},
    {"label": "Elevated",     "status": "borderline", "min": 80,   "max": 90},
    {"label": "High ≥90",     "status": "high",       "min": 90,   "max": null}
  ]}'
),
(
  'hs_crp', 'hs-CRP', 'CRP', 'mg/L', 'inflammation', false,
  '{"primary": [
    {"label": "Optimal <1.0", "status": "optimal",    "min": null, "max": 1.0},
    {"label": "Moderate",     "status": "borderline", "min": 1.0,  "max": 3.0},
    {"label": "High >3.0",    "status": "high",       "min": 3.0,  "max": null}
  ], "secondary": null}'
)
on conflict (slug) do update set
  name = excluded.name,
  short_code = excluded.short_code,
  unit = excluded.unit,
  category = excluded.category,
  has_secondary = excluded.has_secondary,
  ranges = excluded.ranges;
