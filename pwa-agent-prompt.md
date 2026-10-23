# Agent Prompt: Offline-First Daily Budget PWA (build, test, deploy to Netlify)

You are a senior frontend engineer, mobile-first UI/UX designer and software architect. Build a complete, working, installable Android PWA that lets me set a monthly budget, record daily expenses, and see how much I can spend each remaining day. It is a real app, not a prototype. Work through the phases below in order. At the end of each phase, run the checks listed, fix failures, commit to git, and print a short status before continuing. Do not skip ahead, and do not leave placeholder screens or buttons that do nothing.

## Fixed decisions

- **Stack:** React, TypeScript (strict), Vite, Dexie over IndexedDB, vite-plugin-pwa, Vitest, lucide-react icons (bundled, no CDN), plain CSS (CSS variables, no UI framework). No other runtime dependencies without a written reason.
- **No backend,** accounts, analytics, cookies, remote fonts, remote icons or any network call at runtime. Use system fonts.
- **Currency:** Pakistani rupees. Store every amount as an **integer number of paisa** (Rs 1 = 100 paisa). Format as `Rs 645.16` using `en-PK`. Parse user input with a string-based parser (never `parseFloat * 100`).
- **Dates:** local calendar dates stored as `YYYY-MM-DD` strings. Never use `toISOString()` or UTC for calendar dates. Create one `dates.ts` utility (today, add days, days in month, month key `YYYY-MM`, weekday labels) and use it everywhere.
- **Language/UX:** English UI, mobile-first (360px width as baseline), touch targets at least 44px, light and dark themes via `prefers-color-scheme`, default look is dark navy and neutral with one restrained accent. Status must never rely on color alone (use icons and words such as "Over by").

## Project structure

```
src/
  domain/    types.ts  money.ts  dates.ts  budget.ts  validation.ts  backup.ts
  data/      db.ts  repository.ts
  state/     useBudgetData.ts   (loads from Dexie, exposes actions, recomputes derived values)
  components/ (Dashboard, StatCard, MonthProgress, ExpenseList, ExpenseSheet, DayView, History, Settings, ConfirmDialog, Toast, EmptyState, InstallPrompt, BottomNav)
  App.tsx  main.tsx  styles.css
tests/       budget.test.ts  money.test.ts  validation.test.ts  backup.test.ts
public/      icons (generated), robots.txt
netlify.toml  README.md
```

All budget formulas live only in `domain/budget.ts`. React components must never contain budget math.

## Phase 0: Scaffold

1. Create the Vite React-TS project, install dependencies, enable `strict`, `noUncheckedIndexedAccess`, ESLint.
2. Add scripts: `dev`, `build`, `preview`, `test`, `typecheck`.
3. Configure vite-plugin-pwa (`registerType: 'prompt'`, `injectRegister: 'auto'`, workbox precaching of the app shell and static assets only; no runtime caching of any data; `navigateFallback: '/index.html'`).
4. Manifest: name "Daily Budget", short_name "Budget", `display: standalone`, `start_url: "/"`, `scope: "/"`, `theme_color` and `background_color` matching the navy palette, icons 192, 512 and a maskable 512.
5. Generate icons locally with a script (for example `sharp` as a dev dependency, or an SVG converted at build time). The icon is a simple wallet or rupee mark. Do not download anything.

**Check:** `npm run build` succeeds, and `npm run preview` shows a manifest and registered service worker in the browser devtools. Commit.

## Phase 1: Domain layer (money, dates, validation, budget calculation) with tests

### money.ts
- `parseRupees(input: string): number | null`: accepts digits with optional commas and up to 2 decimals, max 9 integer digits; rejects empty, negative, zero, scientific notation, letters, and more than 2 decimals. Returns paisa.
- `formatRs(paisa: number): string` including negatives and thousands grouping.
- `splitEvenly(total, parts)`: returns integer shares that sum exactly to `total` (the first `total % parts` shares get one extra paisa).

### budget.ts: the single source of truth
Inputs: a monthly budget record `{ month, amount, rule }`, the list of that month's expenses, and a target date. Output a `DayBudget` object with: `allowanceAtStart`, `spentThatDay`, `remainingAllowance` (can be negative), `overspendToday`, `availableNow` (never negative), `monthSpentTotal`, `monthRemaining` (can be negative), `monthOverspend`, `isProjection`, `daysRemainingInclusive`.

