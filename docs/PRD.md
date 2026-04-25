# MyRegulars — Product Requirements Document

**App:** MyRegulars  
**Domain:** myregulars.app  
**Version:** 1.0 (Design Input)  
**Date:** 2026-04-25  
**Status:** Draft — for designer handoff

---

## 1. Executive Summary

MyRegulars is a personal web app that helps you remember the names and meaningful details of people you regularly encounter at the places you frequent — coffee shops, gyms, bars, community spaces, and anywhere else you've become a regular. It is a private, portable contact book organized around the places in your life rather than formal relationships.

The app is built around a "bring your own datastore" model: your data lives in your own GitHub Gist (with more provider options planned), giving you full ownership and portability. Vaults are shareable via link or QR code and can be opened read-only on any device without setup.

---

## 2. Problem Statement

When you're a regular somewhere, you encounter the same people repeatedly. You learn their names, their dog's name, what they do — but these details live only in your memory. After a gap, you forget. The awkwardness of forgetting someone's name after months of friendly conversation is a universally uncomfortable experience.

Existing tools don't solve this well:

- **Contacts apps** are for people you have direct contact info for (phone, email). Regulars rarely exchange contact info.
- **Notes apps** are unstructured and hard to browse quickly before walking in somewhere.
- **CRMs** are heavyweight, professional-focused, and require too much data entry.

MyRegulars fills the gap: a lightweight, location-organized people tracker that makes it easy to quickly refresh your memory before — or after — visiting a place.

---

## 3. Target User

**Primary persona: The Social Regular**

A person who frequents 2–5 local spots on a regular basis (café, gym, bar, community center, etc.) and has accumulated a loose network of familiar faces at each. They are socially motivated — they want their conversations to feel genuine and connected, not superficial. They are tech-comfortable (likely have a GitHub account) but want the app experience itself to feel simple and personal.

**Key behaviors:**

- Visits the same locations weekly or more often
- Keeps mental notes about people but loses details over time
- Uses their phone to quickly look someone up before entering a venue
- Might share a "location directory" with a partner or friend who visits the same spots

---

## 4. Core Design Principles

1. **Personal & lightweight** — This is a personal tool, not a business product. It should feel like a thoughtfully designed notebook, not a CRM.
2. **Mobile-first, desktop-capable** — The most common use case is glancing at your phone before walking into a place. Desktop is for longer editing sessions.
3. **Portable by default** — Your data is yours. Opening a vault on a new device should require only a link or QR code.
4. **Minimal friction to add** — Adding a person should take under 10 seconds. The cost of capturing a detail must be lower than the value of remembering it.
5. **Fast to browse** — Before walking into a venue, you should be able to scan the people you know in under 5 seconds.
6. **Pluggable datastore** — The app is built around a provider-agnostic datastore abstraction. GitHub Gists is the v1 provider; the UI must be designed to support connecting to different providers in the future.

---

## 5. Data Model

### 5.1 Hierarchy

```
User
└── Vault (1 per GitHub Gist)
    └── Location (a regularly visited venue)
        └── Group (user-defined, freeform — e.g., "Morning crew", "Staff", "Trivia night")
            └── Person
```

### 5.2 Vault

A vault is the top-level container for all of a user's data. Each vault maps 1:1 to a GitHub Gist.

| Field           | Type            | Notes                                |
| --------------- | --------------- | ------------------------------------ |
| `uri`           | `gist:{gistId}` | Unique identifier / sharable address |
| `name`          | string          | User-defined vault name              |
| `createdAt`     | ISO-8601        |                                      |
| `updatedAt`     | ISO-8601        | Set on every write                   |
| `schemaVersion` | number          | For future migrations                |

**Key behaviors:**

- A user can have multiple vaults (e.g., one for personal use, one shared with a partner)
- Vault state is versioned — each save creates an immutable Gist revision
- The share URL encodes only the vault URI, never vault data inline
- **Read-only access is a datastore-level property:** Because a Gist is owned by a specific GitHub user, anyone accessing a vault they do not own inherently has read-only access. There is no separate "read-only mode" to implement — it is enforced by the datastore provider.

### 5.3 Location

A named place the user regularly visits.

