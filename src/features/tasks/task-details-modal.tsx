"use client";

import { CalendarClock, CheckCircle2, ClipboardList, Trash2 } from "lucide-react";
import { useState } from "react";

import { ModalFrame } from "@/components/modal-frame";
import { taskDetailFixture } from "@/fixtures";

export function TaskDetailsModal({ onClose }: { onClose: () => void }) {
  const [completedSubtasks, setCompletedSubtasks] = useState<Set<string>>(
    () => new Set(taskDetailFixture.subtasks.filter((item) => item.completedAt).map((item) => item.id)),
  );

  function toggleSubtask(id: string) {
    setCompletedSubtasks((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <ModalFrame
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button className="flex items-center gap-2 text-sm font-semibold text-red-400" type="button"><Trash2 aria-hidden="true" size={16} />Delete Task</button>
          <div className="flex items-center gap-3"><button className="px-3 py-2 text-sm font-semibold text-text-secondary" onClick={onClose} type="button">Close</button><button className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-black" type="button"><CheckCircle2 aria-hidden="true" size={17} />Complete</button></div>
        </div>
      }
      labelId="task-detail-title"
      onClose={onClose}
      widthClass="max-w-[500px]"
    >
      <header className="flex items-start gap-4 border-b border-border-panel px-6 py-5 pr-20">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-red-500/40 bg-red-950/40 text-red-400"><ClipboardList aria-hidden="true" size={22} /></span>
        <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-400">High Priority <span className="text-text-tertiary">• Math</span></p><h2 className="mt-2 text-xl font-bold" id="task-detail-title">Complete Chapter 4 Exercises</h2><p className="mt-1 flex items-center gap-2 text-xs text-text-muted"><CalendarClock aria-hidden="true" size={14} />Due Tomorrow, 11:59 PM</p></div>
      </header>
      <div className="space-y-6 px-6 py-5">
        <section><h3 className="text-xs font-bold uppercase text-text-secondary">Description</h3><p className="mt-3 rounded-xl border border-border-panel bg-card-hover p-4 text-sm leading-6 text-text-secondary">Finish all the odd-numbered problems from pages 112 to 118. Pay special attention to the proofs on integrals as they will likely appear on the midterm next week.</p></section>
        <section><h3 className="text-xs font-bold uppercase text-text-secondary">Subtasks</h3><div className="mt-3 space-y-2">{taskDetailFixture.subtasks.map((subtask) => { const checked = completedSubtasks.has(subtask.id); return <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border-panel bg-card-hover px-3 py-3 text-sm font-semibold" key={subtask.id}><input checked={checked} className="size-4 accent-white" onChange={() => toggleSubtask(subtask.id)} type="checkbox" /><span className={checked ? "text-text-tertiary line-through" : "text-text-secondary"}>{subtask.title}</span></label>; })}</div></section>
      </div>
    </ModalFrame>
  );
}
