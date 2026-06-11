/**
 * Thin FullCalendar wrapper for the doctor workspace. Week time-grid view
 * with pastel-pill events. Styling tracks the design ref: blue top header
 * for weekday names, soft tinted blocks per event, no third-party theme
 * CSS pulled in — everything is overridden against `--theme-*` tokens.
 */
import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  /** Optional subline (doctor name / appointment type). */
  subtitle?: string;
  /** Soft pastel background tint (e.g. "#dbe7ff"). */
  backgroundColor?: string;
  /** Stronger accent for text + left border (e.g. "#3b6ee8"). */
  borderColor?: string;
  extendedProps?: Record<string, unknown>;
}

export default function DoctorCalendar({
  events,
  onEventClick,
  initialView = "timeGridWeek",
}: {
  events: CalendarEvent[];
  onEventClick?: (id: string) => void;
  initialView?: "timeGridDay" | "timeGridWeek";
}) {
  // FullCalendar mutates the events prop, so hand it a stable shallow copy.
  const safeEvents = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        backgroundColor: e.backgroundColor,
        borderColor: e.borderColor,
        textColor: e.borderColor,
        extendedProps: { subtitle: e.subtitle, ...(e.extendedProps ?? {}) },
      })),
    [events],
  );

  return (
    <div className="fc-shell h-full w-full">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={{ left: "prev,next today", center: "title", right: "timeGridWeek,timeGridDay" }}
        height="100%"
        slotMinTime="07:00:00"
        slotMaxTime="20:00:00"
        slotDuration="00:30:00"
        nowIndicator
        allDaySlot={false}
        locale="th"
        firstDay={1}
        dayHeaderFormat={{ weekday: "short", day: "2-digit" }}
        buttonText={{ today: "วันนี้", week: "สัปดาห์", day: "วัน" }}
        events={safeEvents}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        eventContent={(arg) => {
          const subtitle = (arg.event.extendedProps as { subtitle?: string }).subtitle;
          return (
            <div className="fc-event-card">
              <div className="fc-event-time">{arg.timeText}</div>
              <div className="fc-event-title-line">{arg.event.title}</div>
              {subtitle && <div className="fc-event-sub">{subtitle}</div>}
            </div>
          );
        }}
        eventClick={(arg) => {
          arg.jsEvent.preventDefault();
          onEventClick?.(arg.event.id);
        }}
      />
      <style>{FC_OVERRIDES}</style>
    </div>
  );
}

const FC_OVERRIDES = `
.fc-shell .fc { font-family: inherit; font-size: 12px; color: var(--theme-neutral); --fc-border-color: rgba(0,0,0,0.05); --fc-page-bg-color: var(--theme-surface); --fc-neutral-bg-color: transparent; --fc-today-bg-color: rgba(59,110,232,0.04); --fc-now-indicator-color: var(--theme-error); }
.fc-shell .fc-toolbar.fc-header-toolbar { padding: 10px 12px; margin-bottom: 10px; }
.fc-shell .fc-toolbar-title { font-size: 15px; font-weight: 700; color: var(--theme-neutral); }
.fc-shell .fc-button { background: var(--theme-base); border-color: rgba(0,0,0,0.08); color: var(--theme-neutral); font-size: 11px; padding: 5px 10px; box-shadow: none; text-transform: none; }
.fc-shell .fc-button:hover { background: var(--theme-primary-soft); }
.fc-shell .fc-button-primary:not(:disabled):active,
.fc-shell .fc-button-primary:not(:disabled).fc-button-active { background: var(--theme-primary); border-color: var(--theme-primary); color: white; }
.fc-shell .fc-col-header { background: var(--theme-primary); border-radius: 10px 10px 0 0; overflow: hidden; }
.fc-shell .fc-col-header-cell { border-color: rgba(255,255,255,0.15); }
.fc-shell .fc-col-header-cell-cushion { padding: 10px 4px; font-weight: 600; color: white; font-size: 12px; text-decoration: none; }
.fc-shell .fc-day-today .fc-col-header-cell-cushion { color: white; }
.fc-shell .fc-timegrid-axis { border-color: transparent; }
.fc-shell .fc-timegrid-slot { height: 30px; border-color: rgba(0,0,0,0.04); }
.fc-shell .fc-timegrid-slot-label-cushion { color: rgba(0,0,0,0.4); font-size: 10px; padding: 0 8px; }
.fc-shell .fc-scrollgrid { border-radius: 10px; border-color: rgba(0,0,0,0.06); overflow: hidden; }
.fc-shell .fc-timegrid-col.fc-day-today { background: rgba(59,110,232,0.04); }
.fc-shell .fc-event { border: none; border-left: 3px solid var(--fc-event-border-color); border-radius: 8px; padding: 0; margin: 1px 2px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
.fc-shell .fc-event-main { padding: 0; }
.fc-shell .fc-event-card { padding: 4px 8px 5px; display: flex; flex-direction: column; gap: 1px; line-height: 1.2; }
.fc-shell .fc-event-time { font-size: 10px; font-weight: 600; opacity: 0.75; }
.fc-shell .fc-event-title-line { font-size: 11.5px; font-weight: 700; color: rgba(0,0,0,0.78); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fc-shell .fc-event-sub { font-size: 10px; color: rgba(0,0,0,0.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fc-shell .fc-timegrid-now-indicator-line { border-color: var(--theme-error); border-width: 2px; }
.fc-shell .fc-timegrid-now-indicator-arrow { border-color: var(--theme-error); }
`;
