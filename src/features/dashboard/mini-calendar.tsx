import { ChevronLeft, ChevronRight } from "lucide-react";

import type { DashboardFixtureDTO } from "@/domain/dto";

const weekdays = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
const eventColors = {
  exam: "bg-[#ff4d57]",
  task: "bg-[#38bdf8]",
  holiday: "bg-[#22c55e]",
} as const;

export function MiniCalendar({ calendar }: { calendar: DashboardFixtureDTO["calendar"] }) {
  return (
    <section className="rounded-2xl border border-border-base bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-base font-bold text-text">{calendar.label}</h2>
        <div className="flex gap-4">
          <button aria-label="Previous month" className="text-text-muted hover:text-white" type="button">
            <ChevronLeft aria-hidden="true" size={16} />
          </button>
          <button aria-label="Next month" className="text-text-muted hover:text-white" type="button">
            <ChevronRight aria-hidden="true" size={16} />
          </button>
        </div>
      </div>
      <div className="mb-6 flex gap-4 text-[10px]">
        <Legend color="bg-[#ff4d57]" label="Exam" />
        <Legend color="bg-[#38bdf8]" label="Task" />
        <Legend color="bg-[#22c55e]" label="Holiday" />
      </div>
      <div className="grid grid-cols-7 items-center gap-y-4 text-center text-xs">
        {weekdays.map((day) => (
          <span className="font-medium text-text-disabled" key={day}>
            {day}
          </span>
        ))}
        {calendar.leadingDays.map((day) => (
          <span className="text-text-disabled" key={`leading-${day}`}>
            {day}
          </span>
        ))}
        {calendar.days.map((day) => {
          const event = calendar.events[day];
          const isSelected = day === calendar.selectedDay;
          return (
            <span
              aria-current={isSelected ? "date" : undefined}
              className={`mx-auto flex size-9 flex-col items-center justify-center gap-1 font-medium ${
                isSelected ? "rounded-full bg-white font-bold text-black" : ""
              }`}
              key={day}
            >
              {day}
              {event && !isSelected ? <span aria-hidden="true" className={`size-1 rounded-full ${eventColors[event]}`} /> : null}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className={`size-2 rounded-full ${color}`} />
      <span className="text-text-muted">{label}</span>
    </span>
  );
}
