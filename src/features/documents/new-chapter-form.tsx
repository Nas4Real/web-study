"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";

import { createChapterAction } from "@/server/study/chapter-actions";
import type { ChapterActionState } from "@/server/study/chapter-action-handlers";

const initialState: ChapterActionState = { code: "IDLE", message: "", status: "idle" };

export function NewChapterForm({ subjectId }: Readonly<{ subjectId: string }>) {
  const [state, formAction, pending] = useActionState(createChapterAction, initialState);
  return (
    <form action={formAction} className="mt-5 flex max-w-xl flex-col gap-2 sm:flex-row">
      <input name="subjectId" type="hidden" value={subjectId} />
      <label className="sr-only" htmlFor="new-chapter-name">Chapter name</label>
      <input
        className="h-10 min-w-0 flex-1 rounded-lg border border-border-panel bg-card px-3 text-sm text-white placeholder:text-text-tertiary"
        id="new-chapter-name"
        maxLength={160}
        name="name"
        placeholder="New chapter name"
        required
      />
      <button className="flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-black disabled:cursor-wait disabled:opacity-70" disabled={pending} type="submit">
        <Plus aria-hidden="true" size={15} />{pending ? "Adding…" : "Add Chapter"}
      </button>
      <p aria-live="polite" className={`basis-full text-xs ${state.status === "error" ? "text-red-400" : "text-emerald-400"}`} role={state.status === "error" ? "alert" : undefined}>{state.message}</p>
    </form>
  );
}
