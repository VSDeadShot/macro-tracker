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

## Backlog
Known issues and deferred work, as of 2026-10-02. Each is its own future task — don't fold them into unrelated changes.

- **Review-screen progress bug** (`src/app/log/page.tsx`, `useEffect`): the "today so far" progress on the review screen never loads. It fetches `GET /api/meals`, but that route only exports `POST`/`DELETE`, so it returns 405 (browser console: "Unexpected end of JSON input"). It also filters on `created_at` (the field is `logged_at`) and uses local time (`toDateString()`) instead of IST like the dashboard.
- **Template macro-validation gap** (`POST /api/templates`): macros go through `Number(x) || 0`, so `"abc"`, `""`, `null` and NaN are silently saved as 0; negatives, huge values and `Infinity` are accepted; `name`/`food_items` aren't trimmed or length-limited. `POST /api/meals` validates via `parseMealInput` (`src/lib/meal-input.ts`), so a template holding bad data now gets a 400 when quick-logged — and `handleQuickLog` only shows a generic "Failed to quick log meal." (`saveErrorMessage` in `src/lib/meal-form.ts` could surface the 400 message).
- **Supabase `rls_auto_enable` warning**: Security Advisor flags `public.rls_auto_enable()` as a `SECURITY DEFINER` function executable by `anon`/`authenticated`. Decided not to change it yet. For context: "RLS enabled, no policy" on `DailyTarget`, `Meal`, `MealTemplate` is intended (the anon key has no access; Prisma bypasses RLS and is the only data path), and "leaked password protection off" doesn't apply (Google OAuth only).
- **`middleware.ts` → `proxy.ts` rename**: `next dev` warns that the `middleware` file convention is deprecated in Next.js 16 and renamed to `proxy` (see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`; proxy defaults to the Node.js runtime).
- **Lint fails on 13 old problems** (12 errors, 1 warning — mostly `no-explicit-any`): `src/app/log/page.tsx` (4× `no-explicit-any`), `src/app/page.tsx` (`prefer-const`, unused `calPercent`, unescaped `'`), `src/components/InstallPWA.tsx` (4× `no-explicit-any`, `set-state-in-effect`), `src/components/WeeklyProteinChart.tsx` (1× `no-explicit-any`). All predate the photo-less logging work; new code is lint-clean.
- **Text-description meal estimate (deferred)**: photo-less logging option (c) — manual entry shipped in `a1ac5c3`; the text half is deferred: move the Gemini client and estimate parsing into `src/lib/gemini.ts` (with tests); add `POST /api/analyze-text` (auth required, description length limit, generic errors, quota errors pointing users to manual entry; not under `/api/meals`, since `sw.js` routes that path through its cache); add a "describe your meal" input that prefills the review screen and falls back to manual entry if Gemini fails; then update docs.
