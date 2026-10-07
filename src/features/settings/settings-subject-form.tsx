"use client";

import { BookOpen, Plus } from "lucide-react";
import { useActionState } from "react";

import { createSubjectAction } from "@/server/study/subject-actions";
import type { SubjectActionState } from "@/server/study/subject-action-handlers";

const initialState: SubjectActionState = {
  code: "IDLE",
  message: "",
  status: "idle",
};

const subjectColors = ["#ec4899", "#06b6d4", "#10b981", "#f59e0b"] as const;

export function SettingsSubjectForm({
  subjects,
}: Readonly<{
  subjects: readonly Readonly<{ color: string; id: string; name: string }>[];
}>) {
  const [state, formAction, pending] = useActionState(
    createSubjectAction,
    initialState,
  );

  return (
    <div>
      {subjects.length > 0 ? (
        <ul className="mb-5 grid gap-2 sm:grid-cols-2">
          {subjects.map((subject) => (
            <li
              className="flex items-center gap-3 rounded-lg border border-border-panel bg-panel px-3 py-3 text-sm font-semibold"
              key={subject.id}
            >
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-black"
                style={{ backgroundColor: subject.color }}
              >
                <BookOpen size={15} />
              </span>
              <span className="truncate">{subject.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-5 rounded-lg border border-border-panel bg-panel p-4 text-sm text-text-muted">
          Create your first subject to start adding tasks, sessions, and chapters.
        </p>
      )}

      <form action={formAction} className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="text-xs font-semibold text-text-muted">
          Subject Name
          <input
            autoComplete="off"
            className="mt-2 h-11 w-full rounded-lg border border-border-panel bg-panel px-3 text-sm font-semibold text-white"
            maxLength={120}
            name="name"
            placeholder="e.g. Physics"
            required
          />
        </label>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-text-muted">Color</legend>
          <div className="flex h-11 items-center gap-2 rounded-lg border border-border-panel bg-panel px-3">
            {subjectColors.map((color, index) => (
              <label className="relative grid cursor-pointer place-items-center" key={color}>
                <input
                  className="peer sr-only"
                  defaultChecked={index === 0}
                  name="color"
                  type="radio"
                  value={color}
                />
                <span
                  aria-hidden="true"
                  className="size-5 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-panel peer-checked:ring-white"
                  style={{ backgroundColor: color }}
                />
                <span className="sr-only">{color}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-black disabled:cursor-wait disabled:opacity-70"
          disabled={pending}
          type="submit"
        >
          <Plus aria-hidden="true" size={16} />
          {pending ? "Adding…" : "Add Subject"}
        </button>
      </form>
      <p
        aria-live="polite"
        className={`mt-3 text-sm ${state.status === "error" ? "text-red-400" : "text-emerald-400"}`}
        role={state.status === "error" ? "alert" : undefined}
      >
        {state.message}
      </p>
    </div>
  );
}
