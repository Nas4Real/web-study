"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { transitionTaskAction } from "@/server/study/task-actions";

import { NewTaskModal } from "./new-task-modal";
import { TaskListRow } from "./task-list-row";
import { TaskDetailsModal } from "./task-details-modal";
import type { TaskListViewModel } from "./task-view-model";
import { TaskDetailProvider, useTaskDetail } from "./use-task-detail";

const groups = [{ id: "overdue", label: "Overdue" }, { id: "today", label: "Today" }, { id: "later", label: "Later This Week" }] as const;

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
  const taskRows = (items: readonly TaskListViewModel[]) => items.map((task) => <TaskListRow key={task.id} onOpen={() => { detail.mutation.reset(); setSelectedTaskId(task.id); setDialog("detail"); }} onTransition={(transition) => transitionTask(task, transition)} task={task} />);

  return (
    <div id="page-tasks" className="flex h-full min-h-0 w-full flex-col">
      <header className="flex shrink-0 flex-col items-start justify-between gap-5 border-b border-borderPanel px-4 pb-5 pt-8 sm:flex-row sm:px-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[26px] font-bold leading-none tracking-tight text-white">Tasks</h1>
          <p className="text-[14px] font-medium text-textMuted">Manage your pending assignments and to-dos.</p>
        </div>
        <button className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[14px] font-bold text-black shadow-sm transition-all hover:bg-zinc-200" onClick={() => setDialog("new")} type="button"><Plus aria-hidden="true" size={16} />New Task</button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-4 sm:p-8">
        <div aria-label="Task status" className="flex items-center gap-4 border-b border-borderPanel pb-4" role="group">
          {(["pending", "completed", "someday"] as const).map(tab => <button aria-pressed={activeTab === tab}
            className={`rounded-md px-4 py-2 text-[13px] capitalize transition-colors ${activeTab === tab ? "bg-[#27272a] font-bold text-white shadow-sm" : "font-medium text-textMuted hover:bg-[#18181b] hover:text-white"}`}
            key={tab} onClick={() => setActiveTab(tab)} type="button">{tab}</button>)}
        </div>
        {loadError || mutationError || (dialog === "detail" && detail.query.error) ? <p aria-live="polite" className="text-sm font-semibold text-red-400" role="alert">{mutationError ?? loadError ?? detail.query.error?.message}</p> : null}
        {activeTab === "pending" ? groups.map(group => (
          <section className="flex flex-col gap-3" key={group.id}>
            <h2 className={`px-2 text-[12px] font-bold uppercase tracking-[0.15em] ${group.id === "overdue" ? "text-red-400" : "text-zinc-400"}`}>{group.label}</h2>
            <div className="flex flex-col overflow-hidden rounded-xl border border-borderPanel bg-cardBg shadow-sm">{taskRows(visibleTasks.filter(task => task.group === group.id))}</div>
          </section>
        )) : visibleTasks.length > 0 ? <div className="flex flex-col overflow-hidden rounded-xl border border-borderPanel bg-cardBg shadow-sm">{taskRows(visibleTasks)}</div> : <div className="py-20 text-center text-sm text-textMuted">No {activeTab} tasks.</div>}
      </div>
      {dialog === "new" ? <NewTaskModal onClose={() => { setDialog(null); router.refresh(); }} subjects={subjects} /> : null}
      {dialog === "detail" && detail.query.data?.detail ? <TaskDetailsModal key={selectedTaskId} detail={detail.query.data.detail} now={detail.query.data.now} timeZone={detail.query.data.timeZone} pending={detail.mutation.isPending} error={detail.mutation.error?.message ?? null} onMutate={detail.mutate} onClose={() => { setDialog(null); setSelectedTaskId(null); }} /> : null}
      {dialog === "detail" && detail.query.isPending ? <p className="sr-only" role="status">Loading task details.</p> : null}
    </div>
  );
}