Definitions (B = budget, D = days in month, d = day number, spentBefore = sum of expenses dated before the target date, spentToday = sum on the target date):

- **Flexible (default):** `allowanceAtStart = max(0, floor((B - spentBefore) / (D - d + 1)))`. On the last day the divisor is 1, so the remaining paisa are fully reconciled and no money is lost to rounding.
- **Fixed:** `base = floor(B / D)` and the first `B % D` days get +1 paisa, so allowances sum exactly to B. Unused money does not carry and overspend does not reduce later nominal allowances.
- `remainingAllowance = allowanceAtStart - spentToday`.
- `availableNow = max(0, min(remainingAllowance, B - spentBefore - spentToday))`. This ensures that with the fixed rule a positive nominal allowance is never shown as available once the monthly budget is exhausted.
- `monthRemaining = B - totalMonthSpent`. `monthOverspend = max(0, -monthRemaining)` and must be shown explicitly.
- **Future dates:** same formula using only expenses already recorded before that date; flag `isProjection = true`. **Past dates:** use only expenses before that date, so the historical allowance is reproducible. Never create records automatically.
- The result must be deterministic and based on stored paisa, never on rounded display values.

### Required unit tests (must all pass)
1. Rs 20,000, 31 days, flexible, day 1: allowance is 64516 paisa (Rs 645.16).
2. Spend Rs 400 on day 1: day 2 allowance is Rs 19,600 / 30 = Rs 653.33.
3. Spend Rs 800 on day 1: day 2 allowance is Rs 640.00.
4. Fixed rule: allowances across all days of the month sum exactly to the budget; unused money never changes later days.
5. Fixed rule with budget exhausted but nominal allowance positive: `availableNow` is 0 and `monthOverspend` is shown when applicable.
6. Overspend beyond the monthly budget: `monthRemaining` is negative, `availableNow` is 0, no reset.
7. Last day of month reconciles to the exact remaining paisa.
8. February in leap and non-leap years; 30 and 31 day months.
9. Editing or deleting an old expense changes all later allowances correctly.
10. Future date yields a projection flag; past date ignores expenses after it.
11. `parseRupees` rejects `-5`, `0`, `1e3`, `abc`, `1.234`, empty, 10+ digits; accepts `450`, `1,250.5`.
12. `splitEvenly` always sums to the total.

**Check:** `npm test` all green, `npm run typecheck` clean. Commit.

## Phase 2: Data layer

- Dexie database `daily-budget` version 1 with tables `budgets` (key `month`), `expenses` (key `id`, indexes `date`, `[date+createdAt]`) and `meta` (key-value: schema version, install-hint dismissed).
- Types: `MonthlyBudget { month, amount, rule: 'flex'|'fixed', createdAt, updatedAt }`, `Expense { id (crypto.randomUUID), date, amount, description?, category?, createdAt, updatedAt }`.
- Repository functions: create, update and delete expense (transactional), get expenses by date and by month, get and put budget, list budgets, export all, import (replace or merge), clear all.
- Derived values are never stored. Request persistent storage with `navigator.storage.persist()` after the first saved expense and show the result in Settings.
- Add a Dexie version-migration scaffold so future schema changes cannot wipe data. Service worker updates must never touch IndexedDB.

**Check:** write repository tests with `fake-indexeddb` covering create, update, delete, by-month queries and atomic import. Commit.

## Phase 3: Core UI: dashboard, add expense, day view

### Dashboard (primary screen, no excessive scrolling)
- Header: app name, current date with weekday, month and year, month navigation, settings entry.
- Date navigation ("‹ date ›" plus a "Today" button) selecting which day the cards describe.
- Cards: **Today's Expenses** (with total and a view-entries action), **Yesterday's Expenses** (tap to open that day), and a large **Available to Spend Today** card showing allowance at start, spent so far, and remaining or "Over by Rs X". Label as "Projection" for future dates.
- **Monthly Remaining** card with progress bar, budget, spent, remaining, and an explicit "Over budget by Rs X" state.
- Compact summary (average daily spend so far, days left), prominent Add Expense button, and a useful empty state for new users and for months without a budget.
- First run: guided setup asking for monthly budget, month (default current) and rule (flexible preselected).

