import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { StudySidebar } from "@/features/shell/study-sidebar";
import { resolveSettingsRequestContext } from "@/server/study/settings-request-context";

export default async function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  const context = await resolveSettingsRequestContext();
  if (!context) redirect("/sign-in");

  return (
    <div className="flex min-h-screen w-full flex-col gap-3 bg-base p-3 font-sans text-zinc-200 antialiased selection:bg-white selection:text-black lg:h-screen lg:min-h-0 lg:flex-row lg:overflow-hidden">
      <StudySidebar displayName={context.profile.displayName} email={context.email} />
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto rounded-[20px] border border-borderPanel bg-panel shadow-2xl lg:h-full">
        {children}
      </main>
    </div>
  );
}
