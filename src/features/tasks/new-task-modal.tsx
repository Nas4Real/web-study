"use client";

import { Plus, SquareCheckBig } from "lucide-react";

import { ModalFrame } from "@/components/modal-frame";

export function NewTaskModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalFrame
      footer={
        <>
          <button className="rounded-lg border border-border-hover px-4 py-2.5 text-sm font-semibold text-text-secondary" onClick={onClose} type="button">Cancel</button>
          <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black" type="button"><Plus aria-hidden="true" size={16} />Add Task</button>
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
      <form className="space-y-5 px-6 py-5">
        <label className="block text-sm font-semibold text-text-secondary">Task title
          <input className="mt-2 h-11 w-full rounded-lg border border-border-hover bg-panel px-3 text-sm outline-none placeholder:text-text-tertiary" placeholder="e.g. Finish TD3 Exercises" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-text-secondary">Subject
            <select className="mt-2 h-11 w-full rounded-lg border border-border-hover bg-panel px-3 text-sm"><option>Choose subject</option><option>Math</option><option>Analysis</option><option>Physics</option></select>
          </label>
          <label className="block text-sm font-semibold text-text-secondary">Due Date
            <input className="mt-2 h-11 w-full rounded-lg border border-border-hover bg-panel px-3 text-sm" type="date" />
          </label>
        </div>
        <label className="block text-sm font-semibold text-text-secondary">Notes <span className="font-normal text-text-tertiary">— optional</span>
          <textarea className="mt-2 min-h-20 w-full resize-none rounded-lg border border-border-hover bg-panel p-3 text-sm outline-none placeholder:text-text-tertiary" placeholder="Add any details or links..." />
        </label>
      </form>
    </ModalFrame>
  );
}
