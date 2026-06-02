# Design System — CIS 2026

Art direction notes for the redesigned CIS frontend. Use these rules as the source of truth when building new screens or components. The aesthetic should feel **solid, 3D, glassy, and cinematic** — closer to Apple TV / visionOS than a typical web admin panel.

---

## 1. Core principles

1. **Physicality first.** Every interactive surface should look like it has weight, edge, and a light source. Avoid flat 1-shadow boxes; layer at least one drop shadow + one inset highlight.
2. **Glass over photography.** The page lives over a fixed hero image. Chrome (nav, dock, neutral pills) is translucent + backdrop-blurred so the photo is always implied behind the UI.
3. **Solid for action.** Color CTAs (primary blue, gradient stat cards) get a top→bottom gradient + crisp rim + inset bottom shadow to read as pressable buttons, not painted regions.
4. **Big-picture motion.** Entrance animations are slow, blur-resolving, and staggered (`ease [0.16, 1, 0.3, 1]`). Hover states are confident lifts with halo glow, not 50ms underlines.
5. **One Thai-friendly font family.** `Google Sans` with `Noto Sans Thai` fallback — already wired in `index.css`.

---

## 2. Color tokens

Use the existing CSS vars from [src/index.css](src/index.css); only hard-code when matching the Figma asset palette.

| Token | Hex | Use |
|---|---|---|
| Primary | `#3485ff` | Active states, primary CTAs (paired with gradient) |
| Primary deep | `#2470e6` | Bottom stop of primary gradient |
| Primary light | `#5a9fff` | Top stop of primary gradient |
| Accent green | `#34A853` → `#3eaf3f`/`#64ef79` | "ตรวจเสร็จ" stat card gradient |
| Accent amber | `#FBBC05` → `#ffb300`/`#ffd268` | "รอตรวจ" stat card gradient |
| Accent sky | `#98c1ff` → `#2d82ff` | "ผู้ป่วยใหม่" stat card gradient |
| Danger | `#ff383c` | Required asterisks, destructive states |
| Foreground | `#18181b` | Default text |
| Foreground muted | `#71717a` | Secondary text, inactive tabs |
| Surface | `#ffffff` / `bg-white/65` for glass |
| Card hairline | `#d9d9d9` | Light borders on neutral cards |
| Background neutral | `#f8f8f8` | Calm card fills (action cards) |
| Background page | `#fafbfc` | OPD page bg behind the white scroll panel |

Hover glow tint for primary actions: `rgba(52,133,255,0.35)`.
AI / sparkle accent: radial `#c5a4ff → #6a4cff → #3b1eaa`.

---

## 3. Elevation & material recipes

Always stack shadows. The shorthand below assumes a light, slightly above-center light source.

### Glass chrome (nav pills, dock, neutral overlays)
```
bg-white/65 backdrop-blur-xl border border-white/40
shadow:
  0 8px 24px rgba(0,0,0,0.12)              ← drop
  inset 0 1px 0 rgba(255,255,255,0.9)      ← top light edge
  inset 0 -2px 4px rgba(0,0,0,0.04)        ← bottom weight
```

### Solid 3D action button (primary CTA)
```
bg-gradient-to-b from-[#5a9fff] to-[#2470e6]
border border-[#2470e6]/40
shadow:
  0 10px 28px rgba(52,133,255,0.45)        ← colored glow
  0 2px 4px rgba(0,0,0,0.15)               ← crisp contact shadow
  inset 0 1px 0 rgba(255,255,255,0.4)      ← top light
  inset 0 -2px 4px rgba(0,0,0,0.18)        ← bottom press groove
```
Same recipe for neutral solid buttons — swap fill to `from-white to-[#e8e8ea]`, border to `white/60`, drop to `rgba(0,0,0,0.12)`.

