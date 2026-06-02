# Build Prompt for Base44 — "Excellent Health Platform" (CIS / EMR)

You are building **Excellent Health Platform (EHP)** — an AI-first, Thai-language Clinical Information System (CIS / EMR) for hospital and clinic use. The product replaces traditional HOSxP-style dense data-entry forms with an **ambient AI assistant** named **หมอเมย์ (Mor May)** who reduces manual input through voice, document, and natural-language flows.

---

## Product positioning

- **Target users**: Thai doctors, nurses, OPD registration staff, and hospital admins.
- **Language**: Primary UI in Thai (use `Sarabun`). All medical terms and labels in Thai.
- **Tone**: Modern, clean, premium. Inspired by Apple-grade interaction design, but information-dense like a hospital system. NOT a consumer chatbot — it must look like a serious medical workstation.
- **Core promise**: "Reduce manual input as much as possible." Doctors talk or describe → AI extracts structured data → user confirms → save.

---

## Tech stack expectations

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (use `@theme` for tokens), HeroUI 2.8 components (NOT raw Tailwind form controls — always reach for HeroUI Input/Select/Button/Modal/Tabs first)
- **Animation**: Framer Motion 12 (use `layout` prop, `AnimatePresence`, spring transitions liberally — the product must feel alive)
- **Routing**: react-router v7
- **Icons**: @tabler/icons-react (default) + lucide-react where needed
- **Font**: Sarabun via Google Fonts (weights 400/500/600/700), loaded in `index.html` and aliased to `--font-sans`
- **Voice**: Browser MediaRecorder + VAD (voice activity detection); send PCM frames to an OpenAI-compatible ASR endpoint (Qwen3-ASR-1.7B). Implement live streaming transcript with 2-speaker diarization.
- **LLM**: Gemma 3 27B served via vLLM, OpenAI-compatible chat completions. Used for structured extraction of patient data into an **A2UI v0.8 form spec** (flat component list + data map + actions).

---

## Information architecture — 5 top-level groups (Hick's Law)

Group ~20+ menus into 5 buckets:

1. **Patient Care** (ผู้ป่วย) — registration, OPD queue, telehealth, referral
2. **Clinical** (เวชกรรม) — service stations, specialty clinics, EHR, orders
3. **Finance** (การเงิน) — payments, claims submission
4. **Insights** (ภาพรวม) — reports, analytics, inventory
5. **System** (ระบบ) — settings, system administration, user management

---

## Global chrome

### 1. Persistent header strip (top of every screen)

- Left: **Excellent Health Platform** logo
- Right cluster: fullscreen toggle, notifications bell, **violet sparkles button labeled "ถามหมอเมย์ (⌘K)"** (hidden on `/ai` page), user profile avatar
- Sits above all pages, never tears down on navigation

### 2. Mac-style Dock (top-center, floating)

- Pill-shaped capsule with hover magnification (rAF-driven scale based on cursor distance)
- 7 visible icons + "show all" overflow → modal
- One **active black pill** ("liquid metaball" morph via Framer Motion `layoutId`) tracks the current route
- Supports three item kinds: `icon` (Tabler icon), `label-icon` (SVG or Tabler icon + inline text label), and `divider`
- On `/ai` route: replaces full dock with a slim grouped 6-item version (active pill = **หมอเมย์** with sparkles, then 5 group icons)

### 3. Dynamic Island activity pill (next to dock)

- When dictation/recording is active, an animated pill slides in beside the dock showing live transcript + a stop button
- Survives navigation (so a recording started on one screen keeps going on the next)

### 4. Aiva Drawer (global, ambient AI)

- Right-side 420px drawer, summoned with **Cmd/Ctrl + K** from anywhere except `/ai`
- Inside: doctor mascot, greeting, 4 quick-prompt chips, prompt bar with mic
- Has a "maximize" button → navigates to `/ai`
- Dismiss with Esc or click-outside

---

## Pages / routes

### `/` — Home dashboard

- Header card: doctor mascot + "สวัสดีคุณ, นพ. ชารีฟ ราอูล" + "ต้องการอะไรบอก**หมอเมย์**ได้เลย" (with rose→violet→blue gradient on "หมอเมย์")
- **AI Feature Panel** (replaces the old "frequently used menu"): 2×2 grid of 4 AI capabilities, each with a colored icon circle (violet/emerald/amber/blue), a Thai title, and 2 bullet sub-features:
  1. **บันทึกประวัติผู้ป่วยอัตโนมัติ** — สแกนบัตรประชาชน, ซักประวัติผู้ป่วย — links to `/patient/new`
  2. **สรุป SOAP จากบทสนทนา** — บันทึกเสียง, ร่าง SOAP — links to `/ai`
  3. **แนะนำรหัส ICD-10 อัตโนมัติ** — เสนอรหัสจากอาการ, ตรวจสอบความถูกต้อง — links to `/ai`
  4. **ผู้ช่วยค้นคว้าทางคลินิก** — ค้นคู่มือเวชปฏิบัติ, สรุปงานวิจัย — links to `/ai`
