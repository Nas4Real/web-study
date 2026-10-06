"use client";

import { Camera } from "lucide-react";
import { useActionState } from "react";

import { updateProfileAction } from "@/server/study/settings-actions";
import type { SettingsActionState } from "@/server/study/settings-action-handlers";

const initialState: SettingsActionState = {
  code: "IDLE",
  message: "",
  status: "idle",
};

export function SettingsProfileForm({
  displayName,
  email,
}: Readonly<{ displayName: string; email: string }>) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState,
  );
  return (
    <form action={formAction}>
      <div className="grid gap-5 sm:grid-cols-[88px_1fr_1fr]">
        <div className="relative mx-auto grid size-20 place-items-center rounded-full border-4 border-border-hover bg-physics text-2xl font-bold text-black">
          {displayName.trim().charAt(0).toUpperCase() || "?"}
          <button
            aria-label="Profile photo upload is not available yet"
            className="absolute bottom-0 right-0 grid size-7 place-items-center rounded-full border border-border-hover bg-card text-white"
            disabled
            type="button"
          >
            <Camera aria-hidden="true" size={13} />
          </button>
        </div>
        <label className="text-xs font-semibold text-text-muted">
          Full Name
          <input
            autoComplete="name"
            className="mt-2 h-11 w-full rounded-lg border border-border-panel bg-panel px-3 text-sm font-semibold text-white"
            defaultValue={displayName}
            maxLength={120}
            name="displayName"
            required
          />
        </label>
        <label className="text-xs font-semibold text-text-muted">
          Email Address
          <input
            autoComplete="email"
            className="mt-2 h-11 w-full rounded-lg border border-border-panel bg-panel px-3 text-sm text-text-muted"
            readOnly
            value={email}
          />
        </label>
      </div>
      <div className="mt-5 flex items-center justify-end gap-4">
        <p
          aria-live="polite"
          className={state.status === "error" ? "text-sm text-red-400" : "text-sm text-emerald-400"}
        >
          {state.message}
        </p>
        <button
          className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black disabled:cursor-wait disabled:opacity-70"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
