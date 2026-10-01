import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { StudySidebar } from "@/features/shell/study-sidebar";
import { getVerifiedActor } from "@/server/auth/request-auth";

export default async function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  const actor = await getVerifiedActor();
  if (!actor) redirect("/sign-in");

  return (
    <div className="flex min-h-screen gap-3 bg-base p-3 text-text antialiased">
      <StudySidebar />
      <main className="workspace-shadow min-w-0 flex-1 overflow-hidden rounded-workspace border border-border-panel bg-panel">
        {children}
      </main>
    </div>
  );
}
