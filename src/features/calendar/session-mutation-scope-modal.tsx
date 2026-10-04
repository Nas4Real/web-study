"use client";

import { Repeat2 } from "lucide-react";

import { ModalFrame } from "@/components/modal-frame";
import type { CalendarOccurrenceDetailDTO } from "@/domain/dto";

export type SessionMutationScope = "occurrence" | "series";

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

export function SessionMutationScopeModal({ onCancel, onContinue, onScopeChange, scope, session, timeZone }: {
  onCancel: () => void;
  onContinue: () => void;
  onScopeChange: (scope: SessionMutationScope) => void;
  scope: SessionMutationScope;
  session: CalendarOccurrenceDetailDTO;
  timeZone: string;
}) {
  return (
    <ModalFrame
      closeClass="right-5 top-4 size-10 border-[#52525b] bg-[#171719] text-zinc-400 hover:border-white"
      descriptionId="session-edit-scope-description"
      labelId="session-edit-scope-title"
      onClose={onCancel}
      overlayClass="bg-black/80 p-[9px] backdrop-blur-sm sm:p-4"
      panelClass="rounded-2xl border-[#303034] bg-[#111113] shadow-2xl"
      widthClass="max-w-[500px]"
    >
      <header className="flex items-start gap-3 border-b border-[#2a2a2e] px-4 py-5 pr-16 sm:px-6 sm:pr-20">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#303034] bg-[#1b1b1e] text-zinc-100"><Repeat2 aria-hidden="true" size={20} /></span>
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-zinc-400">Calendar</p>
          <h2 className="mt-1 text-[21px] font-bold tracking-tight text-white" id="session-edit-scope-title">Edit recurring session</h2>
          <p className="mt-1 text-[14px] text-zinc-300" id="session-edit-scope-description">Choose which sessions you want to change.</p>
        </div>
      </header>
      <form className="px-4 py-5 sm:px-6" onSubmit={(event) => { event.preventDefault(); onContinue(); }}>
        <div className="rounded-xl border border-[#2c2c30] bg-[#18181b] px-4 py-4">
          <p className="text-[14px] font-bold text-white">{session.title}</p>
          <p className="mt-1 font-mono text-[12px] text-zinc-400">{formatOccurrence(session, timeZone)}</p>
        </div>
        <fieldset className="mt-5 space-y-2">
          <legend className="mb-3 text-[14px] font-bold text-zinc-100">Apply to</legend>
          {([
            ["occurrence", "This session only", "Other sessions in this series stay unchanged."],
            ["series", "Entire series", "Change the series, not just this occurrence."],
          ] as const).map(([value, label, description]) => (
            <label className={`flex cursor-pointer gap-3 rounded-xl border px-4 py-4 transition-colors ${scope === value ? "border-zinc-400 bg-[#202023]" : "border-[#303034] bg-[#171719] hover:border-zinc-600"}`} key={value}>
              <input
                checked={scope === value}
                className="mt-0.5 size-4 accent-white"
                name="session-edit-scope"
                onChange={() => onScopeChange(value)}
                type="radio"
              />
              <span><span className="block text-[14px] font-bold text-white">{label}</span><span className="mt-1 block text-[12px] text-zinc-400">{description}</span></span>
            </label>
          ))}
        </fieldset>
        <footer className="-mx-4 -mb-5 mt-5 flex flex-col items-stretch gap-3 border-t border-[#2a2a2e] px-4 py-4 sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="text-[12px] font-medium text-zinc-400">No changes are saved yet.</span>
          <div className="flex justify-end gap-2">
            <button className="rounded-lg border border-[#343438] bg-[#171719] px-4 py-2.5 text-[14px] font-bold text-white hover:bg-[#222225]" onClick={onCancel} type="button">Cancel</button>
            <button className="rounded-lg bg-zinc-100 px-5 py-2.5 text-[14px] font-bold text-black hover:bg-white" id="session-edit-scope-continue" type="submit">→&nbsp; Continue</button>
          </div>
        </footer>
      </form>
    </ModalFrame>
  );
}
