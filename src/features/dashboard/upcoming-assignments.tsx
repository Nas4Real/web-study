import { Bell, BookOpen, Calculator, FlaskConical } from "lucide-react";

import type { DashboardAssignmentDTO } from "@/domain/dto";

import { toneStyles } from "./dashboard-styles";

const assignmentIcons = [Calculator, FlaskConical, BookOpen] as const;

export function UpcomingAssignments({ assignments }: { assignments: readonly DashboardAssignmentDTO[] }) {
  return (
    <section className="rounded-2xl border border-border-base bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Upcoming Assignments</h2>
          <Bell aria-hidden="true" className="text-text-muted" size={14} />
        </div>
        <a className="text-xs font-medium text-text-tertiary hover:text-text" href="#assignments">
          View All
        </a>
      </div>
      <div className="space-y-4">
        {assignments.map((assignment, index) => {
          const Icon = assignmentIcons[index] ?? BookOpen;
          const tone = toneStyles[assignment.tone];
          return (
            <article
              className="flex items-center justify-between gap-4 rounded-xl border border-transparent bg-card-hover p-4 transition-colors hover:border-border-panel"
              key={assignment.id}
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${tone.icon}`}>
                  <Icon aria-hidden="true" size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{assignment.title}</h3>
                  <p className="truncate text-xs text-text-tertiary">{assignment.description}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-xs font-semibold ${assignment.state === "completed" ? "text-physics" : tone.accent}`}>
                  {assignment.dueLabel}
                </p>
                <p className="font-mono text-[10px] text-text-tertiary">{assignment.dueTime}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
