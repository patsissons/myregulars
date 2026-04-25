# Handoff: MyRegulars

> A small, private notebook app for remembering the regulars at the places you go.

---

## Overview

**MyRegulars** is a lightweight, BYO-datastore web app for keeping notes on the people you encounter at your regular places — the cafés, gyms, bars, libraries you visit often. The user signs in with GitHub, the app stores their data in a private GitHub Gist, and they get a fast, distraction-free interface for browsing places, looking up people, logging visits, and sharing read-only copies of their vault with others.

**Target form factors:** responsive web app — desktop (1280px window) and mobile (390–412px). The bundled prototype renders both side-by-side as design references.

**Data model (high level):**
- A **Vault** belongs to a user and lives in a single Gist.
- A vault contains **Locations** (places).
- Each location contains **Groups** (e.g. "Staff", "Morning regulars").
- Each group contains **People**, with a name, one key detail, optional photo URL, optional pets, optional relationships, and a `lastSeen` ISO date plus a visit log.

---

## Screenshots

PNGs of every key screen are in `screenshots/`. Use these as a quick visual reference while implementing — but the **HTML prototype is authoritative** for any pixel-level detail (the screenshots are captured at 924×540 viewport, so some sidebar text wraps narrower than its intended desktop width of ~1280–1440px).

**Desktop (`screenshots/desktop-*.png`):**

| File | Screen |
| --- | --- |
| `desktop-01-vault-light.png` | Main vault view, light theme — three-pane layout |
| `desktop-02-vault-dark.png` | Main vault view, dark theme |
| `desktop-03-person-light.png` | Vault view with person detail pane open |
| `desktop-04-vaults-light.png` | Vault selector (`/vaults`) |
| `desktop-05-onboarding-light.png` | Onboarding (`/`) |
| `desktop-06-share-modal-light.png` | Share modal open |
| `desktop-07-add-person-light.png` | Add Person modal open |
| `desktop-08-readonly-light.png` | Read-only mode (shared vault opened by visitor) |

**Mobile (`screenshots/mobile-*.png`)** — captured inside an iPhone-style frame:

| File | Screen |
| --- | --- |
| `mobile-01-vault-light.png` | Vault overview — list of places |
| `mobile-02-location-light.png` | Location detail — people list |
| `mobile-03-location-dark.png` | Location detail, dark theme |
| `mobile-04-person-light.png` | Person detail screen |
| `mobile-05-onboarding-light.png` | Onboarding |
| `mobile-06-connector-light.png` | Connector (pick datastore) |
| `mobile-07-vaults-light.png` | Vault selector |
| `mobile-08-share-modal-light.png` | Share bottom sheet |
| `mobile-09-add-person-light.png` | Add Person bottom sheet |

---

## About the Design Files

The HTML/JSX files bundled here are **design references** built as a clickable React prototype with inline Babel transpilation. They are NOT production code and should not be copied into the repo wholesale. They exist so you can:

1. See exact spacing, typography, colors, and component anatomy.
2. Click through the real interaction flows (routing, modals, swipe gestures, theme toggle).
3. Verify hover, active, and animation behaviors.

**Your task:** recreate these designs in the project's actual codebase using its established patterns (component library, styling system, router, state management). If no codebase exists yet, the recommended stack is **Next.js (App Router) + React + TypeScript + Tailwind CSS + shadcn/ui**, hosted on Vercel, with NextAuth for GitHub OAuth and the GitHub REST API for Gist read/write.

The prototype's mock data lives in `data.jsx`; treat that as a sample shape, not a schema. Real schema is described under "Data Model" below.

---

## Fidelity

**High-fidelity.** Colors, type scale, spacing, border radii, animations, and copy are all final-intent. Recreate pixel-perfectly. Where a value isn't explicitly listed in this README, lift it directly from the prototype's inline styles.

The two areas that are intentionally not final and need real implementation:

1. **GitHub OAuth + Gist sync.** The `Connector` screen has a fake 1.1s spinner — replace with real OAuth.
2. **Photo URLs.** The form accepts `https://`, `github://`, `twitter://`, `instagram://` schemes. Only `https://` needs to work for v1; the others are placeholders for future scrapers.

---

## Stack Recommendation (if greenfield)