### Solid color card (stat tiles)
Keep the figma gradient fill, layer in:
```
shadow:
  0 18px 40px rgba(0,0,0,0.22)             ← grounding
  0 2px 4px rgba(0,0,0,0.1)                ← contact
  inset 0 1px 0 rgba(255,255,255,0.5)      ← glass-edge highlight
  inset 0 -3px 8px rgba(0,0,0,0.12)        ← bottom rim shadow
```

### Floating sphere (AI mic, hero accents)
Add inset both ways to fake a curved surface:
```
shadow:
  0 14px 40px rgba(106,76,255,0.55)        ← halo
  0 2px 6px rgba(0,0,0,0.25)               ← contact
  inset 0 2px 4px rgba(255,255,255,0.45)   ← top sheen
  inset 0 -6px 12px rgba(40,16,90,0.6)     ← dark side of the sphere
```

### Form field (Figma `field/*` tokens)
Subtle, almost-invisible at rest:
```
bg-white rounded-[12px] h-[50px]
shadow:
  0 2px 4px rgba(0,0,0,0.04)
  0 1px 2px rgba(0,0,0,0.06)
  0 0 1px rgba(0,0,0,0.06)
```
Label above field: `text-sm font-medium text-[#18181b]`, required asterisk `text-[#ff383c]`, `mb-2` to the input.

---

## 4. Radii

Two scales — pick the one closer to the role:

| Scale | Value | Use |
|---|---|---|
| Pill | `rounded-full` | Buttons, dock items, nav chips |
| Card sm | `rounded-xl` (12px) | Form fields, inline button addons |
| Card md | `rounded-3xl` (24px) | Action cards, sub-tabs container, inner panels |
| Card lg | `rounded-[32px]` | Page wrapper, dock pill on Home |
| Card xl | `rounded-[40px]` | Stat cards, menu thumbnails |

Never mix more than two radii on a single screen.

---

## 5. Typography scale

| Size | Use |
|---|---|
| `text-[96px] font-bold` | Hero stat numbers (e.g. "20") |
| `text-[48px] font-medium` | Secondary stat numbers ("5", "15", "3") |
| `text-[36px] font-bold` | Hero hospital name |
| `text-2xl font-bold` | Section headings ("เมนูที่ใช้บ่อย"), card titles on dark photo cards |
| `text-2xl font-medium` | Card category labels (stat tiles, profile) |
| `text-xl` | Greeting subtitle, "ราย" units |
| `text-base font-medium` | Buttons, body text |
| `text-sm` | Form labels, sub-tab labels |
| `text-xs uppercase tracking-wide` | Toast tone label, micro-eyebrows |

Heavy text over photography gets `drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]`; body text over photography uses `drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)]`.

---

## 6. Motion

All motion uses Framer Motion. Two custom ease curves do all the work:

```ts
const EASE_TV = [0.16, 1, 0.3, 1];           // out-expo soft — entrances, hovers
const EASE_POP = [0.34, 1.4, 0.5, 1];        // mild spring overshoot — emphasis pops
```

### Entrance choreography (Home)
- Hero photo: Ken Burns — `scale 1.12 → 1`, `blur(16px) → 0`, 1.8s
- Chrome (nav): slide down + blur-resolve, 1.2s with 300ms delay
- Content sections: stagger container with `delayChildren ≈ 0.2–0.75s`, `staggerChildren ≈ 0.04–0.08s`, each child `fadeUpBlur` (`y 24 → 0`, `blur(12px) → 0`, opacity, 700ms)
- Floating extras (dock, mic): 800–1100ms delay, blur-resolve, mic uses `EASE_POP` for a soft overshoot

Total entry is ~2.2s. Keep it under 2.5s — feels deliberate without losing user attention.

### Hover (smart-TV cards)
```
scale 1.06, y -4
shadow upgrades to 0 24px 60px rgba(0,0,0,0.45)
inner image: scale 1.12, brightness 1.08, saturate 1.15
overlay darkens slightly to preserve label contrast
gradient halo (-inset-3, blur-2xl) fades 0 → 100% opacity behind the card
duration 450–700ms on EASE_TV
```
Tap: `scale 0.97`. Keyboard focus mirrors hover.