- Below: a row of feature/marketing cards (Today's appointments, Smart card, Telehealth) using image-backed cards

### `/ai` — AI Health Assistant ("หมอเมย์" full-mode)

- **Entry effect**: cinematic — vignette darkens edges then clears, a bright white core flash pops, a large violet halo bloom expands, 3 concentric sonar rings ripple outward with stagger, 10 sparkle particles radiate. Content cascade (panel → mascot → greeting → search bar → cards) starts AFTER the effect peaks (~0.7s), so the effect is never cut short.
- Background: pink → lavender → blue vertical wash
- **Outer translucent white panel** (rounded-[40px], bg-white/80, backdrop-blur)
- **Top row**: Mascot (absolutely positioned, `-left-6 top-2 h-[200px]`, **horizontally mirrored** with `-scale-x-100`, sits behind cards via `z-0` so cards overlap it) on the left + greeting block to the right of the mascot + search/prompt pill on the far right
  - Greeting copy: "สวัสดีคุณ, นพ. ชารีฟ ราอูล" / "มีอะไรต้องการ ?" / "บอก**หมอเมย์**ได้เลย" (gradient on หมอเมย์)
  - Search pill: `border-[#9db6fb]`, glow shadow, contains `+` button, text input, mic button, and a black circular search button
- **2×2 feature cards** below, each:
  - `rounded-[40px]`, white, `h-[254px]`, `border-[#efefef]`
  - Left column: violet doc-sparkle icon + Thai title (`text-[22px] font-bold`) + 2 bullet rows (violet Tabler icon + label in `text-[#777]`)
  - Right column: isometric scan-strip decoration image (PNG) absolutely positioned, half-overflowing the card edge

### `/patient/new` — **NewPatientByVoice** (voice-first patient intake)

- 3 phases: `input` → `extracting` → `review`
- **Input phase**: large textarea (or live transcript), mic button, device-audio (tab capture) button, "หรือกรอกแบบฟอร์มเอง" link → `/patient/new/manual`
  - User can speak freely ("ผู้ป่วยชาย อายุ 45 ปี ปวดหัว ความดัน 140/90 ...") or paste OCR'd ID-card text
- **Extracting phase**: isometric perspective visualizer
  - Apply CSS `transform: matrix(1, -0.18, -0.5, 0.7, 0, 0)` to create the iso skew
  - A module-card box on the left with a label like "patients"
  - 3 stacked field blocks on the right (HN, name, demographics) that animate in
  - SVG connector lines flow between the module box and each field block, animated via `stroke-dashoffset`
- **Review phase**: render an **A2UI form** from the LLM's response
  - A2UI v0.8 spec = flat component list + data map + actions (save_patient is the primary action; fallback aliases: apply_all, save, confirm, submit, apply)
  - Renderer must support: `text`, `field` (HeroUI Input — text/number/date), `section` (titled group with optional accent), `stack` (vertical group)
  - **CRITICAL**: section/stack containers must render as a 2-column CSS grid `gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)"`. Use `minmax(0, 1fr)`, NOT `1fr`, because HeroUI Input has intrinsic min-content width that will force tracks to expand. Multi-line fields (`field.multiline === true`) must span both columns with `gridColumn: "1 / -1"`
- On save: persist patient, call `addPatient + saveProfile`, then `navigate('/patient/${hn}', { state: { freshSave: { fields } } })` to trigger a celebration animation on the destination

### `/patient/:hn` — **PatientOPDCard** (HOSxP-style dense patient record)

- Information-dense layout with tabs (vitals, diagnoses, orders, prescriptions, notes, lab, imaging, billing)
- On entry with `location.state.freshSave`, render **SaveCommitOverlay**:
  - Left: a "module" card flying in
  - Right: a stack of field rows (avatar circle + label + value + animated progress bar) flying in with stagger
  - Configurable accent color (violet/emerald/blue)
  - 2.2s total duration, calls `onComplete` callback when done; after that, clear `history.state` so refresh doesn't replay it

### `/patient/new/manual`

- Fallback to a traditional dense patient registration form for users who prefer manual input (same `PatientOPDCard` component in a "new" mode)

---

## Key components to implement

| Component | Purpose |
|---|---|
| `AppShell` | Top-level layout with header, dock, dynamic island, drawer, route outlet. Cmd+K binding lives here. |
| `GlobalHeader` | Logo + fullscreen + notifications + violet "ถามหมอเมย์" sparkle button + profile |
| `MacDock` | Hover-magnifying pill dock with active-state morph |
| `DictationIsland` | Activity pill beside dock — shows live recording state + transcript snippet |
| `AivaDrawer` | Right-side ambient AI drawer |
| `DictationProvider` (context) | Manages global recording session — startSession("mic" \| "tab"), stopSession, isRecording, segments[] |
| `HeaderSlotProvider` (context) | Lets pages inject content into the global header |
| `A2UIRenderer` | Renders an A2UI spec into HeroUI components with the 2-column grid rule |
| `SaveCommitOverlay` | Post-save celebration animation |
| `NewPatientByVoice` | Voice/text intake → extract → review → save |
| `Home` AI Feature Panel | 4-card grid linking to AI flows |
| `AIMode` | Full-mode AI page |
| `GlobalLiveCaption` | Modal showing the live transcript — survives navigation |

---

## Design tokens

- **Primary AI accent**: violet (`#a07dff`, `#7c5cff`)
- **Greeting gradient**: `linear-gradient(90deg, #ff8789 0%, #ff8789 50%, #3485ff 75%, #aa7edf 100%)` — applied as `bg-clip-text` on the "หมอเมย์" text
- **AI background wash**: `linear-gradient(180deg, #fdf2f6 0%, #f5eefe 40%, #e9eafd 75%, #c9d4ff 100%)`
- **Card border**: `#efefef`, `rounded-[40px]`, soft white shadow
- **Search bar border**: `#9db6fb` with shadow `0 4px 50px rgba(157,182,251,0.4)`
- **Body text muted**: `#777`
- **Body text primary**: `#1f1f1f`
- Disable browser overscroll/bounce globally: `html, body { overscroll-behavior: none }`

---

## Behavior rules (non-obvious — important)

1. **Voice input lives in a context** so recording survives navigation. The DictationIsland and GlobalLiveCaption both subscribe to the same context.
2. **`/ai` greeting weight**: subtitle line ("บอกหมอเมย์ได้เลย") is the heaviest weight (bold + gradient). The "มีอะไรต้องการ ?" line is medium weight. The "สวัสดีคุณ..." line is regular muted.
3. **Mascot z-stacking on `/ai`**: mascot is `z-0`, greeting header and feature grid are `z-10`. So the mascot's body is partially hidden behind the cards — only the head/shoulders peek above. This is intentional ("offset stacked").
4. **Dock active pill**: uses Framer Motion `layoutId="dock-active-pill"` so it morphs liquid-metaball-style between targets when route changes.
5. **Cmd+K is suppressed on `/ai`**: don't open the drawer there because the user is already in full Aiva mode.
6. **Save flow**: save immediately on confirm; navigate to destination with `state.freshSave`; destination plays the celebration overlay; clear `history.state` so refresh doesn't replay.
7. **A2UI 2-column rule**: section/stack render as 2-column grid using `minmax(0, 1fr)` (NOT `1fr`); short fields span 1 column, `multiline` fields span both. Without `minmax(0, 1fr)`, HeroUI Input's intrinsic content width breaks the layout into 1 column.
8. **No emojis in UI or code** — use Tabler icons.

---

## Mock data shape

- **Patient**: `{ hn, title (นาย/นาง/นางสาว), firstName, lastName, gender, birthDate, age, idCard, phone, address, allergies[], chronicDiseases[], bloodType, height, weight, bmi, ... }`
- **Encounter / OPD visit**: `{ visitId, hn, date, chiefComplaint, vitals, diagnoses[], orders[], prescriptions[], soap{S,O,A,P}, icd10[] }`
- Seed with ~10 mock patients in Thai. Store in localStorage so add/edit persists across reloads.

---

## Out of scope (don't build these)

- Real backend / database (use localStorage + mock data)
- Real ASR (mock the transcript stream or use Web Speech API as a fallback)
- Authentication / RBAC
- Multi-tenant org switching
- Internationalization (Thai only is fine)
- Print-friendly views

---

## Acceptance criteria

- [ ] Cmd+K opens Aiva drawer from any page except `/ai`
- [ ] `/ai` entry effect plays for ~1.6s, content cascade starts at 0.7s and finishes by ~1.8s
- [ ] Mascot on `/ai` is horizontally mirrored and sits behind feature cards
- [ ] Dock active pill morphs smoothly between routes
- [ ] On `/ai`, dock shows the slim 6-group layout with active "หมอเมย์" pill (icon + text inline)
- [ ] `/patient/new` voice mode: speak → extracting visualizer with iso perspective + animated connector lines → A2UI form rendered in 2 columns on desktop
- [ ] After saving a new patient, navigating to `/patient/:hn` plays the SaveCommitOverlay celebration once
- [ ] Recording started on Home survives navigation to `/patient/new`
- [ ] Page does not bounce/overscroll
- [ ] All UI text is in Thai with Sarabun font

---

## Reference visual cues (Figma vibe)

- Pink-cream-lavender gradient backgrounds
- White cards with `rounded-[40px]` and `border-[#efefef]`
- Doctor mascot is a stylized 3D-rendered female doctor character with purple hair, glasses, white coat, stethoscope, arms crossed
- Decorative isometric "scan strip" sticker on AI cards
- Heavy use of Framer Motion `layout` for swaps and `AnimatePresence` for enter/exit
- Bright violet sparkles iconography for all AI affordances

Build this. Prioritize the AI flows (`/ai`, `/patient/new` voice intake, Aiva drawer, dock) first — those are the differentiators. Traditional CRUD screens can use plain HeroUI forms with default styling.