| Concern | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + CSS variables for theme tokens |
| Components | shadcn/ui (Radix primitives) for Dialog, Sheet, Select, Toast |
| Fonts | Geist (sans) + Geist Mono — already on Google Fonts |
| Auth | NextAuth.js with GitHub provider, scope `gist` |
| Storage | GitHub Gists REST API (one private Gist per vault, JSON file inside) |
| State | React Context for current vault + theme; SWR or React Query for Gist fetch/mutate |
| Routing | App Router file-based + dynamic segments |
| Motion | Framer Motion for page transitions and list staggers (replaces the prototype's CSS keyframes) |
| Icons | The prototype's inline SVGs — copy them as a small icon component, OR use Lucide (close visual match) |
| Hosting | Vercel |

---

## Routes

| Path | Screen | Notes |
|---|---|---|
| `/` | Onboarding (signed out) OR redirect to `/vaults` (signed in) | Hero + GitHub sign-in |
| `/connect` | Provider picker | "GitHub Gists" is the only available v1 provider; others are disabled "Coming soon" |
| `/vaults` | Vault selector | Lists user's vaults, "New vault" CTA, "Open by link" input |
| `/v/[vaultId]` | Vault view (location list, redirects to first location on desktop) | Desktop = 3-pane layout; mobile = location list |
| `/v/[vaultId]/l/[locationId]` | Location detail | Group-tabbed people grid/list |
| `/v/[vaultId]/l/[locationId]/p/[personId]` | Person detail | Right rail on desktop; full screen on mobile |
| `?vault=gist:abc123` | Read-only viewer | Anyone with the link can view; "Clone" CTA copies vault into their own Gist |

Modals: `Share` and `Add/Edit person` are dialog overlays, not routes.

---

## Screens / Views

### 1. Onboarding (`/`)

**Purpose:** Tell the user what the app is and get them to sign in.

**Layout:**
- Mobile: single column, 70px top padding, 28px side padding, content top-aligned, CTA pinned to bottom.
- Desktop: centered card, max-width 540px, large left-aligned headline.

**Components:**
- **Logo mark.** 44×44 square, 12px radius, fill = `text` token, letter "R" inside, weight 700, size 18.
- **Headline.** "Remember the people / at the places you go." — `font-size: 32` mobile / `44` desktop, weight 600, letter-spacing -0.03em, line-height 1.05–1.08.
- **Subhead.** "A small, private notebook for the regulars in your life. Your data stays in your own GitHub Gist — yours to keep, share, or take with you." — `font-size: 14–16`, color = `dim`, line-height 1.5.
- **Three bullet rows (mobile only).** Each is a 6×6 accent dot + bold title (`14px/500`) + secondary line (`13px/dim`).
  - "Organized by place" — "Café, gym, bar — wherever you're a regular."
  - "Quick before you walk in" — "Glance at faces and details in seconds."
  - "Yours to share" — "Give a partner read-only access with one link."
- **Primary CTA.** Mobile: full-width, "Get started", 14px padding, dark fill. Desktop: "Connect with GitHub" with GitHub mark, plus a secondary "Open by link" ghost button beside it.

**Interactions:** CTA → `/connect`.

---

### 2. Connector (`/connect`)

**Purpose:** Let the user pick a datastore provider. Only GitHub is enabled.

**Components:**
- **Back button.** Icon-only, top-left.
- **Title.** "Connect a datastore", 24px/600.
- **Subhead.** "Your vaults live in your own datastore. Pick a provider — you can always add more later."
- **Provider rows** (4 total, vertical stack, 10px gap):
  - **GitHub Gists** — enabled, `Recommended · v1 provider`. Icon = GitHub mark in a 36×36 subtle-fill rounded square. Right side: chevron, or a 16×16 spinner during the OAuth round-trip.
  - **Local file**, **Dropbox**, **Google Drive** — disabled, opacity 0.55, label = "Coming soon".
- **Footer microcopy.** 12px/faint: "We never store your data. You'll be redirected to GitHub to authorize a private Gist."

**Interactions:** Tapping the GitHub row triggers OAuth. On success → `/vaults`.

---

### 3. Vault selector (`/vaults`)

**Purpose:** Pick which vault to open, or start a new one.

**Components:**
- **Header.** "Signed in · github.com/<handle>" eyebrow, 26–32px "Your vaults" title.
- **Vault cards** (mobile: stack, desktop: 2-col grid, 10px gap):
  - 14px radius, 1px edge border, 14–18px padding.
  - **Title** (15–16px/600), **chevron** right.
  - **Stats row:** `4 places · 13 people · opened today` — 12px/dim, dot-separated.
  - **Vault URI** in monospace at the bottom: `gist:8a7f3c1d`, 11px/faint.
- **"New vault" card.** Same shape but dashed border, "+" icon in a subtle square.
- **"Or open by link" section** (mobile only). Eyebrow + input + "Open" button.

---

### 4. Vault view — desktop main shell

This is the core working surface. Three panes:

**Window chrome (46px tall, top):**
- Traffic lights (red/yellow/green dots, 11×11).
- Logo mark (26×26).
- Vault name (13px/500).
- "· synced 2m ago" 11px/faint.
- Right side: `Share` chip-button, settings icon, more icon.

**Read-only banner (conditional, 8px padding):**
- Background = `accentSoft`, 1px bottom border = `accentSoftBorder`.
- Eye icon + "Read-only vault · you don't own this Gist. Clone it to make edits." + "Clone to your vault" button on the right (filled with accent).

**Left sidebar (268px, 1px right border):**
- **Search input** at top: subtle bg, search icon, "Search vault" placeholder, ⌘K affordance chip on the right.
- **PLACES heading** (uppercase eyebrow, 11px/600/0.08em).
- Place rows: pin icon + name + person count, 7px padding, 7px radius. Active row: `accentSoft` bg, `accent` text. Hover: `rgba(0,0,0,0.025)`.
- **+ New place** ghost button.
- **RECENT PEOPLE heading**.
- Compact person rows: 20px avatar + name + "5d ago".

**Center pane (flex-1, scrolls):**
- Header (22px top padding, 32px sides, 1px bottom border):
  - PLACE eyebrow, 26px title, dim "Tues/Thurs mornings · 7 people" subline.
  - Right side: search input (220px wide), `+ Add person` filled button.
  - Group filter chips below: pills, 999px radius, "All" + each group name. Active = filled dark.
- People grid: `auto-fill, minmax(280px, 1fr)`, 10px gap.
  - Each card: 14px padding, 12px radius, panel bg, edge border. Active person: accent border + 3px accentSoft glow.
  - 36px avatar, name (14px/500) + relative time, dim detail line.

**Right rail (360px, 1px left border, conditional on personId):**
- Header: PERSON eyebrow + edit icon + close X.
- Hero: 56px avatar + name (20px/600) + group + "Last seen 2d ago".
- Action row: filled accent "Saw today" + ghost "Log…".
- **Sections** (each: uppercase 11px eyebrow + content): Notes (13px text), Pets (chips), Recent visits (panel with date column + note column rows), Relationships (chips).

---

### 5. Vault / Location — mobile

**Vault overview (mobile):**
- Status bar (44px) + back/share/settings icon row.
- VAULT eyebrow, 26px name, "4 places · 13 people".
- "Search vault" subtle pill (display-only, opens command palette).
- PLACES section: panel container with stacked location rows. Each row: name, "description · N people", overlapping avatar stack of 3 most recent + chevron.
- "Add a place" dashed dotted button at bottom.
- Bottom safe-area padding 100px (clears any FAB).

**Location detail (mobile):**
- Same header pattern: back + more.
- PLACE eyebrow, 24px name, dim subline.
- Search field + horizontal-scroll group filter pills.
- Group sections: eyebrow + count + panel of stacked person rows.
- **PersonRow with swipe gesture:** drag-right reveals an `accentSoft` track underneath with a check icon and "Swipe to log a visit" label. Threshold: 70px translateX → fires `logVisit`, snaps back after 600ms with "Logged today" text.
- **FAB:** 54px tall, 28px radius, dark fill, "+ Add person" label, position fixed at right: 22, bottom: 32, big shadow.

---

### 6. Person detail (mobile)

- Status bar + back + Edit text-button.
- 68px avatar + 24px name + group/place subline + "Last seen…".
- Filled accent "Saw today" button (full width with ghost "Log…" beside).
- Sections in vertical stack: Notes / Pets / Recent visits / Relationships — same anatomy as desktop rail.

---

### 7. Add/Edit Person

**Mobile:** bottom sheet, slides up from below, 88% max-height, 20px top radius, drag-handle pill at top.
**Desktop:** centered modal, 480px wide, 16px radius, dark overlay.

**Common fields:**
- 56px avatar derived from name initials (live updates as user types).
- **Name** input (22px/600).
- **Group** chip selector — current groups + "+ New group" dashed chip.
- **One key detail** textarea, "e.g. Brings a golden retriever named Biscuit." Subtitle copy: "Something memorable. The thing you'd whisper before walking in."
- **Photo** (mobile only): scheme dropdown (`https | github | twitter | instagram`) + handle/URL input.
- **Pets** (edit mode only): chips with `×` removal + "+ Add pet" dashed chip.

**Save behavior:** disabled until name has content. Submit triggers a toast ("Person added" / "Person updated") and closes the modal.

---

### 8. Share modal

**Mobile:** bottom sheet.
**Desktop:** centered modal, 460px wide, with tabs ("Full vault" / "Selection").

**Body:**
- 168px (mobile) / 140px (desktop) QR code rendered as a deterministic SVG pattern with finder squares in the three corners.
- Vault URL displayed in a subtle monospace pill, e.g. `https://myregulars.app/?vault=gist:8a7f3c1d`.
- "Copy link" filled button. On click: switches to accent-fill with check icon and "Copied" label for 1.5s.
- Info row at bottom: eye icon + "Recipients see a read-only copy. They can clone it to their own GitHub if they want to make edits."
- Vault URI footer: 11px/faint, monospace.

---

### 9. Toast

- Pill, dark fill, light text, 999px radius, 10×16 padding.
- Check icon + label.
- Position: bottom-center, 24–100px from bottom (mobile higher to clear FAB).
- Animation: `mrSlideUp` 0.25s cubic-bezier(.2,.7,.3,1).
- Auto-dismiss after 2000ms.

---

## Design Tokens

### Colors

**Light theme:**
| Token | Value |
|---|---|
| `bg` | `#fbfbfa` |
| `panel` | `#ffffff` |
| `subtle` | `#f6f5f3` |
| `edge` | `rgba(15,15,15,0.08)` |
| `edgeStrong` | `rgba(15,15,15,0.16)` |
| `text` | `#111111` |
| `dim` | `#6b6b6b` |
| `faint` | `#9a9a9a` |
| `accent` | `#3b6cdc` |
| `accentText` | `#ffffff` |
| `accentSoft` | `rgba(59,108,220,0.10)` |
| `accentSoftBorder` | `rgba(59,108,220,0.22)` |
| `chip` | `#f1f1ef` |
| `chipText` | `#3a3a3a` |
| `danger` | `#c94a3b` |
| `overlay` | `rgba(20,20,20,0.42)` |
| `success` (used in "Logged today" state) | `#2da57a` |

**Dark theme:**
| Token | Value |
|---|---|
| `bg` | `#0e0e0f` |
| `panel` | `#17171a` |
| `subtle` | `#121214` |
| `edge` | `rgba(255,255,255,0.08)` |
| `edgeStrong` | `rgba(255,255,255,0.16)` |
| `text` | `#f3f3f2` |
| `dim` | `#a0a0a0` |
| `faint` | `#6a6a6a` |
| `accent` | `#7ea2ff` |
| `accentText` | `#0b0b0c` |
| `accentSoft` | `rgba(126,162,255,0.14)` |
| `accentSoftBorder` | `rgba(126,162,255,0.30)` |
| `chip` | `#222226` |
| `chipText` | `#dcdcdc` |
| `danger` | `#f08272` |
| `overlay` | `rgba(0,0,0,0.55)` |

**Avatars (initials → hue):**
- Hash initials string → 0–360 hue.
- Light: `bg = oklch(0.92 0.04 H)`, `fg = oklch(0.30 0.07 H)`.
- Dark: `bg = oklch(0.32 0.04 H)`, `fg = oklch(0.86 0.07 H)`.
- Hash function provided in `data.jsx`.

### Typography

- **Family:** `"Geist", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif`.
- **Mono:** `"Geist Mono", monospace` (vault URIs only).
- **Features:** `"ss01","cv11","tnum"` enabled globally.
- **Scale:**
  | Use | Size | Weight | Letter-spacing |
  |---|---|---|---|
  | Big hero (desktop) | 44 | 600 | -0.03em |
  | Hero (mobile) | 32 | 600 | -0.03em |
  | Page title | 26 | 600 | -0.025em |
  | Section title | 24 | 600 | -0.02em |
  | Person hero | 20–24 | 600 | -0.02em |
  | Card title | 14–16 | 500–600 | -0.01em |
  | Body | 13–15 | 400 | 0 |
  | Eyebrow / label | 11 | 600 | 0.08em UPPERCASE |
  | Caption / faint | 10–12 | 400 | 0 |
- **Numbers:** always `font-variant-numeric: tabular-nums` for dates and counts.

### Spacing

The prototype uses pixel values directly (no scale). Tailwind defaults work. Common values: `4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 40, 64`.

### Radii

- **Pills/chips:** 999px
- **Small controls:** 6–8px
- **Inputs/cards:** 10–14px
- **Modals:** 16px
- **Phone/avatar (round):** size = radius

### Shadows

- **Card hover (subtle):** none — color change only.
- **Floating action button:** `0 14px 30px rgba(0,0,0,0.22)`
- **Toast:** `0 8px 24px rgba(0,0,0,0.22)` (mobile) / `0 12px 28px rgba(0,0,0,0.25)` (desktop)
- **Modal:** `0 30px 80px rgba(0,0,0,0.35)`
- **Phone/window frame:** `0 30px 80px rgba(0,0,0,0.28–0.30), 0 0 0 1px rgba(0,0,0,0.04–0.06)`

### Motion

| Class | Duration | Easing | Properties |
|---|---|---|---|
| `mrSlideUp` (list-item enter) | 320ms | `cubic-bezier(.2,.7,.3,1)` | `transform: translateY(12 → 0)` |
| `mrSlideRight` (page-in) | 260ms | `cubic-bezier(.2,.7,.3,1)` | `transform: translateX(14 → 0)` |
| `mrSlideLeft` (page-back) | 260ms | same | `translateX(-14 → 0)` |
| `mrFadeIn` (overlays) | 250ms | ease-out | opacity + translateY(4) |
| `mrPop` (avatar/modal) | 320ms | `cubic-bezier(.2,.9,.3,1.1)` | scale 0.92 → 1.02 → 1 |
| `mrSheetIn` (bottom sheet) | 280ms | same | translateY(100% → 0) |

**All entry animations use `animation-fill-mode: both`** so paused timelines render the final state.

**List staggers:** 30–60ms per item via inline `animationDelay`.

**Buttons:** `transform: scale(0.97)` on `:active`, 120ms transition.

---

## Data Model

```ts
type Vault = {
  id: string;             // local; Gist id is the source of truth
  name: string;
  uri: string;            // e.g. "gist:8a7f3c1d"
  ownerHandle: string;    // GitHub username
  createdAt: string;      // ISO
  updatedAt: string;      // ISO
  locations: Location[];
};

type Location = {
  id: string;             // slug or short id
  name: string;           // "Blue Bottle — Mission"
  description: string;    // "Tues/Thurs mornings"
  groups: Group[];
};

type Group = {
  id: string;
  name: string;           // "Staff", "Morning regulars", "Trivia night"
  people: Person[];
};

type Person = {
  id: string;
  name: string;
  initials: string;       // derived: first letters of first 2 words, uppercase
  detail: string;         // ONE key memorable line
  role?: string;          // "Staff" | "Regular" | "Friend" | "Coach" | …
  photoUrl?: string;
  lastSeen: string;       // ISO date
  visitLog?: VisitEntry[];
  pets?: Pet[];
  relationships?: Relationship[];
};

type VisitEntry = { date: string; note?: string };
type Pet = { name: string; species: string };
type Relationship = { personId: string; kind: string }; // "friend of", "runs with"
```

**Persistence:** the entire `Vault` is one JSON file inside one private Gist. Optimistic local update, debounced PATCH to Gist on change (1.5–2s). On conflict (someone else edited), refetch and retry; for v1, last-write-wins with a quiet toast.

---

## State Management

- **Global context:** `theme` (`'light' | 'dark'`), `currentVault`, `isReadOnly`.
- **Per-vault state:** loaded on route entry from Gist API.
- **Optimistic mutations:** update local state, queue Gist write, rollback + toast on failure.
- **`logVisit(personId, locationId)`:** sets `lastSeen` to today, appends an empty `VisitEntry` to `visitLog`, fires "Visit logged" toast.
- **`savePerson({ name, groupId, detail }, mode)`:** `mode = 'add'` prepends to group's `people`; `mode = 'edit'` updates by id. Recomputes `initials` from `name`.

---

## Interactions & Behavior

- **Routing transitions:** wrap each route's root in a key that changes on route change so React unmounts + remounts, retriggering `mrSlideRight` entry animation. Direction-aware (use `mr-page-back` when going up the stack).
- **Hover:** rows in panels lift to `rgba(0,0,0,0.025)` bg; cards get no hover, only active border highlight.
- **Active selection:** person card → accent border + accent-soft glow ring; sidebar place row → accentSoft bg + accent text.
- **Mobile swipe-to-log:** track touch/mouse delta, clamp 0–120px, threshold 70px → fire log. Use a CSS transition on snap-back, none during drag.
- **⌘K search:** placeholder UI in sidebar; v1 implementation can simply focus the visible search input. Full command palette is a future iteration.
- **Read-only mode:** when route includes `?vault=…` and the user doesn't own that Gist (or isn't signed in), set `isReadOnly = true`. Hide "Add person", "Edit", "Saw today", "Log" affordances; show banner with "Clone" CTA that POSTs a new Gist into the user's account.

