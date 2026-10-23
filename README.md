# Daily Budget: Offline-First Daily Budget PWA

**Daily Budget** is a privacy-first, offline-first Progressive Web Application (PWA) built for Android Chrome and mobile browsers. It allows you to set a monthly budget in Pakistani Rupees (PKR), track daily expenses, and dynamically calculate how much money you can spend each remaining day of the month without losing a single paisa.

---

## Key Features

- **100% Offline-First:** Runs entirely locally in your browser using Dexie over IndexedDB. No backend servers, accounts, analytics, remote fonts, or network tracking.
- **Precision Currency (PKR):** All amounts are stored as integer numbers of **paisa** (Rs 1 = 100 paisa) using string-based decimal parsing to eliminate floating-point rounding errors. Formatted cleanly with `en-PK` locale.
- **Local Calendar Math:** Calendar dates are strictly formatted as `YYYY-MM-DD` using local time (never UTC/`toISOString()` shifts).
- **Flexible & Fixed Budget Calculations:**
  - **Flexible Rule (Default):** Dynamically redistributes remaining monthly funds across all remaining days. Saving today increases future daily allowances; spending more lowers future allowances smoothly.
  - **Fixed Rule:** Calculates nominal equal daily allowances that sum exactly to your monthly budget.
- **One Total or Itemized Entries:** Record single daily totals or multiple itemized expenses with real-time running totals.
- **Month Progress & History:** View progress bar, spent percentages, daily breakdown rows, and projections for future dates.
- **Safe Backup & Restore:** Export and import full JSON backups (with transactional Merge or Replace modes) and CSV exports.
- **Installable PWA:** Native Android installation prompt with standalone window, maskable icons, and service worker shell caching.

---

## Budget Calculation Formulas & Worked Examples

