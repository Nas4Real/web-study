"use client";

import { usePathname } from "next/navigation";

const destinations: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "Tasks",
  "/calendar": "Calendar",
  "/documents": "Documents",
  "/settings": "Settings",
};

// Nested below the authenticated layout; this does not bypass its runtime wait.
export default function WorkspaceLoading() {
  const destination = destinations[usePathname()] ?? "workspace";
  return (
    <div aria-busy="true" className="min-h-full p-4 sm:p-6 xl:p-8">
      <div className="border-b border-border-panel pb-6">
        <div aria-hidden="true" className="h-8 w-48 max-w-full rounded-md bg-card-hover" />
        <p className="mt-2 text-sm text-text-muted" role="status">Loading {destination}…</p>
      </div>
      <div aria-hidden="true" className="space-y-4 py-7">
        {[0, 1, 2].map(index => (
          <div className="rounded-xl border border-border-panel bg-card p-6" key={index}>
            <div className="h-4 w-1/2 rounded bg-card-hover" />
            <div className="mt-3 h-3 w-3/4 rounded bg-card-hover" />
          </div>
        ))}
      </div>
    </div>
  );
}
