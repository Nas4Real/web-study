import { Clock4, MapPin } from "lucide-react";

import type { CalendarVisualEventDTO } from "@/domain/dto";

import { calendarToneStyles } from "./calendar-styles";

export function WeekEventCard({ event }: { event: CalendarVisualEventDTO }) {
  const tone = calendarToneStyles[event.tone];
  return (
    <button
      aria-label={`Open ${event.title}`}
      className={`flex w-full cursor-pointer flex-col rounded-lg border p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-border-hover hover:bg-card-hover ${
        event.inProgress ? `border-analysis/30 bg-[#001f29]` : "border-border-panel bg-card"
      }`}
      type="button"
    >
      <span className="flex w-full items-center justify-between gap-1.5 leading-none">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`size-1.5 rounded-full ${tone.dot}`} />
          <span className={`font-mono text-[10px] font-semibold ${event.inProgress ? tone.text : "text-text-muted"}`}>
            {event.startLabel}
          </span>
        </span>
        <span className="font-mono text-[10px] font-medium text-text-disabled">{event.durationLabel.toUpperCase()}</span>
      </span>
      <span className="mt-[7px] text-[13px] font-bold leading-[1.35] text-white">{event.title}</span>
      <span className={`mt-1 text-[10px] font-semibold ${tone.text}`}>{event.subjectLabel}</span>
    </button>
  );
}

export function DayEventCard({ event }: { event: CalendarVisualEventDTO }) {
  const tone = calendarToneStyles[event.tone];
  return (
    <div className="group flex flex-col gap-3 sm:flex-row sm:gap-6">
      <div className="shrink-0 pt-2 text-left sm:w-24 sm:text-right">
        <time className={`block font-mono text-[13px] font-bold leading-none ${event.inProgress ? tone.text : "text-zinc-200"}`}>
          {event.startLabel}
        </time>
        <span className={`mt-1 block font-mono text-[11px] font-semibold uppercase ${event.inProgress ? "text-analysis/80" : "text-text-muted"}`}>
          {event.durationLabel}
        </span>
      </div>
      <button
        aria-label={`Open ${event.title}`}
        className={`relative flex min-w-0 flex-1 cursor-pointer flex-col overflow-hidden rounded-lg border p-5 text-left transition-all hover:-translate-y-0.5 hover:border-border-hover hover:bg-card-hover ${
          event.inProgress ? "border-analysis/30 bg-[#001f29]" : "border-border-panel bg-card"
        }`}
        type="button"
      >
        {event.inProgress ? (
          <span className="absolute right-0 top-0 rounded-bl-lg border-b border-l border-analysis/30 bg-analysis/20 px-3 py-1 text-[9px] font-black uppercase text-analysis">
            In Progress
          </span>
        ) : null}
        <span className="flex w-full items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className={`size-1.5 rounded-full ${tone.dot}`} />
            <span className={`text-[13px] font-semibold ${tone.text}`}>{event.subjectLabel}</span>
          </span>
          <span className={`font-mono text-[12px] font-semibold ${event.inProgress ? "pr-20 text-analysis/90" : "text-text-muted"}`}>
            {event.startLabel} — {event.endLabel}
          </span>
        </span>
        <span className="mt-2 text-[18px] font-bold leading-tight tracking-tight text-white">{event.title}</span>
        <span className={`mt-3 flex w-full items-center gap-4 border-t pt-3 ${event.inProgress ? "border-analysis/10" : "border-border-panel"}`}>
          {event.progressLabel ? (
            <span className="flex items-center gap-1.5 text-analysis/70">
              <Clock4 aria-hidden="true" size={13} />
              <span className="text-[11px] font-medium">{event.progressLabel}</span>
            </span>
          ) : null}
          {event.location ? (
            <span className={`flex items-center gap-1.5 ${event.inProgress ? "text-analysis/70" : "text-text-muted"}`}>
              <MapPin aria-hidden="true" size={13} />
              <span className="text-[11px] font-medium">{event.location}</span>
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}