---

## Empty States (for v1)

- **No vaults yet:** vault selector shows only the "New vault" dashed card and a single empty-state line: "Welcome. Start your first notebook."
- **Empty vault:** vault view shows a single dashed CTA "Add a place" — no sidebar place list.
- **Empty location:** location detail shows the header but the body is a centered "No one here yet · Add the first person" with a primary button.
- **Search no results:** "No matches" + "Try a different search" 12px caption, centered, 60px padding.

---

## Accessibility

- All icon-only buttons need `aria-label`.
- Modal/sheet: trap focus, ESC to close, restore focus on close.
- Color contrast: `dim` on `bg` is the limit (4.5:1 in light, 4.6:1 in dark) — don't drop below.
- Person cards and rows: ensure they're `<button>` or `<a>` with proper roles.
- Animations: respect `prefers-reduced-motion` — disable all transforms; opacity transitions remain.

---

## Files in this Bundle

| File | Role |
| --- | --- |
| `MyRegulars Prototype.html` | Open this. Clickable React prototype — all screens, both themes, both viewports. |
| `README.md` | This document. |
| `screenshots/` | Reference PNGs of every screen (desktop + mobile, light + dark, all modals). |
| `brand/` | Logos and wordmarks — see table below. |
| `mr-shared.jsx` | Shared primitives: theme tokens, Avatar, Pill, Tag, Sheet, Modal, animations. |
| `mr-mobile.jsx` | Mobile screens (onboarding → vault → location). |
| `mr-mobile-detail.jsx` | Mobile person detail + bottom sheets. |
| `mr-desktop.jsx` | Desktop shell: title bar, sidebar, main pane, person pane, modals. |
| `mr-app.jsx` | Top-level app router/state. |
| `data.jsx` | Sample vault data — use as the schema reference for v1 fixtures. |
| `design-canvas.jsx` | Just for the prototype's multi-frame view; ignore for production. |

