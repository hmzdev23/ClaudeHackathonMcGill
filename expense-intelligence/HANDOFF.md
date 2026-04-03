# Expense Intelligence — Claude Handoff Plan

**Hackathon**: Claude Builders Hackathon @ McGill — Brim Financial Sub-Challenge  
**Demo day**: April 4, 2026 (submission at 4PM)  
**App location**: `/Users/hamza/Documents/GitHub/ClaudeHackathonMcGill/expense-intelligence/`

---

## Project State (as of April 3 2026, 01:15 AM)

The app is functionally complete and visually polished. Here is a precise summary of where things stand.

### What's done

**Tech stack**: Next.js 16.2.2, Clerk auth, SQLite (better-sqlite3), Tailwind v4, Claude API multi-agent (`lib/claude/agent.ts`), Recharts.

**Design system** (`app/globals.css`):
- Background: `#07090f` (dark blue-black matching landing page)
- Primary accent: `#38BDF8` (sky/teal blue) via CSS var `--accent-primary`
- All legacy gold/cyan/violet vars remapped to `#38BDF8`
- Border radius scale: `--radius-sm/md/lg/xl` (6/10/14/18px)
- All dashboard components rounded: `.tactile-base`, `.card`, `.btn-editorial`, `.btn-ghost`, `.btn-approve`, `.btn-deny`, `.badge`, `.input`, `.chat-bubble`

**Landing page** (`app/page.tsx`):
- Fully redesigned: dark `#07090f` bg, BlurFade scroll animations on all sections
- Navbar: glass blur, blue pill logo, anchor nav links
- Features section: `FeatureCard` component with grid pattern + SVG icons
- Pipeline section: alternating left/right layout with animated vertical beam
- Dashboard preview mockup
- Footer CTA

**Dashboard app** (`app/(app)/`):
- Layout: sticky glassmorphism navbar + `ScrollReset` (scrolls to top on route change)
- Dashboard: KPI grid (rounded-2xl overflow-hidden), budget bars, violations list, feature links — all grid containers wrapped with `rounded-2xl overflow-hidden` for consistent border radius
- Query (`/query`): Full AI chat interface with PromptInput component, suggestion grid. Execute button uses `.btn-editorial` with `border-radius: var(--radius-md)` to match chatbox roundness
- Compliance (`/compliance`): Form with `SelectDropdown` for categories, AI compliance check
- Approvals (`/approvals`): Pending/resolved approval workflow with AI recommendations
- Reports (`/reports`): Employee + event selects, Claude AI report generation
- Budgets (`/budgets`): Department utilization with progress bars
- Anomalies (`/anomalies`): Fraud detection KPI grid (critical/high/medium counts)

**OnboardingTour** (`app/components/OnboardingTour.tsx`) — FULLY REWRITTEN:
- Sky blue `#38BDF8` theme with per-step feature accent colors
- 9 steps covering every feature: Welcome → Dashboard → Query → Compliance → Approvals → Reports → Anomalies → Budgets → Complete
- Two-phase UX: "intro" (centered with blur backdrop, full description + hint) → "explore" (bottom-right compact card)
- Each step has a demo-specific "TRY THIS" callout box with suggested actions:
  - Welcome: "Click 'Load Brim Data' on the dashboard to seed real transaction data"
  - Query: "Try: 'Who are the top 3 spenders this quarter?'"
  - Compliance: "Try: Amount $280, Merchant 'STK Steakhouse', Category 'meals', Attendees 1"
  - Reports: "Select an employee from the dropdown and click Generate Report"
  - Plus hints for dashboard KPIs, approvals reasoning, anomaly severity, budget thresholds
- "REQUIRED" badges on the 4 Brim challenge features (query, compliance, approvals, reports)
- Clickable progress dots that expand active to 16px width
- Top accent gradient line per step, rounded panel (16px border-radius)
- localStorage key: `expense-ai-tour-v4` (auto-triggers on first visit)
- Floating trigger button with sky blue glow dot (bottom-right)

**Data**:
- Real Brim XLSX → `data/transactions_brim.json` (4180 txns, 9 employees, Aug 2025–Mar 2026)
- Real Brim policy → `data/policy.json`
- Seed mode "brim": real data, anomaly detection, 12 pending approvals
- Seed mode "synthetic": 50 employees, richer violations

**Components created**:
- `components/ui/blur-fade.tsx` — IntersectionObserver blur+fade animation
- `components/ui/glowing-effect.tsx` — Mouse-tracking glowing border effect (replaces feature-card on landing)
- `components/ui/select-dropdown.tsx` — Custom styled dropdown with check marks, keyboard nav
- `lib/utils.ts` — cn() utility (clsx + tailwind-merge)
- `app/components/ScrollReset.tsx` — Scroll to top on route change

---

## Completed Polish Items (from prior sessions)

These items from the original handoff have been completed:

1. ~~**Dashboard KPI grid border-radius**~~: ✅ All three grid containers (KPI grid, budget+violations split, feature links grid) now have `rounded-2xl overflow-hidden` wrappers. Seed buttons also have `borderRadius: "10px"` inline.

2. ~~**Query page "Execute" button rounding**~~: ✅ `.btn-editorial` class in `globals.css` now has `border-radius: var(--radius-md)` which matches the chatbox rounding.

3. ~~**OnboardingTour component**~~: ✅ Completely rewritten with sky blue theme, 9 demo steps, per-feature accent colors, demo hints, REQUIRED badges, two-phase UX, localStorage v4 key.

4. ~~**API key**~~: ✅ Fixed `.env.local` — was placeholder `your_anthropic_api_key_here`, now has real key. Model updated to `claude-sonnet-4-6` in `lib/claude/client.ts`.

