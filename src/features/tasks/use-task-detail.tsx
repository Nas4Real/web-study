"use client";

import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
import type { TaskDetailDTO } from "@/domain/dto";
import { readTaskDetailAction, mutateTaskDetailAction } from "@/server/study/task-detail-actions";
import type { TaskDetailMutation } from "@/server/study/task-detail-service";
import { optimisticTaskDetail } from "./task-detail-state";

type DetailData = { detail: TaskDetailDTO | null; now: string; timeZone: string };

export function TaskDetailProvider({ children }: { children: ReactNode }) {
  // One cache per mounted authenticated surface, never a server/shared singleton.
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function useTaskDetail(taskId: string | null, onSuccess: (detail: TaskDetailDTO | null, id: string) => void) {
  const client = useQueryClient();
  const inFlight = useRef(false);
  const queryKey = ["task-detail", taskId] as const;
  const query = useQuery<DetailData>({
    queryKey, enabled: Boolean(taskId), retry: false, refetchOnWindowFocus: false,
    queryFn: async () => {
      const result = await readTaskDetailAction(taskId!).catch(() => null);
      if (!result) throw new Error("Tasks are temporarily unavailable. Please try again.");
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
  });
  const mutation = useMutation({
    retry: false,
    mutationFn: async ({ id, command }: { id: string; command: TaskDetailMutation }) => {
      const result = await mutateTaskDetailAction(id, command).catch(() => null);
      if (!result) throw new Error("Tasks are temporarily unavailable. Please try again.");
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
    onMutate: async ({ id, command }) => {
      const key = ["task-detail", id] as const;
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<DetailData>(key);
      if (previous?.detail) client.setQueryData(key, {
        ...previous, detail: optimisticTaskDetail(previous.detail, command, previous.now),
      });
      return { previous, key };
    },
    onError: (_error, _command, context) => {
      if (context?.previous) client.setQueryData(context.key, context.previous);
    },
    onSuccess: (data, { id }) => {
      client.setQueryData(["task-detail", id], data);
      onSuccess(data.detail, id);
    },
    onSettled: () => { inFlight.current = false; },
  });
  function mutate(command: TaskDetailMutation) {
    // Lock synchronously; two clicks before React renders cannot race rollback snapshots.
    if (!taskId || inFlight.current) return;
    inFlight.current = true;
    mutation.mutate({ id: taskId, command });
  }
  return { query, mutation, mutate };
}