### Brand assets (`brand/`)

| File | Description |
| --- | --- |
| `MyRegulars-logo.svg` | Logo mark — vector source |
| `MyRegulars-logo-128.png` | Logo mark raster, 128px |
| `MyRegulars-logo-256.png` | Logo mark raster, 256px |
| `MyRegulars-logo-512.png` | Logo mark raster, 512px |
| `MyRegulars-logo-1024.png` | Logo mark raster, 1024px |
| `MyRegulars-wordmark.svg` | Wordmark (logo + name) — vector source |
| `MyRegulars-wordmark-960.png` | Wordmark raster, 960px wide |
| `MyRegulars-wordmark-1920.png` | Wordmark raster, 1920px wide |

To run the prototype locally: serve the folder over any static HTTP server (e.g. `npx serve .`), open `MyRegulars Prototype.html`. Babel transpiles in-browser, so first paint takes ~200ms.

---

## Implementation Checklist

- [ ] Set up Next.js + TypeScript + Tailwind + shadcn/ui.
- [ ] Add Geist + Geist Mono fonts via `next/font/google`.
- [ ] Wire CSS variables for both themes; theme toggle reads/writes `localStorage`.
- [ ] NextAuth GitHub provider, scope `gist`, callback handling.
- [ ] Gist API client: list user's gists tagged with our marker, read JSON, write JSON.
- [ ] Build atomic components: `Avatar`, `Chip`, `Eyebrow`, `IconButton`, `PersonRow`, `LocationRow`, `Card`, `Toast`, `Sheet`, `Dialog`.
- [ ] Build screens in this order: Vault view (desktop + mobile) → Location detail → Person detail → Add/Edit modal → Share modal → Vault selector → Onboarding → Connector → Read-only mode.
- [ ] Wire optimistic state + Gist sync.
- [ ] Implement swipe-to-log on mobile.
- [ ] Empty states.
- [ ] `prefers-reduced-motion` support.
- [ ] Smoke-test light + dark on both desktop and mobile widths.

---

## Questions for the Designer

(None outstanding — but if anything in this doc is ambiguous, ping back. The HTML files are authoritative for visual details.)