5. ~~**Landing feature cards**~~: ✅ Replaced `FeatureCard` (grid pattern) with `GlowingEffect` mouse-tracking border cards. 2-column grid with gap-3, each card is dark `#10121a` with icon, title, desc, FEATURE_XX tag. No `motion/react` needed — uses direct CSS property updates.

6. ~~**Navbar blue rectangle removed**~~: ✅ Removed the blue vertical pill from both landing and app navbars. "Expense Intelligence" now uses Inter semi-bold (`--font-inter` CSS var, weight 600). Inter added to `app/layout.tsx` via `next/font/google`.

7. ~~**Dashboard "Demo Data" button**~~: ✅ Removed the "Load Demo Data" / "Demo Data →" buttons from both the empty state and the loaded dashboard header. Only "Load Brim Data" button remains.

---

## Remaining Polish Items (priority order)

### MEDIUM PRIORITY (demo polish — nice to have)

1. **Reports page result card**: After generating a report, the result card shows the narrative. This still uses `var(--accent-green)` for the top gradient line and radial glow, which may look inconsistent. Consider changing to `--accent-primary` or keeping green as a "success" semantic color.
   - File: `app/(app)/reports/page.tsx`

2. **Dashboard feature links grid**: The four feature link cards at the bottom of the dashboard page use hardcoded colors (`#38BDF8` for query, `#06B6D4` for compliance, `#A78BFA` for approvals, `#34D399` for reports). These are intentionally per-feature, but the purple for approvals may look inconsistent. Consider using `#38BDF8` for all, or a coordinated sky/teal palette.
   - File: `app/(app)/dashboard/page.tsx`

3. **Anomalies page header label**: The header label "OPTIONAL // ANOMALY_DETECTION" uses red. Could use `--accent-primary` for the label and keep red only for severity indicators.
   - File: `app/(app)/anomalies/page.tsx`

### LOWER PRIORITY

4. **Loading states**: Most pages have loading spinners using `--accent-primary`. Some pages have hardcoded `var(--accent-red)` or similar for spinners. Standardize to `--accent-primary` everywhere.

5. **Mobile nav**: The mobile hamburger menu was updated but verify the full-screen overlay looks right with the new `#07090f` background.

6. **Budgets page detail cards**: The department card breakdown section (below the main budget bars) may need review for full visual coherence with the sky blue theme.
   - File: `app/(app)/budgets/page.tsx`

---

## Key Files Reference

```
app/
  page.tsx                    ← Landing page (standalone, own styles)
  globals.css                 ← ALL shared CSS vars + component classes
  (app)/
    layout.tsx                ← App layout (Navbar + ScrollReset + main)
    dashboard/page.tsx        ← Main dashboard (KPIs, budget bars, violations)
    query/page.tsx            ← AI chat (PromptInput component)
    compliance/page.tsx       ← Compliance checker form
    approvals/page.tsx        ← Approval workflow
    reports/page.tsx          ← Report generation
    budgets/page.tsx          ← Budget utilization
    anomalies/page.tsx        ← Fraud/anomaly detection
  components/
    Navbar.tsx                ← App navbar (glass blur, sky blue accent)
    ScrollReset.tsx           ← Scroll-to-top on route change
    OnboardingTour.tsx        ← 9-step guided demo tour (sky blue, v4)

components/ui/
  blur-fade.tsx               ← BlurFade animation component
  feature-card.tsx            ← Grid pattern card (landing page features)
  select-dropdown.tsx         ← Custom styled dropdown
  bg-pattern.tsx              ← BGPattern grid background
  prompt-input.tsx            ← Chat input component

lib/
  utils.ts                    ← cn() utility
  db/
    seed_brim.ts              ← Real Brim data seeder (4180 txns)
    seed.ts                   ← Synthetic data seeder
  claude/agent.ts             ← Claude API multi-step agent
```

---

## Colors Reference

```
Primary accent: #38BDF8 (sky-400, teal/sky blue)
  rgba: 56, 189, 248
  dim: rgba(56, 189, 248, 0.14)
  glow: rgba(56, 189, 248, 0.25)

Background: #07090f
Surface: #0d0f1a  
Surface2: #111520
Border: rgba(255,255,255,0.07)

Semantic:
  green (success/approved): #22c55e
  red (violations/critical): #ef4444
  amber (medium severity): #f59e0b
  orange (high severity): #f97316
```

---

## Prompt for next Claude

You are continuing work on the Expense Intelligence app for the Claude Builders Hackathon @ McGill (Brim Financial Sub-Challenge). Demo is April 4, 2026. 

Read this file first, then read `app/globals.css` to understand the design system, then read the specific page file you're working on.

The app is at `/Users/hamza/Documents/GitHub/ClaudeHackathonMcGill/expense-intelligence/`.

The primary accent color is `#38BDF8` (sky/teal blue), applied via `--accent-primary` CSS variable. Do NOT change this to purple/indigo.

The main remaining tasks are in the "Remaining Polish Items" section above — these are all medium/low priority nice-to-haves. The core app is visually coherent and demo-ready.

The OnboardingTour has been fully rewritten — it uses localStorage key `expense-ai-tour-v4`. Do not regress this component. It has 9 steps with demo hints, REQUIRED badges, two-phase (intro/explore) UX, and per-step accent colors.

The Tailwind CSS version is v4 (uses `@import "tailwindcss"` not `@tailwind` directives). Do not use Tailwind utilities that require a separate config file.

Do not install new npm packages without asking first.

Run `npx tsc --noEmit` after any TypeScript changes to verify no type errors.
