"use client";

import { CalendarDays, Check, MoreVertical, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { WorkspaceTone } from "@/domain/dto";
import { transitionTaskAction } from "@/server/study/task-actions";

import { NewTaskModal } from "./new-task-modal";
import { TaskDetailsModal } from "./task-details-modal";
import type { TaskListViewModel } from "./task-view-model";
import { TaskDetailProvider, useTaskDetail } from "./use-task-detail";

const tones: Record<WorkspaceTone, string> = { algebra: "border-algebra/30 bg-algebra/10 text-algebra", analysis: "border-analysis/30 bg-analysis/10 text-analysis", physics: "border-physics/30 bg-physics/10 text-physics", method: "border-method/30 bg-method/10 text-method", neutral: "border-border-hover bg-card-hover text-text-muted" };
const groups = [{ id: "overdue", label: "Overdue" }, { id: "today", label: "Today" }, { id: "later", label: "Later This Week" }] as const;

function TaskRow({ task, onOpen, onTransition }: { task: TaskListViewModel; onOpen: () => void; onTransition: (transition: "complete" | "reopen" | "someday") => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const completed = task.status === "completed";
  return <div className="group flex items-start gap-4 border-b border-border-panel p-4 last:border-b-0 sm:p-5"><button aria-label={`${completed ? "Reopen" : "Complete"} ${task.title}`} aria-pressed={completed} className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full border-2 ${completed ? "border-white bg-white text-black" : "border-border-hover"}`} onClick={() => onTransition(completed ? "reopen" : "complete")} type="button">{completed ? <Check aria-hidden="true" size={13} strokeWidth={3} /> : null}</button><button aria-label={`Open ${task.title}`} id={`task-open-${task.id}`} className="min-w-0 flex-1 text-left" onClick={onOpen} type="button"><span className={`text-sm font-bold text-white ${completed ? "line-through opacity-70" : ""}`}>{task.title}</span><span className="mt-1 block text-sm text-text-muted">{task.description}</span><span className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded border px-2 py-1 text-[10px] font-bold ${tones[task.tone]}`}>{task.subjectLabel}</span><span className="flex items-center gap-1 text-xs font-semibold text-text-muted"><CalendarDays aria-hidden="true" size={13} />{task.dueLabel}</span></span></button><span className="relative"><button aria-expanded={menuOpen} aria-label={`More actions for ${task.title}`} className="p-2 text-text-muted opacity-0 transition-all hover:text-white focus:opacity-100 group-hover:opacity-100" onClick={() => setMenuOpen((open) => !open)} type="button"><MoreVertical aria-hidden="true" size={18} /></button>{menuOpen ? <span className="absolute right-0 top-9 z-10 min-w-40 rounded-lg border border-border-hover bg-card p-1 shadow-2xl"><button className="w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-text-secondary hover:bg-card-hover hover:text-white" onClick={() => { setMenuOpen(false); onTransition(task.status === "someday" ? "reopen" : "someday"); }} type="button">{task.status === "someday" ? "Move to Pending" : "Move to Someday"}</button></span> : null}</span></div>;
}

type TasksPageProps = { initialErrorCode: "UNAUTHENTICATED" | "STORAGE_UNAVAILABLE" | null; initialTasks: readonly TaskListViewModel[]; subjects: readonly Readonly<{ id: string; name: string }>[] };

export function TasksPage(props: TasksPageProps) {
  return <TaskDetailProvider><TasksPageContent {...props} /></TaskDetailProvider>;
}

function TasksPageContent({ initialErrorCode, initialTasks, subjects }: TasksPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"pending" | "completed" | "someday">("pending");
  const [dialog, setDialog] = useState<"new" | "detail" | null>(null);
  const [taskState, setTaskState] = useState({ source: initialTasks, value: initialTasks });
  const tasks = taskState.source === initialTasks ? taskState.value : initialTasks;
  function setTasks(next: readonly TaskListViewModel[] | ((current: readonly TaskListViewModel[]) => readonly TaskListViewModel[])) {
    setTaskState(current => ({ source: initialTasks, value: typeof next === "function" ? next(current.source === initialTasks ? current.value : initialTasks) : next }));
  }
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const detail = useTaskDetail(dialog === "detail" ? selectedTaskId : null, (updated, id) => {
    if (!updated) {
      setTasks(current => current.filter(task => task.id !== id));
      if (selectedTaskId === id) { setDialog(null); setSelectedTaskId(null); }
    } else {
      setTasks(current => current.map(task => task.id !== id ? task : { ...task, status: updated.status,
        group: updated.status === "completed" ? "completed" : updated.status === "someday" ? "someday" : task.group === "completed" || task.group === "someday" ? "later" : task.group }));
    }
    router.refresh();
  });

  function transitionTask(task: TaskListViewModel, transition: "complete" | "reopen" | "someday") {
    const previous = tasks;
    const status = transition === "complete" ? "completed" : transition === "someday" ? "someday" : "pending";
    const group = status === "completed" ? "completed" : status === "someday" ? "someday" : task.group === "completed" || task.group === "someday" ? "later" : task.group;
    setMutationError(null);
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, group, status } : item));
    startTransition(async () => {
      const result = await transitionTaskAction(task.id, transition);
      if (result.status === "error") {
        setTasks(previous);
        setMutationError(result.message);
      } else {
        router.refresh();
      }
    });
  }

  const visibleTasks = tasks.filter((task) => task.status === activeTab);
  const loadError = initialErrorCode === "STORAGE_UNAVAILABLE" ? "Tasks are temporarily unavailable. Please try again." : initialErrorCode === "UNAUTHENTICATED" ? "Your session has expired. Sign in and try again." : null;
  const taskRows = (items: readonly TaskListViewModel[]) => items.map((task) => <TaskRow key={task.id} onOpen={() => { detail.mutation.reset(); setSelectedTaskId(task.id); setDialog("detail"); }} onTransition={(transition) => transitionTask(task, transition)} task={task} />);

  return <div className="min-h-full overflow-y-auto p-4 sm:p-6 xl:p-8"><header className="flex flex-col justify-between gap-5 border-b border-border-panel pb-6 sm:flex-row sm:items-start"><div><h1 className="text-[28px] font-bold tracking-tight">Tasks</h1><p className="mt-1 text-sm text-text-muted">Manage your pending assignments and to-dos.</p></div><button className="flex items-center gap-2 self-start rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black" onClick={() => setDialog("new")} type="button"><Plus aria-hidden="true" size={16} />New Task</button></header><div aria-label="Task status" className="flex gap-2 border-b border-border-panel py-6" role="group">{(["pending", "completed", "someday"] as const).map((tab) => <button aria-pressed={activeTab === tab} className={`rounded-md px-4 py-2 text-sm font-semibold capitalize ${activeTab === tab ? "bg-border-panel text-white" : "text-text-muted"}`} key={tab} onClick={() => setActiveTab(tab)} type="button">{tab}</button>)}</div>{loadError || mutationError || (dialog === "detail" && detail.query.error) ? <p aria-live="polite" className="mt-5 text-sm font-semibold text-red-400" role="alert">{mutationError ?? loadError ?? detail.query.error?.message}</p> : null}{activeTab === "pending" ? <div className="space-y-8 py-7">{groups.map((group) => <section key={group.id}><h2 className={`mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.18em] ${group.id === "overdue" ? "text-red-400" : "text-text-muted"}`}>{group.label}</h2><div className="overflow-hidden rounded-xl border border-border-panel bg-card">{taskRows(visibleTasks.filter((task) => task.group === group.id))}</div></section>)}</div> : visibleTasks.length > 0 ? <div className="py-7"><div className="overflow-hidden rounded-xl border border-border-panel bg-card">{taskRows(visibleTasks)}</div></div> : <div className="py-20 text-center text-sm text-text-muted">No {activeTab} tasks.</div>}{dialog === "new" ? <NewTaskModal onClose={() => { setDialog(null); router.refresh(); }} subjects={subjects} /> : null}{dialog === "detail" && detail.query.data?.detail ? <TaskDetailsModal key={selectedTaskId} detail={detail.query.data.detail} now={detail.query.data.now} timeZone={detail.query.data.timeZone} pending={detail.mutation.isPending} error={detail.mutation.error?.message ?? null} onMutate={detail.mutate} onClose={() => { setDialog(null); setSelectedTaskId(null); }} /> : null}{dialog === "detail" && detail.query.isPending ? <p className="sr-only" role="status">Loading task details.</p> : null}</div>;
}
