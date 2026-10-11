import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { addMonths, format, parseISO } from "date-fns";
import type { DashboardFixtureDTO } from "@/domain/dto";

const weekdays = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
const eventColors = { exam: "bg-red-500", task: "bg-[#38bdf8]", holiday: "bg-green-500" } as const;

export function MiniCalendar({ calendar }: { calendar: DashboardFixtureDTO["calendar"] }) {
  const month = parseISO(calendar.monthDate);
  const monthHref = (offset: number) => `/calendar?view=month&date=${format(addMonths(month, offset), "yyyy-MM-dd")}`;
  const trailingCount = (7 - (calendar.leadingDays.length + calendar.days.length) % 7) % 7;
  return (
    <section className="flex flex-col rounded-[24px] border border-borderPanel bg-cardBg p-7 shadow-sm">
      <div className="mb-4 flex items-center justify-between px-1">
        <h2 className="text-[18px] font-bold tracking-wide text-white">{calendar.label}</h2>
        <div className="flex items-center gap-3">
          <Link aria-label="Previous month" href={monthHref(-1)} className="flex size-8 items-center justify-center rounded-xl border border-transparent text-zinc-400 transition-colors hover:border-borderPanel hover:bg-[#18181b] hover:text-white"><ChevronLeft aria-hidden="true" size={18} /></Link>
          <Link aria-label="Next month" href={monthHref(1)} className="flex size-8 items-center justify-center rounded-xl border border-transparent text-zinc-400 transition-colors hover:border-borderPanel hover:bg-[#18181b] hover:text-white"><ChevronRight aria-hidden="true" size={18} /></Link>
        </div>
      </div>
      <div className="mb-6 flex items-center justify-start gap-6 px-1">
        <Legend color="bg-red-500" label="Exam" /><Legend color="bg-[#38bdf8]" label="Task" /><Legend color="bg-green-500" label="Holiday" />
      </div>
      <div className="mb-3 grid grid-cols-7 gap-y-4">
        {weekdays.map(day => <span className="text-center text-[13px] font-bold uppercase tracking-wide text-zinc-500" key={day}>{day}</span>)}
        {calendar.leadingDays.map(day => <span className="relative flex justify-center" key={`leading-${day}`}><span className="flex size-9 items-center justify-center rounded-full text-[14px] font-semibold text-zinc-600">{day}</span></span>)}
        {calendar.days.map(day => {
          const event = calendar.events[day];
          const isSelected = day === calendar.selectedDay;
          return (
            <span className="relative flex justify-center" key={day}>
              <Link href={`/calendar?view=day&date=${calendar.monthDate.slice(0, 8)}${String(day).padStart(2, "0")}`} aria-current={isSelected ? "date" : undefined}
                className={`flex size-9 items-center justify-center rounded-full text-[14px] font-semibold transition-colors ${isSelected ? "bg-white text-black shadow-sm hover:bg-zinc-200" : "text-zinc-300 hover:bg-[#18181b] hover:text-white"}`}>{day}</Link>
              {event && !isSelected ? <span aria-hidden="true" className={`absolute bottom-0 size-1.5 rounded-full ${eventColors[event]}`} /> : null}
            </span>
          );
        })}
        {Array.from({ length: trailingCount }, (_, index) => <span className="relative flex justify-center" key={`trailing-${index}`}><span className="flex size-9 items-center justify-center rounded-full text-[14px] font-semibold text-zinc-600">{index + 1}</span></span>)}
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-2 text-[14px] font-semibold text-zinc-300"><span aria-hidden="true" className={`size-2 rounded-full ${color}`} />{label}</span>;
}
