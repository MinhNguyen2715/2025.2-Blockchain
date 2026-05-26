# Diploma Verifier — Frontend Design & Status

*Status: all three role pages (Verify, Student, University) are built and wired to the live NestJS backend, alongside the landing hub and the preserved endpoint smoke test. Frontend and backend both pass `tsc --noEmit`.*

---

## 1. What we're building and for whom

The system has three actors, and the frontend gives each an equal-weight home reached from a single landing hub:

- **Verifier** (employer, registrar, anyone checking a claim). Loads a proof a student generated and confirms a claim is true — most importantly, *"this person graduated with this major in this year"* — **without ever seeing the transcript or grades**. This is the privacy headline of the whole product, so the Verify page is the most polished surface.
- **Student / holder.** Views their issued credentials and composes a shareable proof for a verifier, selecting exactly what to reveal (the degree claim, and/or specific courses).
- **University / issuer.** Issues and revokes credentials and authorizes issuer wallets. Admin-gated (the backend requires an `x-admin-api-key` header on every `/university/*` route).

Navigation model: **landing hub → role sub-pages.** The hub asks "who are you here as?" with three cards, each routing to its own page. This keeps the three audiences cleanly separated and reads well to a first-time visitor who may be any of the three.

---

## 2. Look and feel

**Mood: dark & premium.** Near-black canvas, maroon/plum surfaces, dusty-mauve text and accents — closer to a hardware-wallet or audit-tool aesthetic than a SaaS dashboard.

### Palette mapping

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#191716` | App canvas (near-black, faintly warm) |
| `--surface` | `#231c1d` | Cards / panels (derived: bg lifted toward maroon) |
| `--surface-2` | `#2c2224` | Inputs, insets, nested panels (derived) |
| `--maroon` | `#440D0F` | Deep brand maroon — primary button base, hero accents |
| `--plum` | `#603A40` | Borders, secondary surfaces, hover states |
| `--plum-2` | `#84596B` | Muted accents, chips, focus rings, section labels |
| `--mauve` | `#AF9BB6` | Primary text accent, links, headings highlight |
| `--text` | `#EDE6EA` | Body text (mauve-tinted off-white, derived for contrast) |
| `--muted` | `#9A8A92` | Secondary text (derived) |

Because the five brand colors are all dark-to-mid and none is a true light, two near-white text tones and two surface tones are derived from the palette so body copy clears WCAG AA on the dark canvas. The five originals carry brand, borders, and accents; the derived tones carry legibility. Status colors (valid / invalid / revoked) are tuned to sit with the maroon family rather than using generic traffic-light green/red.

### Typography

**Serif headers + sans body.** A serif display face for page titles, the hero, and the verify result headline gives the certificate-like authority the product implies; a clean sans keeps dense UI and data readable. To keep the dev server self-contained, the current pass uses high-quality system font stacks (serif: Iowan/Palatino/Georgia fallback chain; sans + mono: system stacks). Swapping in a webfont (e.g. *Fraunces* or *Spectral*) is a one-line change in `styles.css`.

---

## 3. Information architecture

```
/                     Landing hub — three role cards + product pitch
/#/verify             Verifier flow        (built)
/#/student            Holder dashboard     (built)
/#/university         Issuer console       (built)
/#/smoke              Endpoint smoke test  (preserved dev tool)
```

Routing is a tiny **dependency-free hash router** (`src/lib/router.ts`). Rationale in §7.

---

## 4. Screen-by-screen (as built)

### 4.1 Landing hub
A short serif hero over the dark canvas, then three role cards routing to Verify / Student / University. The global header carries the **Diploma Verifier** wordmark, the role nav, and the **Connect Wallet** control; the footer links to the smoke test.

### 4.2 Verify page
The verifier takes a proof a student handed them and gets a clear yes/no. A segmented control switches three modes, each mapping to a real route:

- **Degree** → `POST /verify/degree`. Confirms *graduated, this major, this year*. No grades involved.
- **Course** → `POST /verify/full`. Confirms a specific course / credit / grade record.
- **Status** → `GET /verify/status/:credentialId`. Quick "is this credential live / revoked?" check.

**Input is per-field, not raw JSON.** Each backend field is its own labeled input (degree: credential ID, degree name, major, graduation year, Merkle proof, issuer signature; course: adds course ID / name / semester / credits / grade; status: just the credential ID). The Merkle proof is a one-hash-per-line box and credits is a number input. **All fields start blank** with neutral `0x…` format hints on the hex fields — no seeded sample data.

A **"Load proof file…"** button reads a student-exported `.json` bundle and fills every field, landing the verifier on whichever mode the bundle carries (degree or course). If the bundle holds multiple courses, a dropdown lets the verifier pick which one to check.

**Verify** calls the backend, times the round-trip, and renders a **result banner**: a large serif `VALID` / `NOT VALID` / `REVOKED` / `CREDENTIAL NOT FOUND` headline with the claimed fields beneath, plus the raw JSON in a collapsible drawer. A `404` renders as an explicit "not found" state rather than a scary error. The degree mode reinforces the privacy point in copy.

