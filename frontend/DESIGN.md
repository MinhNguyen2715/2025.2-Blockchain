# Diploma Verifier — Frontend Design Proposal

*Status: proposal for review. Phase 1 (design system, app shell, landing hub, and the Verify page) is implemented alongside this document; Student and University pages ship as designed placeholders.*

---

## 1. What we're building and for whom

The system has three actors, and the frontend gives each an equal-weight home reached from a single landing hub:

- **Verifier** (employer, registrar, anyone checking a claim). Receives a proof a student generated and confirms a claim is true — most importantly, *"this person graduated with this major in this year"* — **without ever seeing the transcript or grades**. This is the privacy headline of the whole product, so the Verify page is the most polished surface.
- **Student / holder.** Views their issued credentials and generates a shareable proof for a verifier. Selects exactly what to reveal (a degree claim, or specific courses).
- **University / issuer.** Issues and revokes credentials and authorizes issuer wallets. Admin-gated (the backend requires an `x-admin-api-key` header on every `/university/*` route).

Navigation model: **landing hub → role sub-pages.** The hub asks "who are you here as?" with three cards (*I'm verifying · I'm a student · I'm the university*), each routing to its own page. This keeps the three audiences cleanly separated rather than crammed into one screen, and it reads well to a first-time visitor who may be any of the three.

---

## 2. Look and feel

**Mood: dark & premium.** Near-black canvas, maroon/plum surfaces, dusty-mauve text and accents. The result should feel like a serious security product that happens to be beautiful — closer to a hardware-wallet or audit-tool aesthetic than a SaaS dashboard.

### Palette mapping

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#191716` | App canvas (near-black, faintly warm) |
| `--surface` | `#231c1d` | Cards / panels (derived: bg lifted toward maroon) |
| `--surface-2` | `#2c2224` | Inputs, insets, nested panels (derived) |
| `--maroon` | `#440D0F` | Deep brand maroon — primary button base, hero accents |
| `--plum` | `#603A40` | Borders, secondary surfaces, hover states |
| `--plum-2` | `#84596B` | Muted accents, chips, focus rings |
| `--mauve` | `#AF9BB6` | Primary text accent, links, headings highlight |
| `--text` | `#EDE6EA` | Body text (mauve-tinted off-white, derived for contrast) |
| `--muted` | `#9A8A92` | Secondary text (derived) |

Because the five brand colors are all dark-to-mid and none is a true light, I derive two near-white text tones and two surface tones from the palette so body copy clears WCAG AA on the dark canvas. The five originals carry brand, borders, and accents; the derived tones carry legibility. Status colors (valid / invalid / revoked) are tuned to sit harmoniously with the maroon family rather than using generic traffic-light green/red.

### Typography

**Serif headers + sans body.** A serif display face for page titles, the hero, and the verify result headline gives the certificate-like authority the product implies; a clean sans keeps dense UI and data readable. To avoid a network dependency and keep the dev server self-contained, the first pass uses high-quality font stacks (serif: `Georgia, 'Times New Roman', ... ` → swappable for a webfont like *Fraunces* or *Spectral* later; sans: the system UI stack). Swapping in a webfont is a one-line change in `styles.css`.

---

## 3. Information architecture

```
/                     Landing hub — three role cards + one-line product pitch
/#/verify             Verifier flow  (built this pass)
/#/student            Holder dashboard (designed placeholder this pass)
/#/university         Issuer console  (designed placeholder this pass)
/#/smoke              Endpoint smoke test (preserved dev tool)
```

Routing is a tiny **dependency-free hash router** (~30 lines). Rationale below in §6.

---

## 4. Screen-by-screen

### 4.1 Landing hub
A short serif hero — *"Prove what you earned. Reveal only what you choose."* — over the dark canvas, then three role cards. Each card has an icon, a title, a one-line description, and a quiet "enter" affordance. A global header carries the **Diploma Verifier** wordmark and the **Connect Wallet** control; the footer carries build/links.

### 4.2 Verify page (the hero, fully built)
The verifier's job is to take a proof a student handed them and get a clear yes/no. Flow:

1. **Choose what you're checking** — a segmented control with three modes:
   - **Degree** (default) → `POST /verify/degree`. Confirms *graduated, this major, this year*. No grades involved.
   - **Course** → `POST /verify/full`. Confirms a specific course/credit/grade record.
   - **Status** → `GET /verify/status/:credentialId`. Quick "is this credential live / revoked?" check.
2. **Provide the proof** — one input that accepts **either paste or file upload**: a monospace textarea pre-shaped with the expected fields, plus a "Load from file…" button that reads a student-exported `.json` into the same textarea. The two stay in sync so the verifier can paste, tweak, or drop a file interchangeably.
3. **Verify** — calls the real backend, times the round-trip, and renders a **result banner**: a large serif `VALID` / `NOT VALID` / `REVOKED` headline with the claimed fields beneath (e.g. *Bachelor of Engineering · Cybersecurity · 2026*) and the raw JSON response in a collapsible drawer for the technical user. A `404` (unknown credential) renders as an explicit "credential not found" state rather than a scary error, matching the smoke-test philosophy that the route is reachable.

The privacy point is reinforced in copy on this page: for a degree check, the panel notes *"This check reveals only the degree claim. The transcript and grades are never transmitted."*

### 4.3 Student dashboard (designed, placeholder this pass)
Connect wallet (or paste an address) → list credentials from `GET /student/credentials/:walletAddress` → pick a credential → **compose a proof**: choose the degree leaf and/or specific courses (`POST /student/generate-proof` with `courseIds`/`includeDegree`) → receive a proof payload they can **copy or download as `.json`** to hand to a verifier. This is the natural mirror of the Verify page.

### 4.4 University console (designed, placeholder this pass)
Admin-key field (stored in memory only) → three actions mapped to the gated routes: **Issue** (`/university/issue`, the big form: holder, degree, transcript rows), **Revoke** (`/university/revoke`), **Authorize issuer** (`/university/add-issuer`). The console makes the 401-without-key behavior legible rather than surprising.

---

## 5. Component inventory (reusable)

`Layout` (header + footer shell) · `WalletButton` (connect / address pill) · `RoleCard` (landing) · `SegmentedControl` (verify mode) · `ProofInput` (paste + upload, shared by Verify and Student) · `ResultBanner` (valid/invalid/revoked) · `JsonDrawer` (collapsible raw response) · `Field` (labeled input) · `Button` (primary/ghost) · `Badge` (status). All driven by the design tokens so a palette tweak propagates everywhere.

---

## 6. Engineering decisions

**Zero new dependencies (this pass).** You run `npm run dev` on Windows; my build sandbox is Linux. Installing packages with native binaries (vite/esbuild) from the sandbox can write Linux binaries into your Windows `node_modules` and break the dev server. To avoid that entirely, Phase 1 adds **no npm packages**: routing is a small hand-written hash router, and wallet connect uses the injected `window.ethereum` (EIP-1193) directly — no `react-router-dom`, no `wagmi`/`ethers` on the client yet. Everything runs on the packages already in `package.json`.

When we're ready to add libraries (e.g. `react-router-dom` for nested routes, or `wagmi` + `viem` for richer wallet UX), the clean path is: you run `npm install <pkg>` on Windows yourself, then I wire it up. I'll flag any feature that genuinely needs a dependency.

**Wallet = connect + paste.** The header offers **Connect Wallet** (MetaMask via `window.ethereum`), and every place that needs an address also accepts a pasted address so the app is fully usable for demos without an extension.

**Backend contract is unchanged.** The frontend only consumes existing routes; `endpoints.ts` remains the single source of truth for paths and sample bodies. No backend logic is touched.

**Smoke test preserved.** The existing endpoint smoke-test page moves to `/#/smoke` so we keep the working diagnostics tool while the real UI grows.

---

## 7. What ships in this pass vs. later

| Area | This pass | Later |
|---|---|---|
| Design system (tokens, type, components) | ✅ | Webfont swap, motion polish |
| App shell + hash router + wallet connect | ✅ | `react-router-dom` if nesting grows |
| Landing hub | ✅ | Illustration / animated hero |
| **Verify page (degree/course/status, paste+upload, result banner)** | ✅ **working on real backend** | QR scan input |
| Student dashboard | Designed placeholder | Full credential list + proof composer |
| University console | Designed placeholder | Full issue/revoke/add-issuer forms |

---

## 8. Open questions for you

1. **Webfont**: happy with system serif for now, or want me to wire a specific display serif (e.g. *Fraunces*, *Spectral*, *Playfair Display*)? It needs one dependency-free `<link>` or a self-hosted file.
2. **Degree vs. course emphasis**: I've made *Degree* the default verify mode since it's the privacy headline. Agree, or should *Status* (fastest check) lead?
3. **Next page to build for real** after this pass — Student (proof composer) or University (issuer console)?
