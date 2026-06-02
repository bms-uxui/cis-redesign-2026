# UX Skills — Laws of UX

Reference notes from https://lawsofux.com/. Each entry: the law, what it means, and how to apply it when designing/building UI (especially for the dense HOSxP-style CIS).

---

## 1. Aesthetic-Usability Effect
Users perceive aesthetically pleasing design as more usable.
**Apply:** Polish visual details (spacing, typography, alignment) — a clean UI earns patience for minor friction.

## 2. Choice Overload
Too many options overwhelm users and stall decisions.
**Apply:** Limit primary actions per screen. Hide rarely-used options behind "More" / overflow menus.

## 3. Chunking
Group related pieces of information into meaningful units.
**Apply:** Break long forms/records into sections. Group lab values, vitals, meds under clear headings.

## 4. Cognitive Bias
Systematic thinking errors shape how users perceive a system.
**Apply:** Don't assume users read carefully. Reinforce critical info (allergies, drug interactions) visually.

## 5. Cognitive Load
The mental effort required to use an interface.
**Apply:** Reduce extraneous load — remove decoration, defer non-essential fields, surface only what's needed at this step.

## 6. Doherty Threshold
Productivity soars when system response is < 400ms.
**Apply:** Optimistic UI updates, skeleton loaders, prefetching. Never block on a spinner > 400ms without feedback.

## 7. Fitts's Law
Time to hit a target = function of its distance and size.
**Apply:** Make primary actions large and close to the user's current focus. Big tap targets on mobile/tablet (≥44px).

## 8. Flow
The state of full immersion in a task.
**Apply:** Avoid interruptions (modals, toasts) during data entry. Keep keyboard-driven workflows uninterrupted for clinicians.

## 9. Goal-Gradient Effect
Motivation increases as users get closer to a goal.
**Apply:** Show progress bars, step indicators ("Step 3 of 4"). Pre-fill where possible so users start "closer" to done.

## 10. Hick's Law
Decision time grows with number/complexity of choices.
**Apply:** Highlight a recommended/default action. Categorize long menus. Use progressive disclosure.

## 11. Jakob's Law
Users expect your site to work like the others they know.
**Apply:** Follow EMR/HOSxP conventions clinicians already use. Don't reinvent table interactions, search, or shortcuts.

## 12. Law of Common Region
Elements within a clear boundary are perceived as a group.
**Apply:** Use cards, panels, or bordered sections to bind related fields (patient identity, encounter, billing).

## 13. Law of Proximity
Objects near each other are perceived as related.
**Apply:** Tighten spacing within a group; widen spacing between groups. Don't rely on borders alone.

## 14. Law of Prägnanz (Simplicity)
The eye interprets ambiguous shapes in their simplest form.
**Apply:** Prefer simple geometric layouts. Reduce visual noise so structure reads instantly.

## 15. Law of Similarity
Similar-looking elements are perceived as related.
**Apply:** Same shape/color/typography = same function. Don't reuse a "warning red" for a non-warning element.

## 16. Law of Uniform Connectedness
Visually connected elements feel more related than nearby ones.
**Apply:** Use lines, shared backgrounds, or containers to express relationships stronger than proximity alone.

## 17. Mental Model
Users act based on what they *think* the system does.
**Apply:** Match clinical workflow vocabulary (visit, order, dispense). Avoid developer/db jargon in UI.

## 18. Miller's Law
Working memory holds ~7 (±2) items.
**Apply:** Don't expect users to remember values across screens. Show context (patient name/HN) persistently.

## 19. Occam's Razor
Prefer the solution with fewest assumptions.
**Apply:** Cut UI elements that don't justify their presence. Simplest layout that solves the task wins.

## 20. Paradox of the Active User
Users skip manuals and start using immediately.
**Apply:** Onboarding must be embedded — tooltips, empty states, inline hints. Don't depend on docs.

