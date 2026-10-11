import { Bell, Calculator, ChevronRight, FileText, FlaskConical } from "lucide-react";
import Link from "next/link";
import type { DashboardAssignmentDTO } from "@/domain/dto";

const assignmentIcons = [FileText, FlaskConical, Calculator] as const;
const assignmentColors = ["bg-[#3a1a2b] text-[#f472b6]", "bg-[#1a2a3b] text-[#38bdf8]", "bg-[#1a382b] text-[#4ade80]"] as const;

export function UpcomingAssignments({ assignments, onOpen }: { assignments: readonly DashboardAssignmentDTO[]; onOpen: (id: string) => void }) {
  return (
    <section className="flex flex-col rounded-[24px] border border-borderPanel bg-[#121214] p-7 shadow-sm">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[20px] font-bold tracking-wide text-white">Upcoming Assignments</h2>
          <Bell aria-hidden="true" className="shrink-0 text-zinc-400" size={18} />
        </div>
        <Link className="shrink-0 text-[13px] font-bold text-textMuted transition-colors hover:text-white" href="/tasks">View All</Link>
      </div>
      <div className="flex flex-col gap-6">
        {assignments.map((assignment, index) => {
          const Icon = assignmentIcons[index % assignmentIcons.length];
          return (
            <button aria-label={`Open assignment ${assignment.title}`} id={`dashboard-assignment-open-${assignment.id}`}
              className="group -mx-3 flex cursor-pointer items-center justify-between gap-2 rounded-2xl p-3 text-left transition-colors hover:bg-[#18181b]"
              onClick={() => onOpen(assignment.id)} type="button" key={assignment.id}>
              <span className="flex min-w-0 items-center gap-5">
                <span className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] ${assignmentColors[index % assignmentColors.length]}`}><Icon aria-hidden="true" size={24} /></span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[16px] font-bold text-white transition-colors group-hover:text-zinc-200">{assignment.title}</span>
                  <span className="flex flex-wrap items-center gap-x-3 text-[13px] font-medium text-textMuted">
                    <span>{assignment.dueLabel}{assignment.dueTime !== "—" ? `, ${assignment.dueTime}` : ""}</span>
                    <span aria-hidden="true">•</span><span className="text-zinc-400">{assignment.subjectLabel}</span>
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-[12px] font-bold ${assignment.priority === "high" ? "border-red-500/20 bg-red-500/10 text-red-400" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"}`}>{assignment.priority === "high" ? "High" : "Normal"}</span>
                <ChevronRight aria-hidden="true" className="text-zinc-600 transition-colors group-hover:text-white" size={18} />
              </span>
            </button>
          );
        })}
        {assignments.length === 0 ? <p className="text-[13px] font-medium text-textMuted">No upcoming assignments.</p> : null}
      </div>
    </section>
  );
}
