"use client";

import { useLinkStatus } from "next/link";

/** Next owns interruption/commit state; the hint never changes link geometry. */
export function NavigationLabel({ children }: Readonly<{ children: string }>) {
  const { pending } = useLinkStatus();
  return (
    <span className="relative">
      {children}
      {pending ? (
        <span className="absolute left-full top-1/2 ml-2 size-2 -translate-y-1/2 rounded-full bg-text-muted" role="status">
          <span className="sr-only">Loading {children}…</span>
        </span>
      ) : null}
    </span>
  );
}
