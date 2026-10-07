import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { StudySidebar } from "@/features/shell/study-sidebar";
import { resolveSettingsRequestContext } from "@/server/study/settings-request-context";

export default async function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  const context = await resolveSettingsRequestContext();
  if (!context) redirect("/sign-in");

  return (
    <div className="flex min-h-screen flex-col gap-3 bg-base p-3 text-text antialiased lg:flex-row">
      <StudySidebar displayName={context.profile.displayName} email={context.email} />
      <main className="workspace-shadow min-w-0 flex-1 overflow-hidden rounded-workspace border border-border-panel bg-panel">
        {children}
      </main>
    </div>
  );
}
