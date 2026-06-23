import { useEffect, useMemo, useRef, useState } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { EventCalendar } from "@mui/x-scheduler/event-calendar";
import type {
  SchedulerEvent,
  SchedulerResource,
  SchedulerEventColor,
} from "@mui/x-scheduler/models";
import type { Appointment, AppointmentStatus } from "../data/mock/operational";
import { useTheme } from "../contexts/ThemeContext";

/**
 * Today's patient-appointment queue on the MUI X Event Calendar
 * (https://mui.com/x/react-scheduler/). Each appointment is a timed event
 * coloured by status, grouped by clinic as a filterable resource. Wrapped in a
 * neutral MUI theme ("Neutral vibes"-style) so it blends with the app chrome.
 *
 * MIT (community plan) — no licence key, unlike Syncfusion.
 */

/** Relative luminance of a hex colour (0 = black, 1 = white). */
function hexLuminance(hex: string): number {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return 1;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Build a MUI theme that mirrors the app's current colour tokens so the
 *  scheduler follows light/dark with the rest of the chrome. */
function useSchedulerTheme() {
  const { colors } = useTheme();
  return useMemo(() => {
    // ThemeProvider sets data-mode on <html>; trust it, fall back to luminance.
    const domMode =
      typeof document !== "undefined" ? document.documentElement.dataset.mode : undefined;
    const dark = domMode ? domMode === "dark" : hexLuminance(colors.base) < 0.5;
    return createTheme({
      palette: {
        mode: dark ? "dark" : "light",
        primary: { main: colors.primary },
        background: { default: colors.base, paper: colors.surface },
        divider: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
        text: {
          primary: colors.neutral,
          secondary: dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)",
        },
      },
      shape: { borderRadius: 12 },
      typography: { fontFamily: "inherit" },
    });
  }, [colors]);
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const localISO = (dt: Date) =>
  `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:00`;

// appointment status → calendar palette colour + Thai label.
const STATUS_COLOR: Record<AppointmentStatus, SchedulerEventColor> = {
  done: "green",
  in_progress: "blue",
  checked_in: "amber",
  scheduled: "teal",
  cancelled: "grey",
  no_show: "red",
};
const STATUS_LABEL: Record<AppointmentStatus, string> = {
  done: "เสร็จแล้ว",
  in_progress: "กำลังตรวจ",
  checked_in: "เช็คอิน",
  scheduled: "นัดไว้",
  cancelled: "ยกเลิก",
  no_show: "ไม่มา",
};

// rotating palette for clinic resources.
const CLINIC_PALETTE: SchedulerEventColor[] = [
  "purple", "teal", "orange", "lime", "blue", "pink", "indigo", "amber", "red", "green",
];

// Working window the day's cases are spread across (minutes from midnight).
const WORK_START = 8 * 60; // 08:00
const WORK_END = 17 * 60; // 17:00

/** Re-time an appointment to slot `i` of `total`, spreading the queue evenly
 *  over the working hours instead of letting the mock cluster them in one hour.
 *  Keeps the case order (sorted by original time) and the real date. */
function toEvent(a: Appointment, i: number, baseKey: string): SchedulerEvent {
  const [y, m, d] = baseKey.split("-").map((n) => parseInt(n, 10));
  // one case per hour, back-to-back, no overlap.
  const startMin = WORK_START + i * 60;
  const start = new Date(y, m - 1, d, 0, startMin, 0);
  const end = new Date(start.getTime() + 60 * 60000);
  return {
    id: a.id,
    title: a.patientName,
    description: `${a.clinic} · ${STATUS_LABEL[a.status]}`,
    start: localISO(start),
    end: localISO(end),
    resource: a.clinic,
    color: STATUS_COLOR[a.status],
  };
}

export default function DoctorRosterSchedule({
  appointments,
  onOpenCase,
}: {
  appointments: Appointment[];
  /** Open a patient's case (consult) when their appointment card is clicked. */
  onOpenCase?: (hn: string) => void;
}) {
  const muiTheme = useSchedulerTheme();
  const initial = useMemo<SchedulerEvent[]>(() => {
    const slots = Math.floor((WORK_END - WORK_START) / 60); // hours available
    const sorted = [...appointments]
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(0, slots); // drop cases that don't fit a clean 1-hour slot
    const baseKey = sorted[0]?.date ?? localISO(new Date()).slice(0, 10);
    return sorted.map((a, i) => toEvent(a, i, baseKey));
  }, [appointments]);

  // distinct clinics today → resources (for the side-panel filter checkboxes).
  const resources = useMemo<SchedulerResource[]>(() => {
    const seen = new Map<string, SchedulerResource>();
    appointments.forEach((a, i) => {
      if (!seen.has(a.clinic)) {
        seen.set(a.clinic, {
          id: a.clinic,
          title: a.clinic,
          eventColor: CLINIC_PALETTE[seen.size % CLINIC_PALETTE.length],
        });
      }
      void i;
    });
    return [...seen.values()];
  }, [appointments]);

  const [events, setEvents] = useState<SchedulerEvent[]>(initial);
  const rootRef = useRef<HTMLDivElement>(null);

  // Clicking an appointment card opens that patient's case instead of MUI's
  // built-in edit dialog. The event element carries no id, so map by the title
  // (= patient name) back to the HN. Capture phase + stopPropagation blocks the
  // library's own click handler.
  const nameToHn = useMemo(() => {
    const m = new Map<string, string>();
    appointments.forEach((a) => m.set(a.patientName, a.patientHN));
    return m;
  }, [appointments]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !onOpenCase) return;
    const cardFor = (e: Event): HTMLElement | null => {
      const t = e.target as HTMLElement | null;
      if (!t || !root.contains(t)) return null;
      return t.closest<HTMLElement>(".MuiEventCalendar-timeGridEvent");
    };
    const hnOf = (card: HTMLElement): string | undefined => {
      const name = card.querySelector(".MuiEventCalendar-timeGridEventTitle")?.textContent?.trim();
      return name ? nameToHn.get(name) : undefined;
    };
    // Document-level capture so it runs before MUI/Base UI's own handlers
    // regardless of where they're attached. Swallow the open-trigger events,
    // then navigate on click.
    const swallow = (e: Event) => {
      const card = cardFor(e);
      if (card && hnOf(card)) {
        e.preventDefault();
        e.stopPropagation();
        (e as Event & { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
      }
    };
    const onClick = (e: MouseEvent) => {
      const card = cardFor(e);
      if (!card) return;
      const hn = hnOf(card);
      if (hn) {
        e.preventDefault();
        e.stopPropagation();
        (e as MouseEvent & { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
        onOpenCase(hn);
      }
    };
    document.addEventListener("pointerdown", swallow, true);
    document.addEventListener("mousedown", swallow, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerdown", swallow, true);
      document.removeEventListener("mousedown", swallow, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [onOpenCase, nameToHn]);

  // Auto-scroll the time grid to the current time on mount so the doctor lands
  // on "now" instead of the empty pre-dawn hours.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const scroller = rootRef.current?.querySelector<HTMLElement>(".MuiEventCalendar-DayTimeGrid");
      if (!scroller) return;
      const hourPx =
        parseFloat(getComputedStyle(scroller).getPropertyValue("--hour-height")) || 76;
      const now = new Date();
      const nowPx = (now.getHours() + now.getMinutes() / 60) * hourPx;
      scroller.scrollTo({ top: Math.max(0, nowPx - hourPx), behavior: "auto" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [events]);

  return (
    <ThemeProvider theme={muiTheme}>
      <div ref={rootRef} className="h-full min-h-0 w-full overflow-hidden p-4 sm:p-5">
        <EventCalendar
          events={events}
          resources={resources}
          onEventsChange={(next) => setEvents(next)}
          defaultView="day"
          views={["day", "week", "month", "agenda"]}
          defaultPreferences={{ isSidePanelOpen: true, ampm: true, weekStartsOn: 1 }}
          style={{ height: "100%" }}
        />
      </div>
    </ThemeProvider>
  );
}
