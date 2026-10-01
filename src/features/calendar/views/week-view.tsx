import type { CalendarWeekDayDTO } from "@/domain/dto";

import { WeekEventCard } from "../calendar-event-card";

export function WeekView({ days, onOpenEvent }: { days: readonly CalendarWeekDayDTO[]; onOpenEvent?: () => void }) {
  return (
    <section aria-label="Week calendar" className="flex flex-1 overflow-x-auto px-4 pb-8 pt-6 sm:px-8">
      <div className="grid min-w-[840px] flex-1 grid-cols-7 divide-x divide-border-panel overflow-hidden rounded-xl border border-border-panel bg-panel shadow-inner">
        {days.map((day) => (
          <div
            className={`relative flex h-full min-h-[620px] flex-col ${
              day.isToday ? "z-10 border-x border-border-hover bg-card shadow-2xl" : "bg-panel"
            }`}
            key={day.weekdayLabel}
          >
            {day.isToday ? <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-zinc-400" /> : null}
            <div className={`flex flex-col items-center border-b py-4 ${day.isToday ? "border-border-panel bg-card" : "border-border-panel bg-panel"}`}>
              <span className={`text-[11px] font-bold uppercase tracking-widest ${day.isToday ? "text-zinc-200" : "text-text-disabled"}`}>
                {day.weekdayLabel}
              </span>
              <span
                className={`text-[16px] font-bold ${
                  day.isToday ? "grid size-6 place-items-center rounded bg-zinc-200 text-black" : "text-zinc-300"
                }`}
              >
                {day.day}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
              {day.events.map((event) => (
                <WeekEventCard event={event} key={event.id} onOpen={onOpenEvent} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
