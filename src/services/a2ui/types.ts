// Minimal A2UI-shaped schema for ehp-cis. Matches the A2UI v0.8 idea of a
// flat component list with ID references + an external data map, so LLMs can
// stream patches and the renderer can resolve bindings lazily.

export type A2UINodeId = string;
export type A2UIBindingKey = string;

export type A2UIPaletteTone =
  | "default"
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "indigo"
  | "teal"
  | "slate";

export type A2UINode =
  // -------- Primitive layout & content ---------------------------------
  | { id: A2UINodeId; type: "section"; title?: string; tone?: "default" | "accent"; children: A2UINodeId[] }
  | { id: A2UINodeId; type: "row"; children: A2UINodeId[] }
  | { id: A2UINodeId; type: "stack"; children: A2UINodeId[] }
  | { id: A2UINodeId; type: "heading"; text: string; level?: 1 | 2 | 3 }
  | { id: A2UINodeId; type: "text"; value: string; tone?: "default" | "muted" | "danger" | "success" }
  | {
      id: A2UINodeId;
      type: "field";
      label: string;
      binding: A2UIBindingKey;
      multiline?: boolean;
      placeholder?: string;
      required?: boolean;
    }
  | { id: A2UINodeId; type: "badge"; label: string; color?: "blue" | "orange" | "red" | "green" | "gray" }
  | {
      id: A2UINodeId;
      type: "button";
      label: string;
      action: string;
      variant?: "primary" | "ghost" | "danger";
      iconHint?: "insert" | "copy" | "discard" | "edit" | "sparkles";
    }
  | { id: A2UINodeId; type: "list"; items: string[]; ordered?: boolean }
  | { id: A2UINodeId; type: "citation"; segmentIndex: number; preview: string }

  // -------- Gallery blocks distilled from the current design -----------
  // Use these instead of stacking primitives when the screen calls for a
  // recognized pattern from the ehp-cis design language.

  /**
   * Cinematic image-backed tile (Home menu cards, AllMenuModal modules,
   * Article cards). Bottom-gradient veil + bold label, optional chip and
   * meta line.
   */
  | {
      id: A2UINodeId;
      type: "image-tile";
      img: string;
      title: string;
      chip?: string;
      meta?: string;
      action?: string;
    }

  /**
   * Hero metric card (the patient count / appointment count cards at the
   * top of Home). Large number + label + tinted icon plate.
   */
  | {
      id: A2UINodeId;
      type: "stat-card";
      value: string;
      label: string;
      sublabel?: string;
      iconHint?: string;
      tone?: A2UIPaletteTone;
      trend?: "up" | "down" | "flat";
      trendLabel?: string;
    }

  /**
   * Solid-color action tile with icon plate + title + caption (the smart-card
   * and appointment cards on PatientOPDCard). Whole card is clickable.
   */
  | {
      id: A2UINodeId;
      type: "action-card";
      title: string;
      caption?: string;
      iconHint?: string;
      tone?: A2UIPaletteTone;
      action?: string;
    }

  /**
   * Horizontal row of pill chips — for allergies, tag lists, ICD codes,
   * triage flags. Each chip can have its own color tone.
   */
  | {
      id: A2UINodeId;
      type: "chip-group";
      chips: { label: string; tone?: A2UIPaletteTone }[];
    }

  /**
   * Label / value row (e.g. "BP: 120/80 mmHg"). Combine many in a stack to
   * render a vital-signs / lab-result summary.
   */
  | {
      id: A2UINodeId;
      type: "info-row";
      label: string;
      value: string;
      tone?: "default" | "muted" | "danger" | "success";
      iconHint?: string;
    }

  /**
   * Tight 2-4 column grid of mini stat cards — vital signs, lab panels,
   * scheduling summaries.
   */
  | {
      id: A2UINodeId;
      type: "metric-grid";
      items: { label: string; value: string; tone?: A2UIPaletteTone; iconHint?: string }[];
      columns?: 2 | 3 | 4;
    }

  /**
   * Avatar pill (logo / profile / module icon + label). Renders as a tinted
   * round square with optional caption.
   */
  | {
      id: A2UINodeId;
      type: "avatar";
      label?: string;
      img?: string;
      initials?: string;
      iconHint?: string;
      tone?: A2UIPaletteTone;
      size?: "sm" | "md" | "lg";
    }

  // -------- Generative-dashboard primitives ----------------------------
  // Inline-SVG, dependency-free chart + timeline blocks so an LLM can
  // assemble a patient health dashboard from natural-language prompts.

  /**
   * Compact line chart for trends (vitals over time, weight curve, etc).
   * Series are rendered as separate strokes; X labels are evenly spaced
   * along the bottom.
   */
  | {
      id: A2UINodeId;
      type: "line-chart";
      title?: string;
      unit?: string;
      xLabels: string[];
      series: { name: string; tone?: A2UIPaletteTone; values: (number | null)[] }[];
      refBands?: { from: number; to: number; label?: string; tone?: A2UIPaletteTone }[];
      height?: number;
    }

  /**
   * Vertical bar chart — counts/totals, e.g. visits per month.
   */
  | {
      id: A2UINodeId;
      type: "bar-chart";
      title?: string;
      unit?: string;
      bars: { label: string; value: number; tone?: A2UIPaletteTone }[];
      height?: number;
    }

  /**
   * Vertical timeline of clinical events (visits, prescriptions, lab
   * results). Each entry shows a dot, date, title, and an optional
   * description body.
   */
  | {
      id: A2UINodeId;
      type: "timeline";
      title?: string;
      events: {
        date: string;
        title: string;
        body?: string;
        tone?: A2UIPaletteTone;
        iconHint?: string;
      }[];
    };

export type A2UINodeType = A2UINode["type"];

export interface A2UIResponse {
  rootId: A2UINodeId;
  components: A2UINode[];
  data?: Record<A2UIBindingKey, string>;
}

export interface A2UIActionEvent {
  action: string;
  data: Record<A2UIBindingKey, string>;
  source: A2UINodeId;
}

export interface A2UICiteEvent {
  segmentIndex: number;
}

/**
 * Validate a candidate object as a usable A2UIResponse. Returns the response
 * on success or null on failure. Failure is the host's signal to fall back
 * to plain-text rendering rather than render broken UI.
 */
export function validateA2UIResponse(raw: unknown): A2UIResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<A2UIResponse>;
  if (typeof r.rootId !== "string") return null;
  if (!Array.isArray(r.components)) return null;
  const ids = new Set<string>();
  for (const c of r.components) {
    if (!c || typeof c !== "object" || typeof (c as A2UINode).id !== "string") return null;
    if (typeof (c as A2UINode).type !== "string") return null;
    ids.add((c as A2UINode).id);
  }
  if (!ids.has(r.rootId)) return null;
  return r as A2UIResponse;
}
