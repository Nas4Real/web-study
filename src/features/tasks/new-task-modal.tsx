"use client";

import { Calendar, ChevronDown, Plus, SquareCheckBig } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { ModalFrame } from "@/components/modal-frame";
import { createTaskAction } from "@/server/study/task-actions";
import type { TaskActionState } from "@/server/study/task-action-handlers";
import { TaskAuthoringSubtasks } from "./task-authoring-subtasks";

const fieldClass = "w-full h-11 bg-base border border-border-base rounded-lg px-3.5 text-sm text-text placeholder:text-text-disabled focus:border-text-muted outline-none transition-colors";
const labelClass = "text-[13px] font-medium text-text-secondary";

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
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"normal" | "high">("normal");

  useEffect(() => {
    if (state.status === "success") onClose();
  }, [onClose, state.status]);

  return (
    <ModalFrame
      closeClass="right-6 top-6 size-8 border-border-base bg-card text-text-muted hover:bg-card-hover"
      footerClass="border-border-base bg-card p-4 px-6 shrink-0"
      overlayClass="bg-black/60 p-4 backdrop-blur-sm"
      panelClass="max-h-[90vh] flex flex-col rounded-[24px] border-border-panel bg-panel workspace-shadow"
      widthClass="max-w-[540px]"
      footer={
        <>
          <button className="h-10 px-5 text-[13px] font-semibold text-white border border-border-base bg-[#0f0f11] rounded-lg hover:bg-card-hover transition-colors" onClick={onClose} type="button">Cancel</button>
          <button className="h-10 px-5 text-[13px] font-semibold text-black bg-white rounded-lg flex items-center gap-2 hover:bg-zinc-200 transition-colors disabled:cursor-wait disabled:opacity-60" disabled={pending || subjects.length === 0} form="new-task-form" type="submit"><Plus aria-hidden="true" size={18} />{pending ? "Adding…" : "Add Task"}</button>
        </>
      }
      labelId="new-task-title"
      onClose={onClose}
    >
      <header className="flex items-start gap-4 p-6 pb-5 pr-16 shrink-0">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-border-base bg-card text-text-secondary"><SquareCheckBig aria-hidden="true" size={24} /></span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-disabled mb-0.5">Tasks</p>
          <h2 className="text-xl font-semibold text-white tracking-tight" id="new-task-title">Create new task</h2>
          <p className="mt-1 text-sm text-text-tertiary">Add an assignment or to-do to your list.</p>
        </div>
      </header>
      <hr className="border-border-base mx-6 shrink-0" />
      <form action={formAction} className="p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar" id="new-task-form">
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="new-task-title-input">Task title</label>
          <input className={fieldClass} id="new-task-title-input" maxLength={240} name="title" placeholder="e.g. Finish TD3 Exercises" required value={title} onChange={event => setTitle(event.target.value)} />
        </div>
        <div className="flex flex-col gap-2" role="group" aria-labelledby="new-task-priority-label">
          <span className={labelClass} id="new-task-priority-label">Priority</span>
          <input name="priority" type="hidden" value={priority} />
          <div className="flex gap-2">
            {(["normal", "high"] as const).map(value => (
              <button aria-pressed={priority === value} className={`flex-1 h-10 border rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${priority === value ? "bg-card border-text-tertiary text-white" : "bg-base border-border-base text-text-muted"}`} key={value} onClick={() => setPriority(value)} type="button">
                {value === "high" ? <span aria-hidden="true" className={`size-1.5 rounded-full bg-red-500 ${priority === "high" ? "" : "hidden"}`} /> : null}
                {value === "normal" ? "Normal" : "High Priority"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className={labelClass} htmlFor="new-task-subject">Subject</label>
            <div className="relative">
              <select className={`${fieldClass} appearance-none`} id="new-task-subject" name="subjectId" required value={subjectId} onChange={event => setSubjectId(event.target.value)}><option disabled value="">Choose subject</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
              <ChevronDown aria-hidden="true" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" size={16} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass} htmlFor="new-task-due-date">Due Date</label>
            <div className="relative">
              <input className={fieldClass} id="new-task-due-date" name="dueDate" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} />
              <Calendar aria-hidden="true" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" size={16} />
            </div>
          </div>
        </div>
        {subjects.length === 0 ? (
          <p className="rounded-lg border border-border-base bg-card p-3 text-sm text-text-muted" role="alert">
            You need a subject before creating a task. <Link className="font-semibold text-white underline underline-offset-4" href="/settings#subjects">Create a subject in Settings</Link>.
          </p>
        ) : null}
        <TaskAuthoringSubtasks />
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="new-task-description">Description <span className="text-text-disabled font-normal ml-1">— optional</span></label>
          <textarea className="w-full h-28 bg-base border border-border-base rounded-lg p-3.5 text-sm text-text placeholder:text-text-disabled focus:border-text-muted outline-none transition-colors resize-none custom-scrollbar shrink-0" id="new-task-description" maxLength={10000} name="description" placeholder="Add any details or links..." value={description} onChange={event => setDescription(event.target.value)} />
        </div>
        {state.status === "error" ? <p aria-live="polite" className="text-xs font-semibold text-red-400" role="alert">{state.message}</p> : null}
      </form>
    </ModalFrame>
  );
}
