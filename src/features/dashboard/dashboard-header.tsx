import { Bell, Plus } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="flex flex-col items-start justify-between gap-6 sm:flex-row">
      <div>
        <h1 className="text-[32px] font-bold tracking-tight text-text">Overview</h1>
        <p className="mt-1 text-sm text-text-muted">All of your performance reports.</p>
      </div>
      <div className="flex items-center gap-4">
        <button
          aria-label="Notifications"
          className="relative grid size-10 place-items-center rounded-full border border-border-panel transition-colors hover:bg-card-hover"
          type="button"
        >
          <Bell aria-hidden="true" size={18} />
          <span aria-hidden="true" className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-algebra" />
        </button>
        <button
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-text-secondary"
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          New Task
        </button>
      </div>
    </header>
  );
}