### 4.3 Student dashboard
Paste a wallet address (or **Connect Wallet** when an injected provider is present) → load credentials from `GET /student/credentials/:walletAddress`, rendered as status cards (valid / revoked, issuer, issue date). Selecting a credential fetches its transcript from the new read-only `GET /student/transcript/:credentialId` and opens the **proof composer**:

- A **Degree** toggle (the degree leaf is atomic — name, major, and graduation year are revealed together; this is noted in the UI).
- A **checkbox per course** for selective disclosure.
- **Generate proof** calls `POST /student/generate-proof` (`credentialId`, `holderAddress`, `courseIds`, `includeDegree`).

The result merges the credential's issuer signature into a self-contained **proof bundle**, shown with a clear "you are sharing / you are not sharing" summary, and offered as **download `.json`** or **copy**. That bundle is exactly what the Verify page's "Load proof file…" consumes.

### 4.4 University console
An **admin API key** field (kept in memory only, never persisted) gates three tabbed actions mapped to the gated routes:

- **Issue** → `POST /university/issue`. Student + degree fields, plus a **transcript editor** that accepts **CSV upload** (`courseId, courseName, semester, creditsScaled, grade`) *and* manual add/remove rows — both editable. On success the response (credential ID, Merkle root, signature, tx hash) is shown for handing back to the student.
- **Revoke** → `POST /university/revoke` (credential ID).
- **Authorize issuer** → `POST /university/add-issuer` (issuer address + name).

A missing/invalid key renders a legible `UNAUTHORIZED` banner rather than a surprising failure.

**Fields the backend does not accept** — student email, classification, issue date, revoke reason — are shown for completeness but clearly tagged **UI only** and never sent.

---

## 5. Component & module inventory

Pages: `Landing`, `Verify`, `Student`, `University`, `Smoke`. Shell: `Layout` (header/nav/footer) · `WalletButton` (connect / address pill). Shared libs: `lib/api.ts` (thin fetch wrapper, never throws on HTTP errors) · `lib/router.ts` (hash router) · `lib/wallet.ts` (injected-provider hook + connect) · `lib/proof.ts` (proof-bundle type, build, and parse) · `endpoints.ts` (single source of truth for routes, drives the smoke test). Styling is entirely token-driven in `styles.css`, so a palette tweak propagates everywhere.

---

## 6. The proof bundle (connective tissue)

`/student/generate-proof` returns the degree, degree proof, selected course data, and per-course Merkle proofs — but **not** the issuer signature, which lives on the credential record. The Student page therefore merges the credential's `signature` into a single bundle:

```json
{
  "credentialId": "0x…",
  "signature": "0x…",
  "degree": { "degreeName": "…", "major": "…", "graduationYear": "…" },
  "degreeProof": ["0x…"],
  "courses": [
    { "courseId": "…", "courseName": "…", "semester": "…",
      "creditsScaled": 0, "grade": "…", "proof": ["0x…"] }
  ]
}
```

The Verify page parses this same shape on "Load proof file…". (If preferred, the backend could instead return the signature directly in the generate-proof response — an additive change.)

---

## 7. Engineering decisions

**Zero new npm dependencies.** `npm run dev` runs on Windows; the build sandbox is Linux. Installing packages with native binaries (vite/esbuild) from the sandbox can write Linux binaries into the Windows `node_modules` and break the dev server. So the client adds **no packages**: routing is a hand-written hash router, wallet connect uses the injected `window.ethereum` (EIP-1193) directly, and the CSV transcript import is parsed by hand (no spreadsheet library). Everything runs on the packages already in `package.json`. Verification is therefore `tsc --noEmit` (clean), not a sandbox `vite build`, which would touch the Windows esbuild binary.

**Wallet = connect + paste, no install prompt.** The header shows **Connect Wallet** only when an injected provider is present; the "Install MetaMask" fallback was removed by request. Every place that needs an address also accepts a pasted address, so the app is fully usable for demos without an extension.

**Backend changes are additive only.** The single new route is read-only `GET /student/transcript/:credentialId` (returns `{ credentialId, degree, courses }`), added so the Student page can render real course checkboxes. No existing controller, service, DTO, or contract logic was modified. `endpoints.ts` was updated to keep the smoke test in sync.

**Smoke test preserved.** The endpoint smoke-test page remains at `/#/smoke` as a working diagnostics tool.

---

## 8. Status summary

| Area | State |
|---|---|
| Design system (tokens, type, components) | ✅ Built |
| App shell + hash router + wallet connect (no install prompt) | ✅ Built |
| Landing hub | ✅ Built |
| Verify page — per-field inputs, file load, degree/course/status, result banner | ✅ Built, live backend |
| Student dashboard — credential list, transcript view, proof composer, bundle export | ✅ Built, live backend |
| University console — issue (CSV + manual transcript), revoke, add-issuer, admin gate | ✅ Built, live backend |
| Backend `GET /student/transcript/:credentialId` (additive) | ✅ Built |
| Possible later polish | Webfont swap, motion, QR proof input, optional client libs installed Windows-side |