| Field         | Type              | Notes                                |
| ------------- | ----------------- | ------------------------------------ |
| `id`          | UUID              |                                      |
| `name`        | string            | e.g., "Blue Bottle Coffee — Mission" |
| `description` | string (optional) | e.g., "Tues/Thurs mornings"          |
| `createdAt`   | ISO-8601          |                                      |
| `updatedAt`   | ISO-8601          |                                      |

### 5.4 Group

A freeform organizational layer within a location. The meaning is entirely user-defined.

| Field         | Type              | Notes                                          |
| ------------- | ----------------- | ---------------------------------------------- |
| `id`          | UUID              |                                                |
| `name`        | string            | e.g., "Staff", "Morning regulars", "Book club" |
| `description` | string (optional) |                                                |
| `createdAt`   | ISO-8601          |                                                |
| `updatedAt`   | ISO-8601          |                                                |

Groups are optional — a location can have people directly without any groups.

### 5.5 Person

| Field           | Type                      | Notes                                                                                                                                                                                                                              |
| --------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | UUID                      |                                                                                                                                                                                                                                    |
| `name`          | string                    | Required                                                                                                                                                                                                                           |
| `photo`         | string (URI)              | Optional. URI resolving to a profile image. Supports standard `https://` URLs, custom social schemes (e.g., `github://username`, `twitter://username`), and `data:` URIs (discouraged for Gist-backed vaults due to payload size). |
| `notes`         | string (optional)         | Freeform — anything memorable                                                                                                                                                                                                      |
| `pets`          | Pet[] (optional)          | Pet name + optional description                                                                                                                                                                                                    |
| `lastSeen`      | ISO-8601 (optional)       | Last recorded encounter date                                                                                                                                                                                                       |
| `visitLog`      | VisitEntry[] (optional)   | Array of dated visit notes                                                                                                                                                                                                         |
| `relationships` | Relationship[] (optional) | Links to other people in the vault                                                                                                                                                                                                 |
| `createdAt`     | ISO-8601                  |                                                                                                                                                                                                                                    |
| `updatedAt`     | ISO-8601                  |                                                                                                                                                                                                                                    |

**Pet:**

```
{ name: string, description?: string }
```

**VisitEntry:**

```
{ date: ISO-8601, note?: string }
```

**Relationship:**

```
{ personId: UUID, label: string }
// label is freeform — e.g., "married to", "works with", "friend of"
// relationships are directional but displayed bidirectionally in the UI
```

---

## 6. User Flows

### 6.1 First-Time User Journey

**Entry point:** myregulars.app (no query params)

1. **Landing / Welcome screen**
   - Brief value proposition (1–2 sentences + illustration)
   - Single clear CTA: "Connect your datastore"
   - No sign-up form — authentication happens through the datastore provider

2. **Connect Datastore screen**
   - Lists available providers (GitHub Gists — with more coming)
   - "Connect with GitHub" button → GitHub OAuth flow
   - After OAuth: user is redirected back to the app, authenticated

3. **Vault selector screen** (post-auth)
   - If no prior vaults: prompt to create first vault ("Create your first vault")
   - If prior vaults in browser storage: listed as cards with name + last opened date
   - Option to enter a vault URI manually (for sharing scenarios)
   - Option to create a new vault

4. **Create Vault modal/screen**
   - Input: vault name
   - Creates a new Gist, stores URI in browser storage
   - Navigates to vault view

### 6.2 Returning User Journey

**Entry point:** myregulars.app (no query params)

1. App checks browser storage for last opened vault URI
2. If found: automatically opens last vault → **Vault view**
3. If not found (new browser / cleared storage): **Vault selector screen**

### 6.3 Vault-via-URL Journey

**Entry point:** myregulars.app?vault=gist:{gistId}

1. App reads `?vault=` param
2. If user is authenticated with a compatible datastore: opens vault directly
3. If not authenticated: prompts to connect datastore first, then opens vault
4. If vault URI belongs to another user's datastore: opens in **read-only mode** (enforced at the datastore level — the app detects that the authenticated user does not own the Gist)

**Read-only mode indicators:**

- Persistent banner: "Viewing read-only vault — [Clone to your vault]"
- All edit controls hidden
- Write attempts blocked by the datastore adapter (not just the UI)

### 6.4 Vault View

The primary workspace. Desktop layout:

