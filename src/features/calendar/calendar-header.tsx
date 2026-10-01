import { Bell, Calendar, ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";

import type { CalendarView } from "@/domain/dto";

const views: readonly { id: CalendarView; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

interface CalendarHeaderProps {
  greetingName: string;
  periodLabel: string;
  view: CalendarView;
  onShift: (direction: -1 | 1) => void;
  onViewChange: (view: CalendarView) => void;
  onNewSession: () => void;
}

export function CalendarHeader({ greetingName, onNewSession, onShift, onViewChange, periodLabel, view }: CalendarHeaderProps) {
  return (
    <>
      <header className="flex shrink-0 items-start justify-between gap-4 px-4 pb-5 pt-6 sm:px-8 sm:pt-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-bold tracking-tight text-white">Good Morning, {greetingName}!</h1>
          <p className="text-[13px] font-medium text-text-muted">Here&apos;s what&apos;s happening with your studies today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="hidden items-center gap-2 rounded-md border border-border-hover bg-card-hover px-4 py-2 text-[13px] font-semibold text-zinc-200 shadow-sm transition-colors hover:bg-border-panel sm:flex"
            type="button"
          >
            <Sparkles aria-hidden="true" size={16} />
            AI Suggestion
          </button>
          <button
            aria-label="Notifications"
            className="grid size-10 place-items-center rounded-md text-text-muted transition-colors hover:bg-card-hover hover:text-white"
            type="button"
          >
            <Bell aria-hidden="true" size={18} />
          </button>
        </div>
      </header>

      <div className="flex shrink-0 flex-col gap-4 border-b border-border-panel px-4 pb-4 sm:px-8 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="flex items-center gap-2 text-[14px] font-bold text-zinc-200">
            <Calendar aria-hidden="true" className="text-text-disabled" size={16} />
            {periodLabel}
          </h2>
          <div className="flex items-center rounded-md border border-border-panel bg-card p-1 shadow-sm">
            <button
              aria-label="Previous period"
              className="grid size-8 place-items-center rounded text-text-muted transition-colors hover:bg-border-panel hover:text-white"
              onClick={() => onShift(-1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={16} />
            </button>
            <button
              aria-label="Next period"
              className="grid size-8 place-items-center rounded text-text-muted transition-colors hover:bg-border-panel hover:text-white"
              onClick={() => onShift(1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div aria-label="Calendar view" className="flex items-center rounded-md border border-border-panel bg-card p-0.5 shadow-sm" role="group">
            {views.map((option) => (
              <button
                aria-pressed={view === option.id}
                className={`rounded px-4 py-2 text-[13px] font-medium transition-colors ${
                  view === option.id ? "bg-border-panel text-white shadow-sm" : "text-text-muted hover:text-white"
                }`}
                key={option.id}
                onClick={() => onViewChange(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            className="flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2 text-[13px] font-bold text-black shadow-sm transition-colors hover:bg-white"
            onClick={onNewSession}
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
            New Session
          </button>
        </div>
      </div>
    </>
  );
}