## 21. Pareto Principle (80/20)
~80% of effects come from ~20% of causes.
**Apply:** Identify the 20% of features clinicians use 80% of the time; make those frictionless. Bury the rest.

## 22. Parkinson's Law
Tasks expand to fill the time available.
**Apply:** Constrain input (max field lengths, deadlines, smart defaults) so users finish faster.

## 23. Peak-End Rule
People judge an experience by its peak and its end.
**Apply:** Invest in the best moment (clean confirmation screen) and the end (success state, summary).

## 24. Postel's Law (Robustness)
Be liberal in what you accept, conservative in what you send.
**Apply:** Accept dates/IDs/phones in multiple formats; normalize internally. Tolerate sloppy input gracefully.

## 25. Selective Attention
Users filter out most of what's on screen.
**Apply:** Don't rely on banners — users blind out repeating regions. Place critical alerts inline with the task.

## 26. Serial Position Effect
First and last items in a list are remembered best.
**Apply:** Put the most important nav/menu items at the start or end. Last action in a wizard should be the most memorable.

## 27. Tesler's Law (Conservation of Complexity)
Every system has irreducible complexity — someone has to handle it.
**Apply:** Absorb complexity in the UI/code rather than pushing it to clinicians (e.g., auto-compute BMI, age, dose).

## 28. Von Restorff Effect (Isolation)
The element that stands out is best remembered.
**Apply:** Use one strong accent for the primary CTA. If everything is highlighted, nothing is.

## 29. Working Memory
Temporary mental storage used while completing a task.
**Apply:** Keep relevant data visible during multi-step tasks. Don't make users recall info from a prior screen.

## 30. Zeigarnik Effect
Unfinished tasks are remembered better than finished ones.
**Apply:** Show pending/incomplete items (draft notes, unsigned orders) prominently to nudge completion.

---

# Border-Radius Rules
Source: https://blog.92learns.com/border-radius-rules/

## The Golden Formula
**Inner radius = outer radius − padding.**
A child sitting inside a rounded container should have a radius equal to the parent's radius minus the gap. Otherwise the "ring" between parent and child is visibly uneven.
- If padding ≥ outer radius → child gets 0 or a minimal 2–4px.
- In CSS: `border-radius: max(0px, calc(var(--radius) - var(--padding)))`.

## Sizing Scale (semantic tokens)
| Token | px | Use for |
|---|---|---|
| XS | 2 | Checkboxes, badges |
| S | 4 | Chips, small buttons |
| M | 8 | Inputs, standard buttons, small cards |
| L | 12 | Modals, larger cards |
| XL | 16–24 | Hero sections, sheets, bottom-sheets |
| Full | 9999 | Avatars, pill buttons |

In this codebase the theme exposes them as CSS variables: `--theme-radius-selector` (S/M), `--theme-radius-field` (M), `--theme-radius-box` (XL).

## Core Rules
1. **Golden Formula** — apply inner = outer − padding for every nested container/icon tile.
2. **Sibling consistency** — elements at the same hierarchy share the same radius. Don't mix `rounded-2xl` and `rounded-xl` on cards in the same row.
3. **Scale proportionally** — bigger elements get bigger radii; tiny elements get tiny radii.
4. **Hierarchy through shape** — primary action can be more rounded (pill) than its secondary peer to draw the eye.
5. **Use semantic tokens, not raw px** — easier theming + consistency.
6. **Clip inner images** — `overflow-hidden` + matching inner radius so images don't poke out of card corners.
7. **Proximity Principle (Apple)** — objects closer to the user are rounder; chrome (TopBar, Sidebar) can be calmer (M/L), interactive primary affordances can be Full.

## Common Mistakes (avoid)
- Same radius on parent and child → looks like a single block, no depth.
- Mixed radii on sibling cards in a row.
- Image bleeding past a rounded card edge.
- Hardcoding `rounded-[18px]` when the design system already has a token.
- Negative inner radius when padding exceeds outer radius — clamp to 0.
