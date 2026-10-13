import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { DashboardClassDTO } from "@/domain/dto";

export function TodayClasses({ classes, onOpen }: {
  classes: readonly DashboardClassDTO[];
  onOpen?: (session: DashboardClassDTO) => void;
}) {
  return (
    <section className="flex flex-col rounded-[24px] border border-borderPanel bg-cardBg p-7 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold tracking-tight text-white">Today&apos;s Classes</h2>
        <Link className="text-[12px] font-medium text-textMuted transition-colors hover:text-white" href="/calendar">View All</Link>
      </div>
      <ul className="mb-2 flex flex-col gap-1">
        {classes.map(session => (
          <li key={session.id}>
            <button aria-label={`Open ${session.title}`} id={`session-open-${session.id}`}
              className="group -mx-3 flex w-[calc(100%+24px)] cursor-pointer items-center rounded-[12px] p-3 text-left transition-colors hover:bg-[#18181b]"
              onClick={() => onOpen?.(session)} type="button">
              <time className="w-16 shrink-0 text-[14px] font-medium text-zinc-300">{session.timeLabel}</time>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[14px] font-medium text-white transition-colors group-hover:text-zinc-200">{session.title}</span>
                <span className="text-[12px] text-textMuted">{session.location} • {session.subjectLabel}</span>
              </span>
              <ChevronRight aria-hidden="true" className="shrink-0 text-zinc-600 transition-colors group-hover:text-white" size={16} />
            </button>
          </li>
        ))}
        {classes.length === 0 ? <li className="text-[13px] font-medium text-textMuted">No classes scheduled today.</li> : null}
      </ul>
    </section>
  );
}
