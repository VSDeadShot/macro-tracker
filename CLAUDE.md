@AGENTS.md

# Macro Tracker

An AI-powered, mobile-first PWA: photograph a meal, Gemini Vision estimates macros, user reviews/edits, entry is saved and tracked against daily targets.

## Tech Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- Prisma ORM (v7, `@prisma/adapter-pg` driver adapter over `pg.Pool`) + PostgreSQL via Supabase
- Supabase Auth (`@supabase/ssr`) — Google OAuth
- Google Gemini Vision (`@google/generative-ai`) for food photo analysis — model is `gemini-3.1-flash-lite` (see `src/app/api/analyze/route.ts`), the deliberate choice since the integration was first added; README now matches
- Recharts for the weekly protein trend chart
- date-fns + date-fns-tz — all "day" boundaries (streaks, daily totals) are computed in IST, not UTC or local
- PWA: static `public/manifest.json` + `public/sw.js` service worker (network-first for `/api/meals`, `/api/targets`, `/api/templates`), custom install-prompt component (`InstallPWA.tsx`) since Safari doesn't fire `beforeinstallprompt`

⚠️ This repo pins a Next.js version ahead of typical training data (16.2.10) — per `AGENTS.md`, check `node_modules/next/dist/docs/` before relying on App Router APIs/conventions from memory, and heed any deprecation notices found there.

## Architecture
Photo captured on device (native `<input capture="environment">`, no custom camera UI) → base64 posted to `/api/analyze` → route calls Gemini Vision server-side with a structured JSON-only prompt → returns `{ foodName, ingredients, calories, protein, carbs, fats, confidence }` → user reviews/edits the estimate in the UI → confirmed entry POSTed to `/api/meals` → Prisma writes to Supabase Postgres, scoped to the authenticated user → dashboard (`src/app/page.tsx`) shows running totals, streak, and weekly trend against `DailyTarget`.

Mobile photos are compressed client-side via Canvas (max 1024px, 70% JPEG) before upload, to avoid multi-MB camera captures crashing mobile browsers or blowing up the Gemini payload.

## Folder Structure (actual, `src/`)
```
src/
├── app/
│   ├── api/{analyze,meals,targets,templates}/route.ts
│   ├── auth/callback/route.ts
│   ├── login/page.tsx
│   ├── log/page.tsx        — camera capture + review flow
│   ├── settings/page.tsx   — macro target calculator (Mifflin-St Jeor)
│   ├── page.tsx            — dashboard (totals, streak, trend chart)
│   └── middleware.ts is at src/middleware.ts (not app/), gates all routes except _next/static, api, manifest.json, sw.js, and static image assets
├── components/
│   ├── CameraCapture.tsx, InstallPWA.tsx, MealCard.tsx, StreakCard.tsx, WeeklyProteinChart.tsx
└── lib/
    ├── prisma.ts           — singleton PrismaClient over pg Pool + PrismaPg adapter, cached on `global` outside production
    ├── supabase-server.ts  — createSupabaseServerClient() for Server Components/routes (cookie-based)
    └── supabase-browser.ts — client-side Supabase client
```
Path alias: `@/*` → `src/*`.

## Conventions
- API routes live in `/api` — currently `analyze`, `meals`, `targets`, and `templates` (the last was added after the original spec; the other three match it)
- Reusable clients are meant to live in `/lib` — but the code has drifted from the documented convention (`gemini.ts`, `supabase.ts`, `prisma.ts`): there is no `lib/gemini.ts` (the Gemini client is instantiated inline in `src/app/api/analyze/route.ts`) and no single `lib/supabase.ts` (split into `supabase-server.ts` and `supabase-browser.ts` instead). Follow what the code actually does, not the original doc, unless told otherwise
- Camera capture uses the native HTML `capture="environment"` input, not a custom camera UI
- API routes: auth check first (`createSupabaseServerClient()` → `auth.getUser()` → 401 if none), then validate body, then Prisma call scoped by `user_id`, wrapped in try/catch logging to `console.error` and returning a JSON `{ error }` with an appropriate status
- Styling is a custom dark theme in Tailwind; no component library

## Do Not
- Don't skip the review/edit step before saving a meal — Gemini's macro estimates are approximate, and unreviewed data isn't trustworthy
- Don't call the Gemini Vision API from the client — the API key stays server-side only, always routed through the Next.js API route (`/api/analyze`)
- Don't try to make macro estimates clinically precise — this is a helpful estimate tool, not a certified nutrition app
- Never commit or push notes/handoff/scratch files (e.g. anything like `AI_HANDOFF.md`, scratch planning docs) to the repo

## Project-level docs
- `../AGENTS_MacroTracker.md` and `../AI_Macro_Tracker.md` (one directory above this repo, outside git) hold the original project rules, product spec, and phase plan — useful for "why," but the code here is ahead of those docs in places (e.g. templates, streaks, calculator, PWA are all built even though some are listed as "Phase 2"), and has drifted from them in others (see the `/lib` naming note above)
- `AGENTS.md` in this repo root is just the generic Next.js-version-warning stub, not project rules

## Workflow rules
- Explain/propose the plan for each step before writing any code, and wait for my local review before starting the next one
- Only commit/push after I explicitly approve — never commit or push on your own initiative
- Build and test one feature at a time — don't batch multiple features into a single commit
- Once a feature works and is confirmed, commit and push it before starting the next feature
