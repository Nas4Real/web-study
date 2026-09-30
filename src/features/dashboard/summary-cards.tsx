import { AlertCircle, Calendar, ClipboardList, Clock3, MapPin } from "lucide-react";

import type { DashboardFixtureDTO } from "@/domain/dto";

export function SummaryCards({ dashboard }: { dashboard: DashboardFixtureDTO }) {
  return (
    <section aria-label="Today's summary" className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <article className="rounded-2xl border border-border-base bg-card p-6 transition-colors hover:border-border-hover">
        <div className="mb-6 flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Upcoming Exam</p>
          <AlertCircle aria-hidden="true" className="text-algebra" size={18} />
        </div>
        <h2 className="mb-2 text-xl font-bold">{dashboard.upcomingExam.title}</h2>
        <p className="flex items-center gap-2 text-xs font-medium text-algebra">
          <Calendar aria-hidden="true" size={14} />
          {dashboard.upcomingExam.dueLabel}
        </p>
      </article>

      <article className="rounded-2xl border border-border-base bg-card p-6 transition-colors hover:border-border-hover">
        <div className="mb-6 flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Next Session</p>
          <Clock3 aria-hidden="true" className="text-analysis" size={18} />
        </div>
        <h2 className="mb-2 text-xl font-bold">{dashboard.nextSession.title}</h2>
        <p className="flex flex-wrap items-center gap-4 text-xs font-medium text-analysis">
          <span className="flex items-center gap-1.5">
            <MapPin aria-hidden="true" size={13} />
            {dashboard.nextSession.location}
          </span>
          <span>{dashboard.nextSession.timeLabel}</span>
        </p>
      </article>

      <article className="rounded-2xl border border-border-base bg-card p-6 transition-colors hover:border-border-hover">
        <div className="mb-4 flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Tasks</p>
          <ClipboardList aria-hidden="true" className="text-method" size={18} />
        </div>
        <p className="font-mono text-4xl font-bold">{String(dashboard.taskSummary.total).padStart(2, "0")}</p>
        <p className="mt-1 text-xs font-medium text-method">{dashboard.taskSummary.dueToday} due today</p>
      </article>
    </section>
  );
}
