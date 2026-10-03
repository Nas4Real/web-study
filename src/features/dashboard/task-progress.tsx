import { Check } from "lucide-react";

import type { DashboardTaskDTO } from "@/domain/dto";

import { toneStyles } from "./dashboard-styles";

type TaskProgressProps = { completed: number; tasks: readonly DashboardTaskDTO[];
  onOpen: (id: string) => void; onToggle: (task: DashboardTaskDTO) => void; pending: boolean };

export function TaskProgress({ completed, tasks, onOpen, onToggle, pending }: TaskProgressProps) {
  return (
    <section aria-labelledby="tasks-heading">
      <div className="mb-6 flex items-center justify-between px-2">
        <h2 className="text-xl font-bold" id="tasks-heading">
          Tasks
        </h2>
        <a className="text-xs font-medium text-text-tertiary hover:text-text" href="#tasks">
          View All
        </a>
      </div>
      <div className="rounded-2xl border border-border-base bg-card p-6">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">Today&apos;s Progress</span>
          <span className="font-semibold">
            {completed} of {tasks.length} completed
          </span>
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-border-base">
          <div className="h-full rounded-full bg-mechanics shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${tasks.length ? completed / tasks.length * 100 : 0}%` }} />
        </div>
        <ul className="mt-8 space-y-3">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onOpen={onOpen} onToggle={onToggle} pending={pending} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function TaskRow({ task, onOpen, onToggle, pending }: Pick<TaskProgressProps, "onOpen" | "onToggle" | "pending"> & { task: DashboardTaskDTO }) {
  const tone = toneStyles[task.tone];
  return (
    <li
      onClick={() => onOpen(task.id)}
      className={`flex items-center justify-between gap-4 rounded-2xl border p-5 ${
        task.highlighted ? "border-algebra/30 bg-card-hover/50" : "border-transparent bg-card-hover/50"
      } ${task.completed ? "opacity-40" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-4">
        <button
          aria-checked={task.completed}
          aria-label={`${task.completed ? "Reopen" : "Complete"} ${task.title}`}
          className={`grid size-6 shrink-0 place-items-center rounded-md border-2 ${
            task.completed
              ? "border-physics bg-physics text-black"
              : task.highlighted
                ? "border-algebra"
                : "border-text-disabled hover:border-text-muted"
          }`}
          role="checkbox"
          disabled={pending}
          onClick={event => { event.stopPropagation(); onToggle(task); }}
          type="button"
        >
          {task.completed ? <Check aria-hidden="true" size={13} /> : null}
        </button>
        <button aria-label={`Open task ${task.title}`} id={`dashboard-task-open-${task.id}`} className="min-w-0 text-left" type="button">
          <span className={`block truncate text-sm font-semibold ${task.completed ? "line-through" : ""}`}>{task.title}</span>
          <span className="mt-1 flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${tone.badge}`}>{task.subjectLabel}</span>
            {task.description ? <span className="truncate text-[10px] text-text-tertiary">{task.description}</span> : null}
          </span>
        </button>
      </div>
      {task.dueLabel ? (
        <span className="shrink-0 rounded bg-algebra/10 px-2.5 py-1 text-[10px] font-bold text-algebra">
          {task.dueLabel}
        </span>
      ) : null}
    </li>
  );
}