```
[ Vault name ]                     [ Settings ] [ Share ] [ Switch vault ]
─────────────────────────────────────────────────────────────────────────
[ Location list / sidebar ]   |   [ Location detail ]
  • Blue Bottle Coffee         |     [ Group: Staff ]
  • Nopa Bar                   |       • Alex — barista, has a cat named Mochi
  • CrossFit SoMa              |       • Jamie — manager, Tues–Sat
  + Add location               |     [ Group: Morning regulars ]
                               |       • Taylor — brings a golden retriever
                               |     [ + Add group ]  [ + Add person ]
```

**On mobile:** Location list and detail are separate screens (master-detail navigation pattern).

**Filtering / search:**

- Global search across all people in the vault (by name, notes)
- Per-location filter by group
- Filter by "last seen before [date]" (to surface people you haven't noted in a while)

### 6.5 Person Detail View

Accessed by tapping/clicking a person's name or card.

Displays:

- Photo (prominent, at top)
- Name (editable inline)
- Last seen date + quick "Saw today" button
- Visit log (expandable, chronological)
- Pets section
- Notes (freeform text)
- Relationships (links to other people in the vault)
- Edit / Delete actions

On mobile: full-screen modal or dedicated route.

### 6.6 Add / Edit Person

**Quick-add flow** (from location/group view):

1. Tap "+ Add person"
2. Name field (autofocused)
3. Optional: photo URI (select scheme — `https`, `github`, `instagram`, etc. — then enter the handle or path)
4. Save → person appears in list

**Full edit** (from person detail):

- All fields accessible in a structured edit form
- Sections: Basic info → Pets → Notes → Relationships → Visit log

### 6.7 Sharing a Vault

**Full vault share:**

1. Tap "Share" in vault header
2. Modal shows:
   - Shareable URL (auto-generated from vault URI)
   - QR code (for phone-to-phone or desktop-to-phone transfer)
   - Copy link button
3. Recipient opens URL → read-only vault view

**Selective share (subset of vault):**

1. Enter select mode on locations or people (long-press on mobile, checkbox on desktop)
2. Tap "Share selection"
3. A new vault is created containing only the selected content — the share modal displays that vault's URI as a link and QR code
4. The recipient opens a self-contained vault (their own read-only copy of the selection)

> **Technical note:** The mechanism for creating a subset vault is TBD (e.g., a new Gist with filtered content vs. URL-encoded filter params). The designer should not assume a specific implementation — design the share flow around the outcome (a copyable link + QR code) not the mechanism.

### 6.8 Cloning a Vault

From a read-only vault:

1. Tap "Clone to your vault"
2. If not authenticated: prompted to connect datastore first
3. Name input (pre-filled with original vault name + "— copy")
4. Scope selection: "Clone everything" or (if opened via selective share) "Clone selected content only"
5. Creates a new Gist with copied content
6. Opens the new vault in read/write mode

### 6.9 Device Switching via QR Code

1. On device A: open Share → display QR code
2. User scans QR on device B → opens vault URL in browser
3. Device B opens vault in read-only mode (if not authenticated) or read/write mode (if authenticated with same datastore credentials)

---

## 7. Navigation Architecture

```
/ (root)
├── Welcome / connect datastore        [unauthenticated]
├── Vault selector                     [authenticated, no vault open]
└── /vault                             [vault open]
    ├── Overview / location list
    ├── /vault/[locationId]            [location detail]
    │   └── /vault/[locationId]/[personId]   [person detail]
    └── /vault/settings                [vault settings]
```

**URL state:**

- `?vault={uri}` — opens a specific vault by URI
- Last opened vault URI stored in `localStorage`
- Known vaults list stored in `localStorage`

---

## 8. Key UI Components

The designer should define and design these components as part of the design system:

| Component              | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| **VaultCard**          | Vault selector card: name, last opened date, provider icon          |
| **LocationListItem**   | Sidebar/list row for a location: name + person count                |
| **GroupSection**       | Collapsible section header within a location view                   |
| **PersonCard**         | Summary card: photo thumbnail, name, one key detail, last-seen chip |
| **PersonDetail**       | Full person view with all fields                                    |
| **PersonForm**         | Add/edit form for a person                                          |
| **RelationshipPill**   | Linked-person chip showing freeform label                           |
| **VisitLogEntry**      | Date + optional note row in visit history                           |
| **PetEntry**           | Pet name + description row                                          |
| **ShareModal**         | URL display + QR code + copy button                                 |
| **ReadOnlyBanner**     | Persistent top banner for read-only vaults with Clone CTA           |
| **DatastoreConnector** | Provider selection list + OAuth trigger UI                          |
| **SearchBar**          | Global vault search with highlighted results                        |

---

## 9. Responsive Design Requirements

| Viewport            | Priority | Notes                                                  |
| ------------------- | -------- | ------------------------------------------------------ |
| Mobile (360–430px)  | Highest  | Primary use case: quick lookup before entering a venue |
| Tablet (768–1024px) | Medium   | Sidebar + detail layout, closer to desktop             |
| Desktop (1280px+)   | Medium   | Longer editing sessions, adding people after a visit   |

**Mobile-specific patterns:**

- Floating action button (FAB) for "+ Add person" on location views
- Swipe actions on person list items (e.g., swipe right to log a visit today)
- "Saw today" shortcut accessible in 1 tap from a person card
- Bottom sheet for quick actions instead of dropdown menus
- Native share sheet integration when sharing a URL

---

## 10. Datastore Provider UI

The app is architected for multiple datastore providers. The designer should treat the connection screen as an extensible provider list, even though only one provider is active in v1.

**v1 Provider: GitHub Gists**

- Requires GitHub OAuth
- Vault URI format: `gist:{gistId}`
- Share URL encodes only the Gist ID — the recipient only needs GitHub OAuth if they want to write

**Future providers to design for (visual pattern only, not functional in v1):**

- Local file / JSON import-export (no auth required)
- Cloud storage (e.g., Dropbox, Google Drive)

---

## 11. Out of Scope for v1

| Feature                      | Notes                                                                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline / PWA support        | Online connection required; no service worker                                                                                                                    |
| Notifications/reminders      | e.g., "You haven't seen Alex in 3 weeks"                                                                                                                         |
| Tags / labels on people      | May be explored in v2                                                                                                                                            |
| Activity feed / changelog    | Vault history exists in Gist revisions but is not surfaced in UI                                                                                                 |
| Collaboration / multi-writer | Vaults are single-writer; read-only sharing is the sharing model                                                                                                 |
| Native mobile app            | Web only                                                                                                                                                         |
| Photo hosting infrastructure | Photos reference external URIs — no image hosting is provided by the app. URI scheme resolution (e.g., `github://username` → avatar URL) is handled client-side. |

---

## 12. Technical Constraints (Designer Awareness)

| Constraint                                   | Impact on design                                                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| No backend server — all data in GitHub Gists | No real-time sync; no server-side search; all filtering is client-side                                                                      |
| Practical Gist size limit (~10 MB)           | Photos should be optional and compressed; warn user if vault grows large                                                                    |
| Read-only is enforced by Gist ownership      | A user can only write to Gists they own; sharing a vault URI grants read-only access by definition — no app-level permissions system needed |
| Browser `localStorage` for vault list        | Data is per-browser; no cross-browser sync without sharing a link                                                                           |

---

## 13. Designer Deliverables

Using Claude Design, the designer should produce hi-fi interactive prototypes covering:

1. **Onboarding flow** — Landing → Connect datastore → Vault selector → Create first vault
2. **Core vault experience** — Vault view (location list + location detail), mobile and desktop breakpoints
3. **Person lifecycle** — Quick-add person → Person detail view → Edit person → Log a visit
4. **Sharing flows** — Share full vault → Share selection → Clone a read-only vault
5. **Empty states** — New vault (no locations), location with no people, group with no people
6. **Error / edge states** — Datastore connection failed, vault not found, attempt to write in read-only mode
7. **Design system** — All components from Section 8, in both light and dark mode

---

## 14. Open Questions (for Design to Resolve)

- What should the vault home screen show when a vault has no locations yet? (Guided onboarding? Empty state illustration? Tips?)
- Should groups within a location be manually reorderable (drag-and-drop)?
- Can a person belong to multiple groups within the same location?
- What happens to a person's relationships when the linked person is deleted? (Remove silently? Show as broken link?)
- Should `lastSeen` be automatically updated when a visit is logged, or is it always a separate manual field?
- For selective sharing, does the shared URL reflect future updates to the source vault, or is it a frozen view?
