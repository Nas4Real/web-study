import { ChevronRight } from "lucide-react";

import type { DashboardClassDTO } from "@/domain/dto";

export function TodayClasses({ classes, onOpen }: {
  classes: readonly DashboardClassDTO[];
  onOpen?: (session: DashboardClassDTO) => void;
}) {
  return (
    <section className="rounded-2xl border border-border-base bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-base font-bold text-text">Today&apos;s Classes</h2>
        <a className="text-[10px] font-medium text-text-tertiary hover:text-text" href="#classes">
          View All
        </a>
      </div>
      <ul className="divide-y divide-border-base">
        {classes.map((session) => (
          <li key={session.id}>
            <button
              aria-label={`Open ${session.title}`}
              className="flex w-full items-center gap-6 py-4 text-left"
              onClick={() => onOpen?.(session)}
              type="button"
            >
              <time className="w-12 font-mono text-xs text-text-muted">{session.timeLabel}</time>
              <span className="flex flex-1 items-center justify-between">
                <span>
                  <span className="block text-sm font-semibold">{session.title}</span>
                  <span className="block text-[10px] text-text-tertiary">{session.location}</span>
                </span>
                <ChevronRight aria-hidden="true" className="text-text-disabled" size={16} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <a
        className="mt-6 block w-full rounded-xl bg-white py-3 text-center text-sm font-bold text-black transition-colors hover:bg-text-secondary"
        href="#schedule"
      >
        View Schedule
      </a>
    </section>
  );
}
