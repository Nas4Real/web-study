import { Check } from "lucide-react";
import Link from "next/link";
import type { DashboardTaskDTO } from "@/domain/dto";
import { toneStyles } from "./dashboard-styles";

type TaskProgressProps = { completed: number; tasks: readonly DashboardTaskDTO[];
  onOpen: (id: string) => void; onToggle: (task: DashboardTaskDTO) => void; pending: boolean };

export function TaskProgress({ completed, tasks, onOpen, onToggle, pending }: TaskProgressProps) {
  return (
    <section aria-labelledby="tasks-heading" className="mt-2 flex flex-col">
      <div className="mb-6 flex items-center justify-between px-2">
        <h2 className="text-[18px] font-bold tracking-wide text-white" id="tasks-heading">Tasks</h2>
        <Link className="text-[13px] font-bold text-textMuted transition-colors hover:text-white" href="/tasks">View All</Link>
      </div>
      <div className="rounded-[24px] border border-borderPanel bg-[#121214] p-7 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-medium text-textMuted">Today&apos;s Progress</span>
          <span className="text-[13px] font-bold text-white">{completed} of {tasks.length} completed</span>
        </div>
        <div className="mb-7 h-1.5 w-full overflow-hidden rounded-full bg-[#18181b]">
          <div className="h-full rounded-full bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.5)]" style={{ width: `${tasks.length ? completed / tasks.length * 100 : 0}%` }} />
        </div>
        <ul className="flex flex-col gap-2">
          {tasks.map(task => <TaskRow key={task.id} task={task} onOpen={onOpen} onToggle={onToggle} pending={pending} />)}
          {tasks.length === 0 ? <li className="text-[13px] font-medium text-textMuted">No tasks due today.</li> : null}
        </ul>
      </div>
    </section>
  );
}

function TaskRow({ task, onOpen, onToggle, pending }: Pick<TaskProgressProps, "onOpen" | "onToggle" | "pending"> & { task: DashboardTaskDTO }) {
  const tone = toneStyles[task.tone];
  return (
    <li onClick={() => onOpen(task.id)}
      className={`group flex cursor-pointer items-center gap-4 rounded-[16px] border p-4 ${task.completed
        ? "border-transparent opacity-60 transition-opacity hover:opacity-100"
        : task.highlighted
          ? "border-algebre/30 bg-[#18181b] shadow-sm transition-colors hover:border-algebre/60"
          : "border-transparent transition-colors hover:border-borderPanel hover:bg-[#18181b]"}`}>
      <button aria-checked={task.completed} aria-label={`${task.completed ? "Reopen" : "Complete"} ${task.title}`}
        className={`flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2 transition-colors ${task.completed
          ? "border-green-500 bg-green-500/20 text-green-500"
          : task.highlighted ? "border-algebre/50 group-hover:bg-algebre/10" : "border-zinc-600 group-hover:border-zinc-400"}`}
        role="checkbox" disabled={pending} onClick={event => { event.stopPropagation(); onToggle(task); }} type="button">
        {task.completed ? <Check aria-hidden="true" size={12} /> : null}
      </button>
      <button aria-label={`Open task ${task.title}`} id={`dashboard-task-open-${task.id}`} className="flex min-w-0 flex-1 flex-col text-left" type="button">
        <span className={`mb-1 text-[14px] font-bold transition-colors ${task.completed ? "text-zinc-500 line-through decoration-zinc-500 group-hover:text-zinc-400" : task.highlighted ? "text-white group-hover:text-zinc-200" : "text-zinc-200 group-hover:text-white"}`}>{task.title}</span>
        <span className="flex min-w-0 items-center gap-2">
          <span className={`shrink-0 rounded-[6px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${task.completed ? "bg-zinc-800 text-zinc-400" : tone.badge}`}>{task.subjectLabel}</span>
          {!task.completed && task.description ? <span className="truncate text-[11px] font-medium text-textMuted">{task.description}</span> : null}
        </span>
      </button>
      {!task.completed && task.dueLabel ? <span className="shrink-0 rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-400">{task.dueLabel}</span> : null}
    </li>
  );
}
