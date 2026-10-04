import type { CalendarMonthCellDTO } from "@/domain/dto";

import { calendarToneStyles } from "../calendar-styles";

const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

export function MonthView({ cells, label }: { cells: readonly CalendarMonthCellDTO[]; label: string }) {
  const rows = cells.length === 28 ? "grid-rows-4" : cells.length === 42 ? "grid-rows-6" : "grid-rows-5";
  return (
    <section aria-label="Month calendar" className="flex flex-1 overflow-x-auto px-4 pb-8 pt-6 sm:px-8">
      <div aria-label={label} className="flex min-w-[840px] flex-1 flex-col overflow-hidden rounded-xl border border-border-panel bg-card shadow-inner" role="grid">
        <div className="grid shrink-0 grid-cols-7 border-b border-border-panel bg-panel" role="row">
          {weekdays.map((weekday, index) => (
            <span
              className={`py-3 text-center text-[12px] font-bold uppercase tracking-widest text-text-disabled ${index < 6 ? "border-r border-border-panel" : ""}`}
              key={weekday}
              role="columnheader"
            >
              {weekday}
            </span>
          ))}
        </div>
        <div className={`grid flex-1 grid-cols-7 ${rows} bg-panel`}>
          {cells.map((cell, index) => {
            const events = cell.events ?? (cell.event ? [{ ...cell.event, id: `${cell.id}:fixture` }] : []);
            const isLastColumn = index % 7 === 6;
            const isLastRow = index >= cells.length - 7;
            return (
              <div
                aria-current={cell.isToday ? "date" : undefined}
                className={`flex min-h-[116px] flex-col gap-1 p-2 ${!isLastColumn ? "border-r" : ""} ${
                  !isLastRow ? "border-b" : ""
                } border-border-panel ${cell.outsideMonth ? "bg-black/20 opacity-30" : "hover:bg-card"} ${
                  cell.isToday ? "border-border-hover bg-card shadow-inner" : ""
                }`}
                key={cell.id}
                role="gridcell"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`text-[16px] font-bold ${
                      cell.isToday ? "grid size-5 place-items-center rounded-full bg-white text-black" : "pl-1 text-zinc-400"
                    }`}
                  >
                    {cell.day}
                  </span>
                  {events.some(event => event.inProgress) ? <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-analysis" /> : null}
                </div>
                {events.map(event => (
                  <div
                    key={event.id}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${
                      event.inProgress ? "border-analysis/40 bg-[#001f29]" : "border-border-panel bg-card"
                    }`}
                  >
                    <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${calendarToneStyles[event.tone].dot}`} />
                    <span className="truncate text-[12px] font-semibold leading-tight text-white">{event.title}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
