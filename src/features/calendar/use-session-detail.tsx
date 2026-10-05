"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { readSessionDetailAction } from "@/server/study/session-detail-actions";
import type { SessionOccurrenceTarget } from "@/server/study/session-detail-service";

export function SessionDetailProvider({ children }: { children: ReactNode }) {
  // Keep browser request state scoped to the mounted authenticated surface.
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function useSessionDetail(target: SessionOccurrenceTarget | null) {
  return useQuery({
    queryKey: ["session-detail", target?.seriesId, target?.originalStart],
    enabled: target !== null,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const result = await readSessionDetailAction(target!).catch(() => null);
      if (!result) throw new Error("Sessions are temporarily unavailable. Please try again.");
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
  });
}
