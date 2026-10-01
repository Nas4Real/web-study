"use client";

import { CalendarDays, Plus } from "lucide-react";
import { useState } from "react";

import type { TaskListVisualDTO, WorkspaceTone } from "@/domain/dto";
import { tasksPageFixture } from "@/fixtures";

import { NewTaskModal } from "./new-task-modal";
import { TaskDetailsModal } from "./task-details-modal";

const tones: Record<WorkspaceTone, string> = { algebra: "border-algebra/30 bg-algebra/10 text-algebra", analysis: "border-analysis/30 bg-analysis/10 text-analysis", physics: "border-physics/30 bg-physics/10 text-physics", method: "border-method/30 bg-method/10 text-method", neutral: "border-border-hover bg-card-hover text-text-muted" };
const groups = [{ id: "overdue", label: "Overdue" }, { id: "today", label: "Today" }, { id: "later", label: "Later This Week" }] as const;

function TaskRow({ task, onOpen }: { task: TaskListVisualDTO; onOpen: () => void }) {
  return <div className="flex items-start gap-4 border-b border-border-panel p-4 last:border-b-0 sm:p-5"><button aria-label={`Complete ${task.title}`} className="mt-1 size-5 shrink-0 rounded-full border-2 border-border-hover" type="button" /><button aria-label={`Open ${task.title}`} className="min-w-0 flex-1 text-left" onClick={onOpen} type="button"><span className="text-sm font-bold text-white">{task.title}</span><span className="mt-1 block text-sm text-text-muted">{task.description}</span><span className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded border px-2 py-1 text-[10px] font-bold ${tones[task.tone]}`}>{task.subjectLabel}</span><span className="flex items-center gap-1 text-xs font-semibold text-text-muted"><CalendarDays aria-hidden="true" size={13} />{task.dueLabel}</span></span></button></div>;
}

export function TasksPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "completed" | "someday">("pending");
  const [dialog, setDialog] = useState<"new" | "detail" | null>(null);
  return <div className="min-h-full overflow-y-auto p-4 sm:p-6 xl:p-8"><header className="flex flex-col justify-between gap-5 border-b border-border-panel pb-6 sm:flex-row sm:items-start"><div><h1 className="text-[28px] font-bold tracking-tight">Tasks</h1><p className="mt-1 text-sm text-text-muted">Manage your pending assignments and to-dos.</p></div><button className="flex items-center gap-2 self-start rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black" onClick={() => setDialog("new")} type="button"><Plus aria-hidden="true" size={16} />New Task</button></header><div aria-label="Task status" className="flex gap-2 border-b border-border-panel py-6" role="group">{(["pending", "completed", "someday"] as const).map((tab) => <button aria-pressed={activeTab === tab} className={`rounded-md px-4 py-2 text-sm font-semibold capitalize ${activeTab === tab ? "bg-border-panel text-white" : "text-text-muted"}`} key={tab} onClick={() => setActiveTab(tab)} type="button">{tab}</button>)}</div>{activeTab === "pending" ? <div className="space-y-8 py-7">{groups.map((group) => <section key={group.id}><h2 className={`mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.18em] ${group.id === "overdue" ? "text-red-400" : "text-text-muted"}`}>{group.label}</h2><div className="overflow-hidden rounded-xl border border-border-panel bg-card">{tasksPageFixture.filter((task) => task.group === group.id).map((task) => <TaskRow key={task.id} onOpen={() => setDialog("detail")} task={task} />)}</div></section>)}</div> : <div className="py-20 text-center text-sm text-text-muted">No {activeTab} tasks in this static fixture.</div>}{dialog === "new" ? <NewTaskModal onClose={() => setDialog(null)} /> : null}{dialog === "detail" ? <TaskDetailsModal onClose={() => setDialog(null)} /> : null}</div>;
}
