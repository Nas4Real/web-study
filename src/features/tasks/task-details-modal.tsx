"use client";

import { CalendarClock, CheckCircle2, ClipboardList, Trash2 } from "lucide-react";
import { useState } from "react";

import { ModalFrame } from "@/components/modal-frame";
import type { TaskDetailDTO } from "@/domain/dto";
import type { TaskDetailMutation } from "@/server/study/task-detail-service";
import { formatTaskDetailDue } from "./task-detail-state";
import { TaskDeleteConfirmation } from "./task-delete-confirmation";

export function TaskDetailsModal({ detail, now, timeZone, pending, error, onMutate, onClose }: {
  detail: TaskDetailDTO; now: string; timeZone: string; pending: boolean; error: string | null;
  onMutate: (command: TaskDetailMutation) => void; onClose: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <ModalFrame
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button className="flex items-center gap-2 text-sm font-semibold text-red-400" disabled={pending} onClick={() => setConfirmDelete(true)} type="button"><Trash2 aria-hidden="true" size={16} />Delete Task</button>
          <div className="flex items-center gap-3"><button className="px-3 py-2 text-sm font-semibold text-text-secondary" onClick={onClose} type="button">Close</button><button className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-black" disabled={pending} onClick={() => onMutate({ type: detail.status === "completed" ? "reopen" : "complete" })} type="button"><CheckCircle2 aria-hidden="true" size={17} />{detail.status === "completed" ? "Reopen" : "Complete"}</button></div>
        </div>
      }
      labelId="task-detail-title"
      onClose={onClose}
      widthClass="max-w-[500px]"
    >
      <header className="flex items-start gap-4 border-b border-border-panel px-6 py-5 pr-20">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-red-500/40 bg-red-950/40 text-red-400"><ClipboardList aria-hidden="true" size={22} /></span>
        <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-400">{detail.priority === "high" ? "High" : "Normal"} Priority <span className="text-text-tertiary">• {detail.subject.name}</span></p><h2 className="mt-2 text-xl font-bold" id="task-detail-title">{detail.title}</h2><p className="mt-1 flex items-center gap-2 text-xs text-text-muted"><CalendarClock aria-hidden="true" size={14} />{formatTaskDetailDue(detail.dueAt, timeZone, now)}</p></div>
      </header>
      <div className="space-y-6 px-6 py-5">
        <section><h3 className="text-xs font-bold uppercase text-text-secondary">Description</h3><p className="mt-3 rounded-xl border border-border-panel bg-card-hover p-4 text-sm leading-6 text-text-secondary">{detail.description ?? ""}</p></section>
        <section><h3 className="text-xs font-bold uppercase text-text-secondary">Subtasks</h3><div className="mt-3 space-y-2">{detail.subtasks.map((subtask) => { const checked = Boolean(subtask.completedAt); return <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border-panel bg-card-hover px-3 py-3 text-sm font-semibold" key={subtask.id}><input checked={checked} className="size-4 accent-white" disabled={pending} onChange={event => onMutate({ type: "subtask", subtaskId: subtask.id, completed: event.target.checked })} type="checkbox" /><span className={checked ? "text-text-tertiary line-through" : "text-text-secondary"}>{subtask.title}</span></label>; })}</div></section>
        {error && !confirmDelete ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
      </div>
      {confirmDelete ? <TaskDeleteConfirmation title={detail.title} pending={pending} error={error} onCancel={() => setConfirmDelete(false)} onConfirm={() => onMutate({ type: "delete" })} /> : null}
    </ModalFrame>
  );
}
