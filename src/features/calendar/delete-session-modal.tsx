"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";

import { ModalFrame } from "@/components/modal-frame";
import type { CalendarOccurrenceDetailDTO } from "@/domain/dto";
import { deleteSessionAction } from "@/server/study/calendar-actions";

import type { SessionMutationScope } from "./session-mutation-scope-modal";

function formatOccurrence(session: CalendarOccurrenceDetailDTO, timeZone: string) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone,
    weekday: "short",
    year: "numeric",
  }).format(new Date(session.startsAt));
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone,
  });
  return `${date} · ${time.format(new Date(session.startsAt))}–${time.format(new Date(session.endsAt))}`;
}

export function DeleteSessionModal({ onCancel, onDeleted, onScopeChange, scope, session, timeZone }: {
  onCancel: () => void;
  onDeleted: () => void;
  onScopeChange: (scope: SessionMutationScope) => void;
  scope: SessionMutationScope;
  session: CalendarOccurrenceDetailDTO;
  timeZone: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const deleteSeries = !session.isRecurring || scope === "series";
  const close = () => { if (!pending) onCancel(); };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = deleteSeries
      ? { scope: "series" as const, seriesId: session.seriesId }
      : { scope: "occurrence" as const, seriesId: session.seriesId, originalStart: session.originalStart };
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteSessionAction(target);
        if (result.status === "success") onDeleted();
        else setError(result.message);
      } catch {
        setError("Sessions are temporarily unavailable. Please try again.");
      }
    });
  }

  return (
    <ModalFrame
      closeClass="right-4 top-5 size-10 border-[#303034] bg-[#171719] text-zinc-300 hover:bg-[#232326] sm:right-6 [&>svg]:size-5"
      closeDisabled={pending}
      descriptionId="delete-session-description"
      labelId="delete-session-title"
      onClose={close}
      overlayClass="!z-[110] bg-black/75 p-[9px] backdrop-blur-sm sm:p-4"
      panelClass="max-h-full !overflow-y-auto rounded-2xl border-[#2a2a2e] bg-[#101012] shadow-2xl"
      widthClass="max-w-[500px]"
    >
      <header className="flex items-start gap-3 border-b border-[#27272a] px-4 py-5 pr-16 sm:px-6 sm:pr-20">
        <span className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-xl border border-[#303034] bg-[#1a1a1d] text-zinc-100"><Trash2 aria-hidden="true" size={21} /></span>
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-zinc-400">Calendar</p>
          <h2 className="mt-1 text-[20px] font-bold tracking-tight text-white" id="delete-session-title">{session.isRecurring ? "Delete recurring session" : "Delete session"}</h2>
          <p className="mt-1 text-[14px] leading-5 text-zinc-300" id="delete-session-description">{session.isRecurring ? "Choose which sessions you want to delete." : "Are you sure you want to delete this session?"}</p>
        </div>
      </header>
      <form aria-busy={pending} onSubmit={submit}>
        <fieldset className="space-y-5 px-4 py-5 sm:px-6" disabled={pending}>
          <div className="rounded-xl border border-[#2c2c30] bg-[#18181b] px-4 py-4">
            <p className="text-[14px] font-bold text-white">{session.title}</p>
            <p className="mt-1 font-mono text-[12px] text-zinc-400">{formatOccurrence(session, timeZone)}</p>
          </div>
          {session.isRecurring ? <fieldset className="space-y-2">
            <legend className="mb-3 text-[14px] font-bold text-zinc-100">Apply to</legend>
            {([
              ["occurrence", "This session only", "Other sessions in this series stay unchanged."],
              ["series", "Entire series", "Remove every session in this series, including exceptions."],
            ] as const).map(([value, label, description]) => (
              <label className={`flex cursor-pointer gap-3 rounded-xl border px-4 py-4 transition-colors ${scope === value ? "border-zinc-400 bg-[#202023]" : "border-[#303034] bg-[#171719] hover:border-zinc-600"}`} key={value}>
                <input checked={scope === value} className="mt-0.5 size-4 accent-white" name="session-delete-scope" onChange={() => onScopeChange(value)} type="radio" />
                <span><span className="block text-[14px] font-bold text-white">{label}</span><span className="mt-1 block text-[12px] leading-5 text-zinc-400">{description}</span></span>
              </label>
            ))}
          </fieldset> : null}
          <p className="text-[13px] leading-5 text-zinc-300">{deleteSeries
            ? session.isRecurring ? "The entire series and its exceptions will be permanently deleted." : "This session will be permanently deleted."
            : "Only this occurrence will be removed. Other sessions in the series stay unchanged."}</p>
          {error ? <p className="text-[14px] leading-5 text-red-300" role="alert">{error}</p> : null}
        </fieldset>
        <footer className="flex flex-col items-stretch justify-between gap-3 border-t border-[#27272a] bg-[#0a0a0c] px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <span className="text-[12px] font-medium text-zinc-400">This action cannot be undone.</span>
          <div className="flex items-center justify-end gap-2">
            <button className="rounded-lg border border-[#343438] bg-[#171719] px-4 py-2.5 text-[14px] font-bold text-white hover:bg-[#222225] disabled:opacity-50" disabled={pending} onClick={close} type="button">Cancel</button>
            <button aria-label={pending ? "Deleting..." : deleteSeries && session.isRecurring ? "Delete series" : "Delete session"} className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-[14px] font-bold text-black hover:bg-white disabled:opacity-50" disabled={pending} type="submit">{pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Trash2 aria-hidden="true" size={15} />}<span role={pending ? "status" : undefined}>{pending ? "Deleting..." : deleteSeries && session.isRecurring ? "Delete series" : "Delete session"}</span></button>
          </div>
        </footer>
      </form>
    </ModalFrame>
  );
}
