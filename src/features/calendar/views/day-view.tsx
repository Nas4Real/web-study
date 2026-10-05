import type { CalendarDaySectionDTO, CalendarVisualEventDTO } from "@/domain/dto";

import { DayEventCard } from "../calendar-event-card";

export function DayView({ onOpenEvent, sections }: {
  onOpenEvent?: (event: CalendarVisualEventDTO) => void;
  sections: readonly CalendarDaySectionDTO[];
}) {
  return (
    <section aria-label="Day calendar" className="flex flex-1 overflow-hidden px-4 pb-8 pt-6 sm:px-8">
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
    </section>
  );
}
