import type { ReactNode } from "react";

import { StudySidebar } from "@/features/shell/study-sidebar";

export default function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen gap-3 bg-base p-3 text-text antialiased">
      <StudySidebar activeItem="dashboard" />
      <main className="workspace-shadow min-w-0 flex-1 overflow-hidden rounded-workspace border border-border-panel bg-panel">
        {children}
      </main>
    </div>
  );
}
