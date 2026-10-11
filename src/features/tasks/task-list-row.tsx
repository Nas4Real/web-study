"use client";

import { Calendar, Check, Clock, MoreVertical } from "lucide-react";
import { useState } from "react";
import type { WorkspaceTone } from "@/domain/dto";
import type { TaskListViewModel } from "./task-view-model";

const tones: Record<WorkspaceTone, string> = {
  algebra: "border-algebra/20 bg-algebra/10 text-algebra",
  analysis: "border-analysis/20 bg-analysis/10 text-analysis",
  physics: "border-physics/20 bg-physics/10 text-physics",
  method: "border-method/20 bg-method/10 text-method",
  neutral: "border-borderPanel bg-cardHover text-textMuted",
};

export function TaskListRow({ task, onOpen, onTransition }: {
  task: TaskListViewModel;
  onOpen: () => void;
  onTransition: (transition: "complete" | "reopen" | "someday") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const completed = task.status === "completed";
  const DueIcon = task.group === "overdue" ? Clock : Calendar;
  return (
    <div onClick={onOpen} className="group flex cursor-pointer items-center justify-between border-b border-borderPanel p-4 transition-colors last:border-b-0 hover:bg-[#18181b]">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <button aria-label={`${completed ? "Reopen" : "Complete"} ${task.title}`} aria-pressed={completed}
          className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${completed ? "border-white bg-white text-black" : "border-borderPanel group-hover:border-white"}`}
          onClick={event => { event.stopPropagation(); onTransition(completed ? "reopen" : "complete"); }} type="button">
          {completed ? <Check aria-hidden="true" size={13} strokeWidth={3} /> : null}
        </button>
        <button aria-label={`Open ${task.title}`} id={`task-open-${task.id}`} className="flex min-w-0 flex-1 flex-col gap-1 text-left" type="button">
          <span className={`text-[15px] font-bold text-white ${completed ? "line-through opacity-70" : ""}`}>{task.title}</span>
          <span className="text-[13px] font-medium text-textMuted">{task.description}</span>
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded border px-2 py-0.5 text-[11px] font-bold ${tones[task.tone]}`}>{task.subjectLabel}</span>
            <span className={`flex items-center gap-1 text-[12px] font-bold ${task.group === "overdue" ? "text-red-400" : "text-zinc-400"}`}><DueIcon aria-hidden="true" size={13} />{task.dueLabel}</span>
          </span>
        </button>
      </div>
      <span className="relative">
        <button aria-expanded={menuOpen} aria-label={`More actions for ${task.title}`} className="p-2 text-textMuted opacity-0 transition-all hover:text-white focus:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
          onClick={event => { event.stopPropagation(); setMenuOpen(open => !open); }} type="button"><MoreVertical aria-hidden="true" size={18} /></button>
        {menuOpen ? <span className="absolute right-0 top-9 z-10 min-w-40 rounded-lg border border-border-hover bg-card p-1 shadow-2xl">
          <button className="w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-text-secondary hover:bg-card-hover hover:text-white"
            onClick={event => { event.stopPropagation(); setMenuOpen(false); onTransition(task.status === "someday" ? "reopen" : "someday"); }} type="button">{task.status === "someday" ? "Move to Pending" : "Move to Someday"}</button>
        </span> : null}
      </span>
    </div>
  );
}
