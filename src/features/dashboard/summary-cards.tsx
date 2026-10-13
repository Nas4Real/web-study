import { AlertCircle, Calendar, ClipboardList, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import type { DashboardFixtureDTO } from "@/domain/dto";

export function SummaryCards({ dashboard }: { dashboard: DashboardFixtureDTO }) {
  return (
    <section aria-label="Today's summary" className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
      <Link href="/calendar" className="group flex flex-col justify-between rounded-[24px] border border-borderPanel bg-cardBg p-6 shadow-sm transition-colors hover:border-zinc-700">
        <div className="flex items-start justify-between">
          <span className="text-[15px] font-medium text-zinc-300">Upcoming Exam</span>
          <span className="flex size-9 items-center justify-center rounded-full bg-red-500/10 text-red-500 transition-transform group-hover:scale-110"><AlertCircle aria-hidden="true" size={18} /></span>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <span className="text-[26px] font-bold leading-none tracking-tight text-white">{dashboard.upcomingExam.title}</span>
          <span className="flex items-center gap-1.5 text-[13px] font-bold text-red-500"><Calendar aria-hidden="true" size={12} />{dashboard.upcomingExam.dueLabel}</span>
        </div>
      </Link>
      <Link href="/calendar" className="group flex flex-col justify-between rounded-[24px] border border-borderPanel bg-cardBg p-6 shadow-sm transition-colors hover:border-zinc-700">
        <div className="flex items-start justify-between">
          <span className="text-[15px] font-medium text-zinc-300">Next Session</span>
          <span className="flex size-9 items-center justify-center rounded-full bg-[#38bdf8]/10 text-[#38bdf8] transition-transform group-hover:scale-110"><Clock aria-hidden="true" size={16} /></span>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <span className="text-[26px] font-bold leading-none tracking-tight text-white">{dashboard.nextSession.title}</span>
          <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#38bdf8]"><MapPin aria-hidden="true" size={12} />{dashboard.nextSession.location} • {dashboard.nextSession.timeLabel}</span>
        </div>
      </Link>
      <Link href="/tasks" className="group flex flex-col justify-between rounded-[24px] border border-borderPanel bg-cardBg p-6 shadow-sm transition-colors hover:border-zinc-700">
        <div className="flex items-start justify-between">
          <span className="text-[15px] font-medium text-zinc-300">Tasks</span>
          <span className="flex size-9 items-center justify-center rounded-full bg-orange-500/10 text-orange-400 transition-transform group-hover:scale-110"><ClipboardList aria-hidden="true" size={16} /></span>
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <span className="text-[40px] font-bold leading-none tracking-tight text-white">{String(dashboard.taskSummary.total).padStart(2, "0")}</span>
          <span className="text-[13px] font-bold text-orange-400">{dashboard.taskSummary.dueToday} due today</span>
        </div>
      </Link>
    </section>
  );
}
