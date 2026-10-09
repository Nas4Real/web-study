import { CalendarPlus2, Plus } from "lucide-react";

import type { CalendarDaySectionDTO, CalendarVisualEventDTO } from "@/domain/dto";

import { DayEventCard } from "../calendar-event-card";

export function DayView({ onNewSession, onOpenEvent, sections }: {
  onNewSession: () => void;
  onOpenEvent?: (event: CalendarVisualEventDTO) => void;
  sections: readonly CalendarDaySectionDTO[];
}) {
  const hasEvents = sections.some((section) => section.events.length > 0);

  return (
    <section aria-label="Day calendar" className="flex flex-1 overflow-hidden px-4 pb-8 pt-6 sm:px-8">
      {hasEvents ? (
        <div className="flex flex-1 flex-col gap-8 overflow-y-auto">
          {sections.map((section) => (
            <div className="flex flex-col gap-4" key={section.label}>
              <div className="flex items-center gap-4">
                <h3 className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.2em] text-text-disabled">{section.label}</h3>
                <div className="h-px flex-1 bg-border-panel" />
              </div>
              <div className="flex flex-col gap-3">
                {section.events.map((event) => (
                  <DayEventCard event={event} key={event.id} onOpen={onOpenEvent} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-border-panel bg-card px-6 py-10 text-center shadow-sm">
            <span className="grid size-12 place-items-center rounded-xl border border-border-panel bg-card-hover text-text-muted">
              <CalendarPlus2 aria-hidden="true" size={22} />
            </span>
            <h2 className="mt-5 text-lg font-bold tracking-tight text-text">No sessions scheduled</h2>
            <p className="mt-2 max-w-xs text-[13px] leading-5 text-text-tertiary">
              Your day is clear. Add a class, exam, or revision session when you&apos;re ready.
            </p>
            <button
              className="mt-6 flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2.5 text-[13px] font-bold text-black shadow-sm transition-colors hover:bg-white"
              onClick={onNewSession}
              type="button"
            >
              <Plus aria-hidden="true" size={16} />
              Add session
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
