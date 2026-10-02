"use client";

import { Plus, SquareCheckBig } from "lucide-react";
import { useActionState, useEffect } from "react";

import { ModalFrame } from "@/components/modal-frame";
import { createTaskAction } from "@/server/study/task-actions";
import type { TaskActionState } from "@/server/study/task-action-handlers";

const INITIAL_TASK_ACTION_STATE: TaskActionState = {
  code: "IDLE",
  status: "idle",
};

export function NewTaskModal({
  onClose,
  subjects,
}: {
  onClose: () => void;
  subjects: readonly Readonly<{ id: string; name: string }>[];
}) {
  const [state, formAction, pending] = useActionState(
    createTaskAction,
    INITIAL_TASK_ACTION_STATE,
  );

  useEffect(() => {
    if (state.status === "success") onClose();
  }, [onClose, state.status]);

  return (
    <ModalFrame
      footer={
        <>
          <button className="rounded-lg border border-border-hover px-4 py-2.5 text-sm font-semibold text-text-secondary" onClick={onClose} type="button">Cancel</button>
          <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black disabled:cursor-wait disabled:opacity-60" disabled={pending || subjects.length === 0} form="new-task-form" type="submit"><Plus aria-hidden="true" size={16} />{pending ? "Adding…" : "Add Task"}</button>
        </>
      }
      labelId="new-task-title"
      onClose={onClose}
    >
      <header className="flex items-start gap-4 border-b border-border-panel px-6 py-5 pr-20">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-border-hover bg-card-hover"><SquareCheckBig aria-hidden="true" size={22} /></span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-tertiary">Tasks</p>
          <h2 className="mt-1 text-xl font-bold text-white" id="new-task-title">Create new task</h2>
          <p className="mt-1 text-sm text-text-muted">Add an assignment or to-do to your list.</p>
        </div>
      </header>
      <form action={formAction} className="space-y-5 px-6 py-5" id="new-task-form">
        <label className="block text-sm font-semibold text-text-secondary" htmlFor="new-task-title-input">Task title
          <input className="mt-2 h-11 w-full rounded-lg border border-border-hover bg-panel px-3 text-sm outline-none placeholder:text-text-tertiary" id="new-task-title-input" maxLength={240} name="title" placeholder="e.g. Finish TD3 Exercises" required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-text-secondary" htmlFor="new-task-subject">Subject
            <select className="mt-2 h-11 w-full rounded-lg border border-border-hover bg-panel px-3 text-sm" defaultValue="" id="new-task-subject" name="subjectId" required><option disabled value="">Choose subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
          </label>
          <label className="block text-sm font-semibold text-text-secondary" htmlFor="new-task-due-date">Due Date
            <input className="mt-2 h-11 w-full rounded-lg border border-border-hover bg-panel px-3 text-sm" id="new-task-due-date" name="dueDate" type="date" />
          </label>
        </div>
        <label className="block text-sm font-semibold text-text-secondary" htmlFor="new-task-description">Notes <span className="font-normal text-text-tertiary">— optional</span>
          <textarea className="mt-2 min-h-20 w-full resize-none rounded-lg border border-border-hover bg-panel p-3 text-sm outline-none placeholder:text-text-tertiary" id="new-task-description" maxLength={10000} name="description" placeholder="Add any details or links..." />
        </label>
        {state.status === "error" ? <p aria-live="polite" className="text-xs font-semibold text-red-400" role="alert">{state.message}</p> : null}
      </form>
    </ModalFrame>
  );
}
