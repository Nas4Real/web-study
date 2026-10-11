import { Bell, Plus } from "lucide-react";

export function DashboardHeader({ onOpenNewTask }: { onOpenNewTask: () => void }) {
  return (
    <header className="mb-2 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
      <div>
        <h1 className="mb-2 text-[32px] font-bold leading-none tracking-tight text-white">Overview</h1>
        <p className="text-[14px] font-medium text-textMuted">All of your performance reports.</p>
      </div>
      <div className="flex items-center gap-4">
        <button aria-label="Notifications (coming later)" title="Notifications are not enabled yet" disabled
          className="relative flex size-10 items-center justify-center rounded-full border border-borderPanel bg-cardBg text-zinc-300" type="button">
          <Bell aria-hidden="true" size={16} />
        </button>
        <button onClick={onOpenNewTask} className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[14px] font-bold text-black shadow-sm transition-all hover:bg-zinc-200" type="button">
          <Plus aria-hidden="true" size={16} />New Task
        </button>
      </div>
    </header>
  );
}