### Add / edit expense sheet (bottom sheet)
- Toggle between **One total for the day** and **Multiple expenses** with a running total. Fields: amount, optional description, date (defaults to selected date). Optional categories only if they stay simple (a small fixed list).
- Validate with clear short messages; block double submit; saving multiple entries never overwrites existing ones; large values handled safely.
- After saving, every figure updates immediately without reload, and a toast confirms.

### Day view
- Date with weekday, total, entries with amount and description, allowance, remaining or overspend. Add, edit and delete entries; delete needs a confirmation dialog.

**Check:** component tests (React Testing Library) for add, edit, delete and dashboard recalculation. Manually test in a 360px viewport. Commit.

## Phase 4: History, settings, backup

- **History:** current month by default, rows per date with weekday, total, allowance and remaining or overspend; tap opens day view; previous, next and "current month" controls; monthly totals; empty state; future months show projections only.
- **Settings:** view and edit the selected month's budget and rule (explain that changes keep all expenses and affect calculations for that month only), monthly budget history with spent amounts, storage persistence status, install help, reset all data with a clear typed confirmation.
- **Export:** JSON file `daily-budget-backup-YYYY-MM-DD.json` containing `{ app, schemaVersion, exportedAt, budgets, expenses }`, downloaded through a Blob link. Also CSV export of the selected month's expenses.
- **Import:** choose a file, validate structure, schema version, dates, integer paisa amounts, IDs and duplicates, show a summary, then offer **Merge (keep existing, skip duplicate IDs)** or **Replace all (confirmed)**. The import runs in one transaction; an invalid file must leave existing data untouched.
- Tests for backup validation (valid, malformed, duplicate IDs, wrong version, negative amounts).

**Check:** export, wipe, import round trip restores identical data. Commit.

## Phase 5: PWA hardening

- Install flow: capture `beforeinstallprompt` and show an Install button when available; otherwise show short Android Chrome instructions ("⋮ menu, Install app").
- Update flow: when a new service worker is waiting, show a non-blocking "Update available, reload" toast. Never auto-reload while an expense sheet is open.
- Offline: verify in devtools (Offline mode) that the installed app loads and all features work. No network requests on load other than same-origin assets.
- Lighthouse PWA and accessibility checks on mobile emulation; fix issues (contrast, labels, focus, `aria-live` for toasts, reduced motion).
- Add a short privacy note in Settings: all data stays on this device.

**Check:** production build, then `npm run preview`, test offline. Commit.

## Phase 6: Deploy to Netlify

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/manifest.webmanifest"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

Then deploy using the first method that works:

1. **Netlify CLI:** run `npx netlify-cli login` (this opens a browser; pause and ask me to complete login if you cannot), then `npx netlify-cli init` or `sites:create`, then `npx netlify-cli deploy --build --prod`. Print the final HTTPS URL.
2. **GitHub:** if CLI login is impossible, push the repo to GitHub and give me exact steps to import it in Netlify (build command `npm run build`, publish directory `dist`).
3. **Manual:** run `npm run build` and give me steps to drag the `dist` folder onto app.netlify.com/drop.

Never ask me for passwords or tokens in chat; if a token is required, tell me where to set it as an environment variable.

**Check:** open the deployed HTTPS URL in a desktop Chrome, confirm the manifest and service worker, then provide the URL.

## Phase 7: README and handover

Write `README.md` covering: what the app does, the calculation rules with the worked examples above, project structure, scripts, how to run tests, how to deploy to Netlify, and **Android installation**: open the HTTPS URL in Chrome on the phone (internet needed once), use the install prompt or menu "Install app", open from the home screen, then test by switching on airplane mode. State plainly that localhost development does not install an app on a phone, that clearing browser data or uninstalling can erase records, and that the user should export a backup regularly.

## Definition of done

- All unit and component tests pass; typecheck and lint are clean; production build succeeds.
- The deployed site installs on Android Chrome and works fully offline after the first load.
- Adding, editing and deleting expenses updates every figure instantly and survives closing the app and restarting the phone.
- Backup export and import round trip works and invalid files cannot corrupt data.
- No remote requests, trackers or fake data exist anywhere.

Finish with a summary listing: the live URL, what was built, test results, any deviations from this prompt with reasons, and anything I must do manually.