### Hover (buttons)
Lighter than cards: `scale 1.03–1.06`, shadow upgrades to the colored-glow version. Always include `whileTap: { scale: 0.96–0.97 }`. Force `data-[hover=true]:!opacity-100` on HeroUI Buttons to defeat its default opacity dim.

---

## 7. Layout & scroll patterns

- **Home** is full-bleed, scrolling page over the fixed hero. Sticky header keeps the EHP logo + user pill anchored.
- **OPD Registry** (`PatientOPDCard`) is a chromeless full-height shell:
  - Outer: `h-screen overflow-hidden flex-col`
  - Top nav: fixed
  - White card panel: `rounded-t-[32px]`, flex-1, no overflow itself
  - Non-scrolling page header band inside the card (back + title + Save)
  - Body grid: sidebar (no scroll) | right column (`overflow-y-auto` only here)
- **Dock** comes in two variants: `floating` (rounded-full, hovering above content, used on Home) and `docked` (rounded-t-only, pinned to viewport bottom on sub-pages).

---

## 8. Components

### `MacDock` (`src/components/MacDock.tsx`)
- `floating` variant: macOS magnification (`baseSize 64`, `maxScale 1.6`)
- `docked` variant: static, smaller (`baseSize 40`, `maxScale 1`)
- Active item: black circle, white-stroked SVG (`dock-home.svg` ships white-by-default; do not invert)
- Glass container per recipe in §3
- Single `requestAnimationFrame` loop writes width/height directly to DOM — no React re-renders during hover

### `PatientOPDCard`
- Field-level: use `Field` + `TextField` / `SelectField` / `TextAreaField` wrappers — they enforce the label + shadow recipe in §3
- Required asterisk: `text-[#ff383c]`, never `text-red-500`
- Inline button addons (e.g. `กำหนดเอง`, `การแพ้ยา`, `ที่อยู่`): live as the input's `endContent`, not a sibling `<button>`
- Date / time inputs: leading `IconCalendarEvent` and a `ToggleChip` "ไม่ทราบ" inside the input

### `Tabs` (HeroUI)
- Always use HeroUI `<Tabs>` / `<Tab>` for tab bars
- Sub-tab "chip bar" style (Figma `Tabs` component): `bg-black/5` track, `bg-white shadow` cursor pill, `text-[#71717a]` inactive, `text-[#18181b] font-medium` active
- For vertical nav menus that need full-width children, use a plain `<ul>` of `<button>`s — HeroUI's Tab cell fights `w-full`

### Action cards (`ActionCard`)
- `bg-[#f8f8f8]` + `border-[#d9d9d9]` + `rounded-3xl`
- Image bleeds off the right with a left-to-right fade matching the card bg
- Inline pill button at bottom-left with the soft `0_4px_12px_(0.06)` drop shadow

### Toast (`ToastProvider`)
- Tone-colored glass pill, top-right
- Use `useToast()` — never roll one-offs
- Default durations: success/info 4.6s, warning 5.6s, error 6.8s

---

## 9. Assets

All Figma-sourced assets live in [src/assets/figma/](src/assets/figma/). Naming convention: `{category}-{label}.{ext}` (e.g. `card-smartcard.png`, `icon-calendar-event.svg`, `dock-home.svg`).

Do not import Figma localhost (`localhost:3845/...`) URLs — those expire as soon as the desktop app moves off the node. Always download into the assets folder first.

---

## 10. What not to do

- Don't use HeroUI's default Button shadow / variants in isolation — wrap with the elevation recipes above
- Don't pile on more than 3 corner radii or 3 shadow shapes on one screen
- Don't fade text below `0.7` opacity over hero photography (use drop-shadow instead)
- Don't snap-animate (≤200ms) entrance content; reserve that for instant feedback (toggle, tap)
- Don't use 1px hairline `border-gray-200` on glass surfaces — use `border-white/40` so the glass edge reads