All budget math resides solely in [`src/domain/budget.ts`](file:///f:/Learning/budget_planner/src/domain/budget.ts).

### Variables:
- $B$: Monthly budget in integer paisa (e.g. Rs 20,000 = `2,000,000` paisa).
- $D$: Total number of days in the month (e.g. 31 in January, 28/29 in February, 30 in April).
- $d$: Target day number (1-indexed, $1 \dots D$).
- $\text{daysRemainingInclusive} = D - d + 1$.
- $\text{spentBefore}$: Sum of expenses dated before the target date in that month.
- $\text{spentToday}$: Sum of expenses on the target date.
- $\text{totalMonthSpent}$: Total sum of expenses across the entire month.

### 1. Flexible Rule (Default):
$$\text{allowanceAtStart} = \max\left(0, \left\lfloor \frac{B - \text{spentBefore}}{D - d + 1} \right\rfloor\right)$$

- On the final day of the month ($d = D$), the divisor is $1$, so all remaining unspent paisa are fully reconciled with zero rounding loss.
- $\text{remainingAllowance} = \text{allowanceAtStart} - \text{spentToday}$.
- $\text{availableNow} = \max\left(0, \min\left(\text{remainingAllowance}, B - \text{spentBefore} - \text{spentToday}\right)\right)$.

#### Worked Examples:
1. **Rs 20,000, 31-day month, Day 1:**
   $$\text{allowanceAtStart} = \left\lfloor \frac{2,000,000}{31} \right\rfloor = 64,516\text{ paisa} = \mathbf{Rs\ 645.16}$$
2. **Spend Rs 400 on Day 1, Day 2 Allowance:**
   $$\text{Remaining} = 2,000,000 - 40,000 = 1,960,000\text{ paisa (Rs 19,600)}$$
   $$\text{allowanceAtStart} = \left\lfloor \frac{1,960,000}{30} \right\rfloor = 65,333\text{ paisa} = \mathbf{Rs\ 653.33}$$
3. **Spend Rs 800 on Day 1, Day 2 Allowance:**
   $$\text{Remaining} = 2,000,000 - 80,000 = 1,920,000\text{ paisa (Rs 19,200)}$$
   $$\text{allowanceAtStart} = \left\lfloor \frac{1,920,000}{30} \right\rfloor = 64,000\text{ paisa} = \mathbf{Rs\ 640.00}$$

### 2. Fixed Rule:
$$\text{base} = \left\lfloor \frac{B}{D} \right\rfloor,\quad \text{remainder} = B \pmod D$$
$$\text{allowanceAtStart} = \text{base} + (d \le \text{remainder} \ ?\ 1 : 0)$$

- The sum across all $D$ days equals $B$ exactly.
- Unused funds do not carry over. If the monthly budget is exhausted ($\text{monthRemaining} \le 0$), $\text{availableNow}$ drops to $0$ and explicit overspend is displayed.

---

## Project Structure

```
src/
  domain/
    types.ts       # TypeScript interfaces (MonthlyBudget, Expense, DayBudget, BackupData)
    money.ts       # String-based PKR paisa parser, formatRs, splitEvenly
    dates.ts       # Local calendar date utilities (YYYY-MM-DD, addDays, getDaysInMonth)
    budget.ts      # Pure deterministic budget calculation engine (single source of truth)
    validation.ts  # Input validation & backup schema validation
    backup.ts      # JSON backup generation, parsing, and CSV exports
  data/
    db.ts          # Dexie IndexedDB instance & migration scaffold
    repository.ts  # Transactional repository functions & persistence requests
  state/
    useBudgetData.ts # Reactive custom hook managing IndexedDB state & derived metrics
  components/
    Dashboard.tsx    # Primary screen with Hero Available card, stats, and setup
    StatCard.tsx     # Reusable metric card with status badges
    MonthProgress.tsx # Progress bar and monthly breakdown stats
    ExpenseList.tsx  # List of expense entries with edit/delete actions
    ExpenseSheet.tsx # Bottom sheet for single total or multiple itemized expenses
    DayView.tsx      # Comprehensive day detail view with deletion confirmation
    History.tsx      # Month-at-a-glance calendar table with projections
    Settings.tsx     # Budget settings, persistence status, backup/restore, wipe
    ConfirmDialog.tsx # Accessible modal confirmation dialog
    Toast.tsx        # Non-blocking accessible notification toasts
    EmptyState.tsx   # Empty state illustrations and actions
    InstallPrompt.tsx # PWA installation banner and Android Chrome instructions
    BottomNav.tsx    # Mobile navigation bar with quick-add button
  App.tsx            # Main application layout and PWA update coordination
  main.tsx           # React entry point
  styles.css         # Modern dark navy CSS design system with CSS tokens
tests/
  budget.test.ts     # 10 comprehensive unit tests covering all calculation rules
  money.test.ts      # Tests for string parsing, paisa arithmetic, and formatting
  validation.test.ts # Validation tests for user inputs and backup files
  backup.test.ts     # Backup serialization and CSV export tests
  repository.test.ts # IndexedDB transaction and atomic import/rollback tests
  components.test.tsx # React Testing Library component integration tests
public/
  icons/             # Generated PWA icons (192, 512, maskable 512)
  favicon.ico        # Favicon
  robots.txt         # Search crawler directives
netlify.toml         # Netlify deployment, redirect, and caching rules
```

---

## Available Scripts

- `npm run dev`: Start local development Vite server.
- `npm run build`: Compile TypeScript and build production bundle with Vite and PWA Service Worker.
- `npm run preview`: Serve production bundle locally.
- `npm run test`: Run all Vitest unit and integration test suites.
- `npm run typecheck`: Run TypeScript type checking without emitting files.
- `npm run generate-icons`: Generate PWA PNG icons using Sharp.

---

## Running Tests

Execute the complete test suite (38 unit, repository, and component tests):

```bash
npm run test
```

To run TypeScript verification:

```bash
npm run typecheck
```

---

## Deployment to Netlify

The repository includes a ready-to-deploy [`netlify.toml`](file:///f:/Learning/budget_planner/netlify.toml) configured with:
- SPA redirect rule (`/*` $\to$ `/index.html`)
- Cache headers: `no-cache` for `sw.js` and `manifest.webmanifest`, immutable caching for static assets.

### Option A: Netlify CLI
1. Log in to Netlify:
   ```bash
   npx netlify-cli login
   ```
2. Deploy production build:
   ```bash
   npx netlify-cli deploy --build --prod
   ```

### Option B: Netlify Web Drop
1. Run the production build locally:
   ```bash
   npm run build
   ```
2. Log into [app.netlify.com](https://app.netlify.com).
3. Drag and drop the `dist/` folder onto Netlify Drop.

### Option C: Connect via GitHub
1. Push this repository to GitHub.
2. In Netlify dashboard, click **"Add new site"** $\to$ **"Import an existing project"** $\to$ select the repo.
3. Build command: `npm run build`
4. Publish directory: `dist`

---

## Android Installation Guide

1. Open your deployed HTTPS Netlify URL in **Google Chrome** on your Android smartphone (Internet connection is required once to download the app).
2. Tap the **"Install"** button on the in-app banner, or tap Chrome's three-dot menu (**⋮**) in the top right corner and tap **"Install app"** (or **"Add to Home screen"**).
3. Tap **"Install"** to confirm. An app icon named **Daily Budget** will appear on your home screen and app drawer.
4. Launch the app from your home screen.
5. **Offline Test:** Turn on **Airplane Mode** on your phone. Notice that the app launches instantly and all features—recording expenses, navigating dates, editing budgets, viewing history, and exporting backups—continue to function seamlessly with zero internet connection!

> [!IMPORTANT]
> **Important Privacy & Storage Notice:**
> - Local development on `localhost` cannot be installed on a mobile phone without an HTTPS certificate. Always test phone installation via your deployed HTTPS Netlify URL.
> - Because all records are stored in browser IndexedDB, clearing your browser history/site data or uninstalling the PWA will erase your data.
> - Regularly navigate to **Settings** $\to$ **Export Full JSON Backup** to save a safe copy of your budget records.
